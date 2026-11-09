export type PowerState = 'NOMINAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export type StreamMode = 'SIMULATION' | 'LIVE';

export type HardwareConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'CONNECTION_LOST';

export interface TelemetryReading {
  voltage: number;       // V RMS (e.g. 230.1 V)
  current: number;       // A RMS (e.g. 2.502 A)
  power: number;         // Active Power P in Watts (e.g. 575.4 W)
  apparentPower: number; // S in VA (e.g. 605.6 VA)
  reactivePower: number; // Q in VAR (e.g. 189.2 VAR)
  powerFactor: number;   // cos phi (e.g. 0.95 lag)
  frequency: number;     // Hz (e.g. 50.02 Hz)
  energyToday: number;   // kWh accumulated today (e.g. 14.852 kWh)
  totalRunKwh: number;   // Accumulated lifetime MTD (e.g. 344.20 kWh)
  temperatureC: number;  // Microcontroller / Sensor CT temp (e.g. 34.2 °C)
  rssiDbm: number;       // Wi-Fi RF RSSI (e.g. -54 dBm)
  lastUpdated: string;   // ISO string or timestamp
  isSimulated: boolean;  // Explicit flag ensuring simulated vs physical is distinguished
}

export interface TelemetryPacket {
  id: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  pf: number;
  freq: number;
  status: 'VALID' | 'WARNING' | 'INVALID';
  source: 'SIMULATED' | 'HARDWARE';
}

export interface OscilloscopeBufferPoint {
  timeOffset: number; // in seconds relative to current time (-60s to 0s)
  power: number;
  voltage: number;
}

export interface SubPanelDistribution {
  id: string;
  name: string;
  watts: number;
  percentage: number;
  color: string;
  colorClass: string;
}

export interface DailyTrendPoint {
  day: string;
  label: string;
  offPeakKwh: number;
  stdKwh: number;
  peakKwh: number;
  totalKwh: number;
  isToday?: boolean;
}

// ==========================================
// MQTT & WebSocket Real ESP32 Hardware Types
// ==========================================

export interface ESP32HardwareInfo {
  chipModel: string;        // e.g. "ESP32-D0WD-V3" / "ESP32-S3"
  macAddress: string;       // e.g. "24:6F:28:B1:09:A4"
  ipAddress: string;        // e.g. "192.168.1.101"
  firmwareVersion: string;  // e.g. "v2.1.4_STABLE"
  freeHeapBytes: number;    // e.g. 184320
  sensorModel: string;      // e.g. "PZEM-004T-v3.0" | "ADS1115_CT"
}

export interface ESP32MqttTelemetryPayload {
  node_id: string;
  timestamp: number;
  sequence_id: number;
  v_rms: number;
  i_rms: number;
  p_active: number;
  p_apparent?: number;
  p_reactive?: number;
  pf: number;
  frequency: number;
  energy_kwh: number;
  temp_c: number;
  wifi_rssi: number;
  relay_state: boolean;
  hmac_signature?: string;
}

export interface ESP32WsFrame {
  type: 'telemetry' | 'heartbeat' | 'handshake' | 'status' | 'command_ack';
  nodeId: string;
  payload: ESP32MqttTelemetryPayload | Record<string, unknown>;
}

export interface ESP32CommandPayload {
  nodeId: string;
  command: 'ZERO_CALIBRATE' | 'TRIP_RELAY' | 'CLOSE_RELAY' | 'REBOOT' | 'SET_REPORT_RATE';
  parameters?: Record<string, unknown>;
  issuedAt: string;
}
