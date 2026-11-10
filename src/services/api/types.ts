/**
 * VOLTIX Backend Data Transfer Objects (DTOs).
 * Strictly mirrors the backend Pydantic schemas defined in:
 * - backend/app/schemas/device.py
 * - backend/app/schemas/telemetry.py
 * - backend/app/schemas/ai.py
 * - backend/app/schemas/health.py
 */

// ==============================================================================
// 1. Device DTOs
// ==============================================================================

export type BackendDeviceType = 'SIMULATED' | 'PHYSICAL';
export type BackendDeviceStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface DeviceCreate {
  device_id: string;
  name: string;
  device_type?: BackendDeviceType;
  location: string;
  status?: BackendDeviceStatus;
  firmware_version?: string | null;
  last_seen?: string | null;
}

export interface DeviceUpdate {
  name?: string | null;
  device_type?: BackendDeviceType | null;
  location?: string | null;
  status?: BackendDeviceStatus | null;
  firmware_version?: string | null;
  last_seen?: string | null;
}

export interface DeviceResponse {
  id: number;
  device_id: string;
  name: string;
  device_type: BackendDeviceType;
  location: string;
  status: BackendDeviceStatus;
  firmware_version: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceStatsResponse {
  total: number;
  by_type: Record<string, number>; // e.g. { "SIMULATED": 8, "PHYSICAL": 2 }
  by_status: Record<string, number>; // e.g. { "ONLINE": 5, "OFFLINE": 3, "UNKNOWN": 2 }
}

export interface DeviceDeleteResponse {
  message: string;
  device_id: string;
}

// ==============================================================================
// 2. Telemetry & Energy DTOs
// ==============================================================================

export type BackendSourceType = 'SIMULATED' | 'PHYSICAL';

export interface TelemetryCreate {
  device_id: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  power_factor?: number | null;
  frequency_hz?: number | null;
  energy_kwh?: number | null;
  source_type?: BackendSourceType | null;
  timestamp?: string | null;
}

export interface TelemetryResponse {
  id: number;
  device_id: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  power_factor: number | null;
  frequency_hz: number | null;
  energy_kwh: number | null;
  source_type: BackendSourceType;
  timestamp: string;
}

export interface EnergyCalculationResponse {
  device_id: string;
  total_energy_kwh: number;
  samples_count: number;
  valid_intervals_count: number;
  skipped_intervals_count: number;
  start_time: string | null;
  end_time: string | null;
  calculation_method: string;
  disclaimer: string;
}

export interface SimulationRequest {
  count?: number;
  interval_seconds?: number;
}

export interface SimulationResponse {
  message: string;
  device_id: string;
  generated_count: number;
  readings: TelemetryResponse[];
}

// ==============================================================================
// 3. AI Intelligence Engine DTOs
// ==============================================================================

export interface ForecastStep {
  step: number;
  timestamp: string;
  predicted_power_w: number;
}

export interface ForecastMetrics {
  mae: number;
  rmse: number;
  r2: number | null;
  baseline_mae: number;
  model_name: string;
  version: string;
}

export interface AnomalyMetrics {
  samples_analyzed: number;
  anomaly_count: number;
  anomaly_percentage: number;
  model_name: string;
  version: string;
}

export interface TrainResponse {
  device_id: string;
  status: string;
  training_timestamp: string;
  samples_count: number;
  forecasting_metrics: ForecastMetrics;
  anomaly_metrics: AnomalyMetrics;
  is_experimental: boolean;
  disclaimer: string;
}

export interface ForecastResponse {
  device_id: string;
  model_name: string;
  model_version: string;
  horizon_steps: number;
  sampling_interval_seconds: number;
  forecast: ForecastStep[];
  is_experimental: boolean;
  disclaimer: string;
}

export interface AnomalyItem {
  id: number;
  device_id: string;
  timestamp: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  power_factor: number | null;
  frequency_hz: number | null;
  anomaly_score: number;
  is_anomaly: boolean;
  contributing_factors: string[];
  disclaimer: string;
}

export interface AnomalyResponse {
  device_id: string;
  total_evaluated: number;
  anomaly_count: number;
  anomalies: AnomalyItem[];
  is_experimental: boolean;
  disclaimer: string;
}

export interface ModelStatusResponse {
  device_id: string;
  forecast_model_status: 'ready' | 'not_trained' | string;
  anomaly_model_status: 'ready' | 'not_trained' | string;
  forecast_model_version: string | null;
  anomaly_model_version: string | null;
  last_trained: string | null;
  training_sample_count: number | null;
  evaluation_metrics: {
    forecasting?: ForecastMetrics | null;
    anomaly?: AnomalyMetrics | null;
  } | null;
  is_experimental: boolean;
  disclaimer: string;
}

// ==============================================================================
// 4. Health & System DTOs
// ==============================================================================

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | string;
  application_name: string;
  backend_version: string;
  database_connectivity: 'connected' | 'disconnected' | string;
  database_status: string;
  database_latency_ms: number | null;
  environment: string;
}

// ==============================================================================
// 5. Error & Common DTOs
// ==============================================================================

export interface ApiValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiErrorResponse {
  detail: string | ApiValidationErrorItem[];
}
