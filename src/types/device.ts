export type DeviceStatus = 'ONLINE' | 'STANDBY' | 'FAULT' | 'OFFLINE';

export type SensorInterfaceType = 'pzem' | 'ct-ads1115' | 'modbus-rs485' | 'ade7758';

export interface DeviceNode {
  id: string;                    // e.g. "ESP32_01"
  name: string;                  // e.g. "Main Incomer 3-Phase"
  mac: string;                   // e.g. "A4:CF:12:88:51:02"
  ip?: string;                   // e.g. "192.168.1.142"
  hwModel: string;               // e.g. "ESP32-WROOM-32D"
  sensorInterface: string;       // e.g. "PZEM-004T v3.0 UART"
  sensorTypeKey: SensorInterfaceType;
  location: string;              // e.g. "Main Dist. Panel A"
  subLocation: string;           // e.g. "Substation Basement"
  phase: 'PH-A' | 'PH-B' | 'PH-C' | 'PH-A/B/C' | 'PH-3P' | 'PH-1P' | 'STANDBY';
  status: DeviceStatus;
  isSimulated: boolean;
  powerWatts: number;
  voltageV: number;
  currentA: number;
  powerFactor: number;
  rssiDbm: number;
  relayClosed: boolean;          // true = CLOSED (ON), false = OPEN (TRIPPED/OFF)
  lastSeenSecAgo: number;
  firmwareVersion: string;
}

export interface ProvisionFormInput {
  friendlyName: string;
  hwId: string;
  sensorType: SensorInterfaceType;
  phase: string;
  location: string;
  securityToken: string;
  heartbeatSec: number;
  fallbackToDemo: boolean;
}

export interface DiscoveredNode {
  mac: string;
  ip: string;
  model: string;
  sensorType: SensorInterfaceType;
  rssiDbm: number;
  hostType: string;
}
