/**
 * VOLTIX Data Mappers.
 * Pure transformation functions between backend DTOs and frontend domain entities.
 * Enforces strict typing, null/undefined safety, unit transformations,
 * and preserves hardware-specific metadata.
 */

import {
  DeviceResponse,
  BackendDeviceStatus,
  TelemetryResponse,
  AnomalyItem,
  ForecastResponse,
  ForecastStep,
} from './types';
import { DeviceNode, DeviceStatus, SensorInterfaceType } from '../../types/device';
import { TelemetryReading, TelemetryPacket } from '../../types/telemetry';
import { AnomalyIncident, ForecastPoint, IncidentSeverity } from '../../types/ai';

// ==============================================================================
// 1. Device Mappers
// ==============================================================================

/**
 * Maps backend device status ('ONLINE' | 'OFFLINE' | 'UNKNOWN')
 * to frontend device status ('ONLINE' | 'OFFLINE' | 'UNKNOWN' | 'STANDBY' | 'FAULT').
 * Preserves backend UNKNOWN without silently misrepresenting it as STANDBY.
 */
export function mapBackendDeviceStatus(status: BackendDeviceStatus): DeviceStatus {
  switch (status) {
    case 'ONLINE':
      return 'ONLINE';
    case 'OFFLINE':
      return 'OFFLINE';
    case 'UNKNOWN':
    default:
      return 'UNKNOWN';
  }
}

/**
 * Maps frontend device status to backend status ('ONLINE' | 'OFFLINE' | 'UNKNOWN').
 *
 * Backend Schema Limitation & Explicit Fallback Documentation:
 * - Backend SQL constraint: check_device_status IN ('ONLINE', 'OFFLINE', 'UNKNOWN')
 * - Backend schema does NOT define separate 'STANDBY' or 'FAULT' states.
 * - 'ONLINE'   -> 'ONLINE'
 * - 'OFFLINE'  -> 'OFFLINE'
 * - 'UNKNOWN'  -> 'UNKNOWN'
 * - 'STANDBY': A device in standby is energized, communicating, and waiting for load.
 *              Fallback maps to 'ONLINE' (operational) rather than misleading 'OFFLINE'.
 * - 'FAULT':   A device in fault is de-energized / breaker-tripped and non-operational.
 *              Fallback maps to 'OFFLINE' (non-operational) rather than misleading 'UNKNOWN',
 *              because the fault condition is known and verified, never indeterminate.
 */
export function mapFrontendDeviceStatus(status: DeviceStatus): BackendDeviceStatus {
  switch (status) {
    case 'ONLINE':
      return 'ONLINE';
    case 'OFFLINE':
      return 'OFFLINE';
    case 'UNKNOWN':
      return 'UNKNOWN';
    case 'STANDBY':
      // Fallback: energized and communicating; maps to operational ONLINE
      return 'ONLINE';
    case 'FAULT':
    default:
      // Fallback: de-energized / tripped; maps to non-operational OFFLINE (never UNKNOWN)
      return 'OFFLINE';
  }
}

/**
 * Transforms a backend DeviceResponse into a frontend DeviceNode.
 * Allows passing an optional latest telemetry reading and hardware metadata overrides.
 */
export function mapBackendDeviceToNode(
  dto: DeviceResponse,
  latestTelemetry?: TelemetryResponse | null,
  hardwareOverrides?: Partial<DeviceNode>
): DeviceNode {
  const isSimulated = dto.device_type === 'SIMULATED';
  const status = mapBackendDeviceStatus(dto.status);

  // Compute seconds elapsed since last_seen or telemetry timestamp
  let lastSeenSecAgo = 0;
  const tsStr = latestTelemetry?.timestamp || dto.last_seen || dto.updated_at;
  if (tsStr) {
    const diffMs = Math.max(0, Date.now() - new Date(tsStr).getTime());
    lastSeenSecAgo = +(diffMs / 1000).toFixed(1);
  }

  // Derive sensor type key from hardware metadata or fallback
  const sensorTypeKey: SensorInterfaceType =
    hardwareOverrides?.sensorTypeKey || 'pzem';

  return {
    id: dto.device_id,
    name: dto.name,
    mac: hardwareOverrides?.mac || `VIRT-MAC-${dto.id.toString().padStart(4, '0')}`,
    ip: hardwareOverrides?.ip || (isSimulated ? `VIRT-BUS-${dto.id}` : undefined),
    hwModel:
      hardwareOverrides?.hwModel ||
      (isSimulated
        ? `Virtual Node [${dto.name}]`
        : 'VOLTIX IoT Hardware Gateway'),
    sensorInterface:
      hardwareOverrides?.sensorInterface ||
      (isSimulated
        ? 'Synthetic Emulated Bus'
        : 'PZEM-004T v3.0 UART'),
    sensorTypeKey,
    location: dto.location,
    subLocation: hardwareOverrides?.subLocation || 'Primary Enclosure',
    phase: hardwareOverrides?.phase || 'PH-A',
    status,
    isSimulated,
    powerWatts: latestTelemetry?.power_w ?? 0.0,
    voltageV: latestTelemetry?.voltage_v ?? 0.0,
    currentA: latestTelemetry?.current_a ?? 0.0,
    powerFactor: latestTelemetry?.power_factor ?? 1.0,
    rssiDbm: hardwareOverrides?.rssiDbm ?? (isSimulated ? -52 : -70),
    relayClosed: hardwareOverrides?.relayClosed ?? true,
    lastSeenSecAgo,
    firmwareVersion: dto.firmware_version || 'v2.1.4_STABLE',
  };
}

// ==============================================================================
// 2. Telemetry Mappers
// ==============================================================================

/**
 * Transforms a backend TelemetryResponse into a frontend TelemetryReading.
 * Computes apparent and reactive power vector components.
 */
export function mapBackendTelemetryToReading(
  dto: TelemetryResponse,
  previousReading?: Partial<TelemetryReading>
): TelemetryReading {
  const v = Math.max(0, dto.voltage_v ?? 0.0);
  const i = Math.max(0, dto.current_a ?? 0.0);
  const p = Math.max(0, dto.power_w ?? 0.0);
  const pf = dto.power_factor !== null && dto.power_factor !== undefined
    ? Math.min(1.0, Math.max(0.0, dto.power_factor))
    : 1.0;
  const freq = dto.frequency_hz !== null && dto.frequency_hz !== undefined
    ? dto.frequency_hz
    : 50.0;

  // Apparent Power S = V * I (VA)
  const apparentPower = +(v * i).toFixed(1);

  // Reactive Power Q = sqrt(max(0, S^2 - P^2)) (VAR)
  const reactivePower = +(Math.sqrt(Math.max(0, apparentPower * apparentPower - p * p))).toFixed(1);

  // Energy today: use backend energy_kwh if present, else accumulate or use previous
  const energyKwh = dto.energy_kwh !== null && dto.energy_kwh !== undefined
    ? +dto.energy_kwh.toFixed(4)
    : previousReading?.energyToday ?? 0.0;

  const totalRunKwh = previousReading?.totalRunKwh !== undefined
    ? previousReading.totalRunKwh
    : energyKwh;

  return {
    voltage: +v.toFixed(2),
    current: +i.toFixed(3),
    power: +p.toFixed(1),
    apparentPower,
    reactivePower,
    powerFactor: +pf.toFixed(3),
    frequency: +freq.toFixed(2),
    energyToday: energyKwh,
    totalRunKwh,
    temperatureC: previousReading?.temperatureC ?? 34.0,
    rssiDbm: previousReading?.rssiDbm ?? -54,
    lastUpdated: dto.timestamp ? new Date(dto.timestamp).toISOString() : new Date().toISOString(),
    isSimulated: dto.source_type === 'SIMULATED',
  };
}

/**
 * Transforms a backend TelemetryResponse into a frontend TelemetryPacket table row.
 */
export function mapBackendTelemetryToPacket(dto: TelemetryResponse): TelemetryPacket {
  const dateObj = new Date(dto.timestamp);
  const timeFormatted = !isNaN(dateObj.getTime())
    ? dateObj.toTimeString().split(' ')[0] + '.' + String(dateObj.getMilliseconds()).padStart(3, '0')
    : dto.timestamp;

  return {
    id: `pkt_${dto.id}_${dto.device_id}`,
    timestamp: timeFormatted,
    voltage: +dto.voltage_v.toFixed(2),
    current: +dto.current_a.toFixed(3),
    power: +dto.power_w.toFixed(1),
    pf: +(dto.power_factor ?? 1.0).toFixed(3),
    freq: +(dto.frequency_hz ?? 50.0).toFixed(2),
    status: 'VALID',
    source: dto.source_type === 'SIMULATED' ? 'SIMULATED' : 'HARDWARE',
  };
}

// ==============================================================================
// 3. Anomaly & Incident Mappers
// ==============================================================================

/**
 * Transforms a backend AnomalyItem into a frontend AnomalyIncident.
 */
export function mapBackendAnomalyToIncident(item: AnomalyItem): AnomalyIncident {
  // Determine severity from normalized score
  let severity: IncidentSeverity = 'info';
  let badgeLabel = 'STATISTICAL ANOMALY';
  let actionButtonType: 'error' | 'warning' | 'primary' | 'ghost' = 'ghost';

  if (item.anomaly_score >= 0.8) {
    severity = 'critical';
    badgeLabel = 'CRITICAL OUTLIER';
    actionButtonType = 'error';
  } else if (item.anomaly_score >= 0.5) {
    severity = 'warning';
    badgeLabel = 'OUTLIER WARNING';
    actionButtonType = 'warning';
  }

  // Format timestamp for display (e.g. "02:45 AM")
  const dateObj = new Date(item.timestamp);
  const timeStr = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : item.timestamp;

  // Title from primary contributing factor or fallback
  const title = item.contributing_factors.length > 0
    ? `Anomaly: ${item.contributing_factors[0]}`
    : `Statistical Pattern Deviation (Score ${item.anomaly_score})`;

  const description = item.contributing_factors.length > 0
    ? `Measurement deviation: ${item.contributing_factors.join('; ')}. ${item.disclaimer}`
    : item.disclaimer;

  return {
    id: `anom_${item.id}_${item.device_id}`,
    severity,
    badgeLabel,
    title,
    circuitTag: `${item.device_id} (Telemetry Feed)`,
    timestamp: timeStr,
    description,
    measuredWatts: +item.power_w.toFixed(1),
    powerFactor: item.power_factor !== null ? +item.power_factor.toFixed(2) : undefined,
    autoActionText: item.disclaimer,
    actionButtonLabel: 'ACKNOWLEDGE',
    actionButtonType,
    acknowledged: false,
  };
}

// ==============================================================================
// 4. AI Forecasting Mappers
// ==============================================================================

/**
 * Transforms a backend ForecastResponse into an array of frontend ForecastPoints.
 * Converts active power (Watts) over the interval into estimated energy (kWh).
 *
 * NOTE: The backend RandomForest model produces point predictions.
 * To avoid inventing false statistical confidence, upper and lower bounds
 * equal the point estimate by default, unless an explicit uncertainty ratio is provided.
 */
export function mapBackendForecastToPoints(
  dto: ForecastResponse,
  uncertaintyRatio: number = 0.0
): ForecastPoint[] {
  const dtSec = dto.sampling_interval_seconds || 5.0;

  return dto.forecast.map((step: ForecastStep) => {
    const dateObj = new Date(step.timestamp);
    const timeLabel = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : `Step ${step.step}`;

    // Estimated energy over this interval: kWh = P(W) * dt(s) / (3,600 * 1,000)
    const predictedKwh = +((step.predicted_power_w * dtSec) / (3600.0 * 1000.0)).toFixed(4);

    // If uncertainty ratio is specified (e.g. 0.05 for ±5%), compute explicit visual envelope
    const upperConfidence = uncertaintyRatio > 0
      ? +(predictedKwh * (1.0 + uncertaintyRatio)).toFixed(4)
      : predictedKwh;
    const lowerConfidence = uncertaintyRatio > 0
      ? +(predictedKwh * Math.max(0, 1.0 - uncertaintyRatio)).toFixed(4)
      : predictedKwh;

    // Check if hour lies in peak tariff band (18:00 - 22:00 UTC)
    const hour = !isNaN(dateObj.getTime()) ? dateObj.getUTCHours() : -1;
    const isTariffPeak = hour >= 18 && hour < 22;

    return {
      timeLabel,
      predictedKwh,
      upperConfidence,
      lowerConfidence,
      isTariffPeak,
    };
  });
}
