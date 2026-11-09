/**
 * VOLTIX Simulated Telemetry Service
 * 
 * Generates high-fidelity physics-accurate electrical energy readings
 * for development, testing, algorithm evaluation, and UI simulation.
 * 
 * NOTE: Used while physical ESP32 hardware is disconnected.
 */

import {
  TelemetryReading,
  TelemetryPacket,
  OscilloscopeBufferPoint,
  SubPanelDistribution,
  DailyTrendPoint,
} from '../types/telemetry';
import { DeviceNode } from '../types/device';
import { calculateElectricalVectors, generateSensorNoise } from '../utils/math';

export const INITIAL_DEVICES: DeviceNode[] = [
  {
    id: 'VIRT_NODE_01',
    name: 'Main Incomer 3-Phase',
    mac: 'VIRT-MAC-01',
    ip: 'VIRT-BUS-101',
    hwModel: 'Virtual Node [PZEM-004T Emulated]',
    sensorInterface: 'PZEM-004T v3.0 UART (Synthetic)',
    sensorTypeKey: 'pzem',
    location: 'Main Dist. Panel A',
    subLocation: 'Substation Basement',
    phase: 'PH-A/B/C',
    status: 'STANDBY',
    isSimulated: true, // Physical hardware NOT connected yet
    powerWatts: 575.4,
    voltageV: 230.1,
    currentA: 2.502,
    powerFactor: 0.95,
    rssiDbm: -54,
    relayClosed: true,
    lastSeenSecAgo: 0.3,
    firmwareVersion: 'v2.1.4-sim',
  },
  {
    id: 'VIRT_NODE_02',
    name: 'Lab Server Circuit',
    mac: 'VIRT-MAC-02',
    ip: 'VIRT-BUS-102',
    hwModel: 'Virtual Node [ADS1115 CT Emulated]',
    sensorInterface: 'ADS1115 + 100A CT Clamp (Synthetic)',
    sensorTypeKey: 'ct-ads1115',
    location: 'Server Room Rack 04',
    subLocation: 'IT Facilities B2',
    phase: 'PH-B',
    status: 'STANDBY',
    isSimulated: true,
    powerWatts: 940.8,
    voltageV: 229.4,
    currentA: 4.10,
    powerFactor: 0.98,
    rssiDbm: -62,
    relayClosed: true,
    lastSeenSecAgo: 0.4,
    firmwareVersion: 'v2.1.4-sim',
  },
  {
    id: 'VIRT_NODE_03',
    name: 'HVAC Inverter Unit',
    mac: 'VIRT-MAC-03',
    ip: 'VIRT-BUS-103',
    hwModel: 'Virtual Node [Modbus RS485 Emulated]',
    sensorInterface: 'Modbus RTU RS-485 (Synthetic)',
    sensorTypeKey: 'modbus-rs485',
    location: 'Rooftop Plant Room',
    subLocation: 'Chiller Bay Roof N',
    phase: 'PH-C',
    status: 'STANDBY',
    isSimulated: true,
    powerWatts: 1220.5,
    voltageV: 232.0,
    currentA: 5.34,
    powerFactor: 0.94,
    rssiDbm: -78,
    relayClosed: true,
    lastSeenSecAgo: 0.8,
    firmwareVersion: 'v2.1.4-sim',
  },
  {
    id: 'VIRT_NODE_04',
    name: 'Solar Battery Tie',
    mac: 'VIRT-MAC-04',
    ip: 'VIRT-BUS-104',
    hwModel: 'Virtual Node [ADE7758 Emulated]',
    sensorInterface: 'Virtual ADE7758 SPI',
    sensorTypeKey: 'ade7758',
    location: 'BMS Energy Bay',
    subLocation: 'Solar Storage Enclosure',
    phase: 'STANDBY',
    status: 'STANDBY',
    isSimulated: true,
    powerWatts: 0.0,
    voltageV: 230.0,
    currentA: 0.0,
    powerFactor: 1.0,
    rssiDbm: -50,
    relayClosed: true,
    lastSeenSecAgo: 1.2,
    firmwareVersion: 'v2.1.4-sim',
  },
];

export const INITIAL_SUBPANEL_DISTRIBUTION: SubPanelDistribution[] = [
  { id: 'hvac', name: 'HVAC & Climate', watts: 1436, percentage: 42, color: '#4cd7f6', colorClass: 'text-primary bg-primary' },
  { id: 'lab', name: 'Precision Lab', watts: 957, percentage: 28, color: '#4edea3', colorClass: 'text-secondary bg-secondary' },
  { id: 'lighting', name: 'Lighting & Plugs', watts: 615, percentage: 18, color: '#ffb95f', colorClass: 'text-tertiary bg-tertiary' },
  { id: 'standby', name: 'Ancillary Standby', watts: 410, percentage: 12, color: '#869397', colorClass: 'text-outline bg-outline' },
];

export const INITIAL_DAILY_TRENDS: DailyTrendPoint[] = [
  { day: 'MON', label: 'Mon', offPeakKwh: 4.6, stdKwh: 6.8, peakKwh: 3.8, totalKwh: 15.2 },
  { day: 'TUE', label: 'Tue', offPeakKwh: 4.4, stdKwh: 7.1, peakKwh: 6.3, totalKwh: 17.8 },
  { day: 'WED', label: 'Wed', offPeakKwh: 4.6, stdKwh: 8.3, peakKwh: 5.5, totalKwh: 18.4 },
  { day: 'THU', label: 'Thu', offPeakKwh: 4.9, stdKwh: 6.4, peakKwh: 2.8, totalKwh: 14.1 },
  { day: 'FRI', label: 'Fri', offPeakKwh: 3.8, stdKwh: 7.6, peakKwh: 7.6, totalKwh: 19.0 },
  { day: 'SAT', label: 'Sat', offPeakKwh: 5.1, stdKwh: 4.6, peakKwh: 1.7, totalKwh: 11.4 },
  { day: 'SUN', label: 'Today (Sim)', offPeakKwh: 4.5, stdKwh: 7.4, peakKwh: 2.95, totalKwh: 14.85, isToday: true },
];

export function createInitialOscilloscopeBuffer(count: number = 60): OscilloscopeBufferPoint[] {
  const points: OscilloscopeBufferPoint[] = [];
  for (let i = 0; i < count; i++) {
    const timeOffset = -(count - 1 - i); // -59s to 0s
    const power = 575 + Math.sin(i / 4) * 25 + (Math.random() * 12 - 6);
    const voltage = 230 + Math.cos(i / 5) * 1.2 + (Math.random() * 0.4 - 0.2);
    points.push({ timeOffset, power: +power.toFixed(1), voltage: +voltage.toFixed(1) });
  }
  return points;
}

export function createInitialTelemetryPackets(): TelemetryPacket[] {
  const packets: TelemetryPacket[] = [];
  const baseTime = Date.now();
  for (let i = 0; i < 8; i++) {
    const timestamp = new Date(baseTime - i * 1000).toTimeString().split(' ')[0] + '.' + String(999 - i * 120).padStart(3, '0');
    packets.push({
      id: `pkt_sim_${Date.now()}_${i}`,
      timestamp,
      voltage: +(230.12 - (i % 3) * 0.08).toFixed(2),
      current: +(2.502 + (i % 2 === 0 ? 0.008 : -0.005)).toFixed(3),
      power: +(575.4 - (i % 4) * 0.9).toFixed(1),
      pf: 0.95,
      freq: +(50.01 + (i % 2) * 0.01).toFixed(2),
      status: 'VALID',
      source: 'SIMULATED',
    });
  }
  return packets;
}

export function generateNextReading(
  previous: TelemetryReading,
  isSimulation: boolean,
  isPaused: boolean
): TelemetryReading {
  if (isPaused) {
    return previous;
  }

  // Generate realistic sensor noise for simulated profile
  const noiseScale = isSimulation ? 35 : 12;
  const pNoise = generateSensorNoise(noiseScale);
  const vNoise = generateSensorNoise(0.5);
  const iNoise = generateSensorNoise(0.04);

  const voltage = +(230.1 + vNoise).toFixed(2);
  const current = +(2.502 + iNoise).toFixed(3);
  const pf = 0.95;

  const { apparent, active, reactive } = calculateElectricalVectors(voltage, current, pf);
  const power = +(active + pNoise).toFixed(1);
  const freq = +(50.0 + (Math.random() * 0.06 - 0.03)).toFixed(2);
  const energyDelta = power / (3600 * 1000); // W-seconds to kWh

  return {
    voltage,
    current,
    power: Math.max(0, power),
    apparentPower: apparent,
    reactivePower: reactive,
    powerFactor: pf,
    frequency: freq,
    energyToday: +(previous.energyToday + energyDelta).toFixed(4),
    totalRunKwh: +(previous.totalRunKwh + energyDelta).toFixed(4),
    temperatureC: +(34.2 + (Math.random() * 0.2 - 0.1)).toFixed(1),
    rssiDbm: Math.round(-54 + (Math.random() * 2 - 1)),
    lastUpdated: new Date().toISOString(),
    isSimulated: true, // Marked as simulated
  };
}
