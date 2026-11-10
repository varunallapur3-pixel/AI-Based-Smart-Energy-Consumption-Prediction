/**
 * VOLTIX Fleet Metric Calculation Utilities.
 * Computes fleet aggregates accurately from backend DeviceStatsResponse or fallback device lists.
 * Strictly adheres to backend statuses ('ONLINE', 'OFFLINE', 'UNKNOWN') and avoids claiming
 * fault detection when backend data only partitions by operational connectivity.
 */

import { DeviceStatsResponse } from './types';
import { DeviceNode } from '../../types/device';

export interface FleetMetrics {
  total: number;
  simulated: number;
  physical: number;
  online: number;
  offline: number;
  unknown: number;
  inactiveTotal: number; // offline + unknown
}

/**
 * Calculates fleet metrics from backend DeviceStatsResponse or fallback DeviceNode list.
 */
export function computeFleetMetrics(
  backendStats: DeviceStatsResponse | null,
  fallbackDevices: DeviceNode[] = []
): FleetMetrics {
  if (backendStats) {
    const total = backendStats.total ?? 0;
    const simulated = backendStats.by_type?.['SIMULATED'] ?? 0;
    const physical = backendStats.by_type?.['PHYSICAL'] ?? 0;
    const online = backendStats.by_status?.['ONLINE'] ?? 0;
    const offline = backendStats.by_status?.['OFFLINE'] ?? 0;
    const unknown = backendStats.by_status?.['UNKNOWN'] ?? 0;

    return {
      total,
      simulated,
      physical,
      online,
      offline,
      unknown,
      inactiveTotal: offline + unknown,
    };
  }

  // Fallback computation when backend stats are unavailable
  const total = fallbackDevices.length;
  const simulated = fallbackDevices.filter((d) => d.isSimulated).length;
  const physical = fallbackDevices.filter((d) => !d.isSimulated).length;
  const online = fallbackDevices.filter((d) => d.status === 'ONLINE' || d.status === 'STANDBY').length;
  const offline = fallbackDevices.filter((d) => d.status === 'OFFLINE' || d.status === 'FAULT').length;
  const unknown = fallbackDevices.filter((d) => d.status === 'UNKNOWN').length;

  return {
    total,
    simulated,
    physical,
    online,
    offline,
    unknown,
    inactiveTotal: offline + unknown,
  };
}
