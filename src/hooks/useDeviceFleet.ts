import { useTelemetry } from '../contexts/TelemetryContext';

export function useDeviceFleet() {
  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    setSelectedDeviceId,
    registerDevice,
    deregisterDevice,
    rebootDevice,
    claimDiscoveredNode,
    toggleDeviceRelay,
  } = useTelemetry();

  const totalCount = devices.length;
  const activeCount = devices.filter((d) => d.status === 'ONLINE' && !d.isSimulated).length;
  const standbyCount = devices.filter((d) => d.status === 'STANDBY' || d.isSimulated).length;
  const faultCount = devices.filter((d) => d.status === 'FAULT').length;

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    setSelectedDeviceId,
    registerDevice,
    deregisterDevice,
    rebootDevice,
    claimDiscoveredNode,
    toggleDeviceRelay,
    stats: {
      totalCount,
      activeCount,
      standbyCount,
      faultCount,
    },
  };
}
