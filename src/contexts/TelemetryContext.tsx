import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  TelemetryReading,
  TelemetryPacket,
  OscilloscopeBufferPoint,
  StreamMode,
  HardwareConnectionState,
  SubPanelDistribution,
  DailyTrendPoint,
} from '../types/telemetry';
import { DeviceNode, ProvisionFormInput, DiscoveredNode } from '../types/device';
import {
  INITIAL_DEVICES,
  INITIAL_SUBPANEL_DISTRIBUTION,
  INITIAL_DAILY_TRENDS,
  createInitialOscilloscopeBuffer,
  createInitialTelemetryPackets,
  generateNextReading,
} from '../services/mockTelemetryService';
import { hardwareTelemetryService } from '../services/hardwareTelemetryService';
import { useToast } from './ToastContext';

interface TelemetryContextType {
  // Device & Mode State
  devices: DeviceNode[];
  selectedDeviceId: string;
  selectedDevice: DeviceNode;
  streamMode: StreamMode; // Default: 'SIMULATION'
  hardwareState: HardwareConnectionState; // Default: 'DISCONNECTED'
  hardwareEndpoint: string;
  isStreaming: boolean;
  isOffline: boolean;
  isLoading: boolean;
  errorState: string | null;
  timeRange: 'today' | '7d' | '30d' | 'custom';
  
  // Real-time Readings & Buffers
  reading: TelemetryReading;
  oscilloscopeBuffer: OscilloscopeBufferPoint[];
  packets: TelemetryPacket[];
  subPanels: SubPanelDistribution[];
  dailyTrends: DailyTrendPoint[];
  heartbeatSecAgo: number;

  // Actions
  setStreamMode: (mode: StreamMode) => void;
  setSelectedDeviceId: (id: string) => void;
  syncBackendDevices: (backendNodes: DeviceNode[]) => void;
  toggleStreaming: () => void;
  clearBuffer: () => void;
  zeroCalibrate: (nodeId?: string) => Promise<void>;
  triggerRelayTripTest: () => void;
  registerDevice: (input: ProvisionFormInput) => void;
  deregisterDevice: (id: string) => void;
  rebootDevice: (id: string) => void;
  claimDiscoveredNode: (discovered: DiscoveredNode) => void;
  setTimeRange: (range: 'today' | '7d' | '30d' | 'custom') => void;
  
  // Hardware Connection Management
  connectHardware: (url?: string) => Promise<boolean>;
  disconnectHardware: () => void;
  simulateConnectionLost: () => void;

  // State simulation toggles (for testing UI states)
  setIsOffline: (val: boolean) => void;
  setIsLoading: (val: boolean) => void;
  setErrorState: (err: string | null) => void;
  toggleDeviceRelay: (id: string) => void;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [devices, setDevices] = useState<DeviceNode[]>(() => {
    try {
      const saved = localStorage.getItem('voltix_device_fleet');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial devices
    }
    return INITIAL_DEVICES;
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('VIRT_NODE_01');

  // Persist fleet changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voltix_device_fleet', JSON.stringify(devices));
    } catch {
      // Ignore write errors
    }
  }, [devices]);
  
  // RULE 1: Set Simulation Mode as default operating mode
  const [streamMode, setStreamModeState] = useState<StreamMode>('SIMULATION');
  
  // RULE 3 & 4: Proper hardware connection states (default: DISCONNECTED)
  const [hardwareState, setHardwareState] = useState<HardwareConnectionState>('DISCONNECTED');
  const [hardwareEndpoint, setHardwareEndpoint] = useState<string>('');
  
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'custom'>('today');

  const [oscilloscopeBuffer, setOscilloscopeBuffer] = useState<OscilloscopeBufferPoint[]>(
    createInitialOscilloscopeBuffer(60)
  );
  const [packets, setPackets] = useState<TelemetryPacket[]>(createInitialTelemetryPackets());
  const [subPanels] = useState<SubPanelDistribution[]>(INITIAL_SUBPANEL_DISTRIBUTION);
  const [dailyTrends] = useState<DailyTrendPoint[]>(INITIAL_DAILY_TRENDS);
  const [heartbeatSecAgo, setHeartbeatSecAgo] = useState<number>(1.0);

  // Active Device Lookup
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  // Base reading for selected device
  const [reading, setReading] = useState<TelemetryReading>({
    voltage: selectedDevice.voltageV,
    current: selectedDevice.currentA,
    power: selectedDevice.powerWatts,
    apparentPower: +(selectedDevice.voltageV * selectedDevice.currentA).toFixed(1),
    reactivePower: 189.2,
    powerFactor: selectedDevice.powerFactor,
    frequency: 50.02,
    energyToday: 14.852,
    totalRunKwh: 344.20,
    temperatureC: 34.2,
    rssiDbm: selectedDevice.rssiDbm,
    lastUpdated: new Date().toISOString(),
    isSimulated: true, // Marked as simulated
  });

  // Listen to hardware telemetry service state changes
  useEffect(() => {
    const unsub = hardwareTelemetryService.onConnectionChange((state, info) => {
      setHardwareState(state);
      if (info) {
        if (state === 'CONNECTED') {
          showToast(info, 'check_circle', 'success');
        } else if (state === 'CONNECTION_LOST') {
          showToast(info, 'wifi_off', 'error');
        } else if (state === 'DISCONNECTED') {
          // Normal state, only notify if user attempted action
        }
      }
    });
    return unsub;
  }, [showToast]);

  // When selected device changes, sync readings
  useEffect(() => {
    setReading((prev) => ({
      ...prev,
      voltage: selectedDevice.voltageV,
      current: selectedDevice.currentA,
      power: selectedDevice.powerWatts,
      powerFactor: selectedDevice.powerFactor,
      rssiDbm: selectedDevice.rssiDbm,
      isSimulated: hardwareState !== 'CONNECTED',
    }));
  }, [selectedDeviceId, selectedDevice, hardwareState]);

  // Main Telemetry Polling Loop (Realistic Simulated Readings)
  useEffect(() => {
    if (!isStreaming || isOffline) return;

    const interval = setInterval(() => {
      setHeartbeatSecAgo(+(Math.random() * 0.4 + 0.8).toFixed(1));

      setReading((prev) => {
        // If not connected to genuine hardware, always generate simulated reading
        const next = generateNextReading(prev, true, !isStreaming);

        // Schedule secondary state updates asynchronously outside the pure reducer
        setTimeout(() => {
          setOscilloscopeBuffer((prevBuf) => {
            const nextBuf = [...prevBuf.slice(1)];
            nextBuf.push({
              timeOffset: 0,
              power: next.power,
              voltage: next.voltage,
            });
            return nextBuf.map((pt, idx) => ({
              ...pt,
              timeOffset: -(nextBuf.length - 1 - idx),
            }));
          });

          // Update FIFO packet table
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
          
          setPackets((prevPackets) => {
            const newPacket: TelemetryPacket = {
              id: `pkt_sim_${Date.now()}`,
              timestamp: timeStr,
              voltage: next.voltage,
              current: next.current,
              power: next.power,
              pf: next.powerFactor,
              freq: next.frequency,
              status: next.power > 2000 ? 'WARNING' : 'VALID',
              source: hardwareState === 'CONNECTED' ? 'HARDWARE' : 'SIMULATED',
            };
            return [newPacket, ...prevPackets.slice(0, 7)];
          });

          // Update devices simulated live values
          setDevices((prevDevs) =>
            prevDevs.map((dev) =>
              dev.id === selectedDeviceId
                ? {
                    ...dev,
                    powerWatts: next.power,
                    voltageV: next.voltage,
                    currentA: next.current,
                    powerFactor: next.powerFactor,
                    lastSeenSecAgo: 0.2,
                  }
                : dev
            )
          );
        }, 0);

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isOffline, selectedDeviceId, hardwareState]);

  // Actions
  const setStreamMode = useCallback((mode: StreamMode) => {
    setStreamModeState(mode);
    if (mode === 'LIVE' && hardwareState !== 'CONNECTED') {
      showToast('Live mode requires physical ESP32 connection. Hardware is currently DISCONNECTED. Retaining simulation.', 'info', 'warning');
    }
  }, [hardwareState, showToast]);

  const connectHardware = useCallback(async (url?: string): Promise<boolean> => {
    const targetUrl = (url !== undefined ? url : hardwareEndpoint).trim();
    if (!targetUrl) {
      showToast('Please specify a WebSocket endpoint URL (e.g. ws://192.168.1.50:8080/pzem)', 'warning', 'warning');
      return false;
    }
    setHardwareEndpoint(targetUrl);
    setHardwareState('CONNECTING');
    showToast(`Attempting WebSocket handshake with ${targetUrl}...`, 'sync', 'info');

    const success = await hardwareTelemetryService.connect(targetUrl);
    if (success) {
      setHardwareState('CONNECTED');
      setStreamModeState('LIVE');
      showToast('Genuine physical ESP32 connected and verified!', 'verified', 'success');
      return true;
    } else {
      setHardwareState('DISCONNECTED');
      showToast('Physical ESP32 unreachable. Remaining in high-fidelity SIMULATION mode.', 'wifi_off', 'warning');
      return false;
    }
  }, [hardwareEndpoint, showToast]);

  const disconnectHardware = useCallback(() => {
    hardwareTelemetryService.disconnect();
    setHardwareState('DISCONNECTED');
    setStreamModeState('SIMULATION');
    showToast('Hardware link disconnected. Operating in SIMULATION mode.', 'link_off', 'info');
  }, [showToast]);

  const simulateConnectionLost = useCallback(() => {
    setHardwareState('CONNECTION_LOST');
    showToast('Simulated connection lost event triggered.', 'signal_cellular_connected_no_internet_0_bar', 'error');
  }, [showToast]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => {
      const next = !prev;
      showToast(next ? 'Simulated telemetry stream resumed' : 'Stream buffer paused', next ? 'play_arrow' : 'pause', 'info');
      return next;
    });
  }, [showToast]);

  const clearBuffer = useCallback(() => {
    setOscilloscopeBuffer((prev) =>
      prev.map((pt) => ({ ...pt, power: 575, voltage: 230 }))
    );
    showToast('Oscilloscope sample buffer cleared', 'delete_sweep', 'info');
  }, [showToast]);

  const zeroCalibrate = useCallback(async (nodeId = selectedDeviceId) => {
    if (hardwareState === 'CONNECTED') {
      hardwareTelemetryService.sendCommand('ZERO_CALIBRATE', nodeId);
      showToast(`Dispatched genuine zero-calibrate command to ${nodeId}`, 'tune', 'info');
    } else {
      showToast(`[SIMULATION] Simulated CT Zero-Offset calibration triggered for ${nodeId}...`, 'tune', 'info');
      await new Promise((res) => setTimeout(res, 1000));
      showToast(`[SIMULATION] Zero calibration complete. Virtual offset saved for ${nodeId}`, 'check_circle', 'success');
    }
  }, [selectedDeviceId, hardwareState, showToast]);

  const triggerRelayTripTest = useCallback(() => {
    if (hardwareState === 'CONNECTED') {
      hardwareTelemetryService.sendCommand('TRIP_RELAY', selectedDeviceId);
      showToast(`Dispatched physical relay trip command to ${selectedDeviceId}`, 'gavel', 'warning');
    } else {
      showToast('[SIMULATION] Virtual breaker trip test simulated. Virtual Opto-Relay GPIO 26 toggled.', 'gavel', 'warning');
    }
  }, [selectedDeviceId, hardwareState, showToast]);

  const registerDevice = useCallback((input: ProvisionFormInput) => {
    const nextIndex = devices.length + 1;
    const newId = input.hwId || `VIRT_NODE_0${nextIndex}`;
    const newDevice: DeviceNode = {
      id: newId,
      name: `${input.friendlyName} (Simulated)`,
      mac: `VIRT-MAC-${Math.floor(Math.random() * 8999 + 1000)}`,
      ip: `VIRT-BUS-${Math.floor(Math.random() * 899 + 100)}`,
      hwModel: `Virtual Node [${input.sensorType === 'pzem' ? 'PZEM Emulation' : 'ADS1115 CT Emulation'}]`,
      sensorInterface: input.sensorType === 'pzem' ? 'PZEM-004T v3.0 UART (Synthetic)' : 'CT Clamp + ADS1115 (Synthetic)',
      sensorTypeKey: input.sensorType,
      location: input.location || 'Virtual Facility Bay',
      subLocation: 'Auxiliary Simulated Bus',
      phase: (input.phase as any) || 'PH-A',
      status: 'STANDBY',
      isSimulated: true, // Always virtual/simulated until genuine physical connection
      powerWatts: 420.0,
      voltageV: 230.1,
      currentA: 1.82,
      powerFactor: 0.96,
      rssiDbm: -56,
      relayClosed: true,
      lastSeenSecAgo: 0.1,
      firmwareVersion: 'v2.1.4-sim',
    };

    setDevices((prev) => [...prev, newDevice]);
    showToast(`Virtual Node ${newId} registered in simulation fleet!`, 'verified', 'success');
  }, [devices.length, showToast]);

  const syncBackendDevices = useCallback((backendNodes: DeviceNode[]) => {
    setDevices((prevFleet) => {
      if (!backendNodes || backendNodes.length === 0) {
        return prevFleet;
      }
      const merged = backendNodes.map((bNode) => {
        const existing = prevFleet.find((p) => p.id === bNode.id);
        if (existing) {
          return {
            ...bNode,
            powerWatts: existing.powerWatts || bNode.powerWatts,
            voltageV: existing.voltageV || bNode.voltageV,
            currentA: existing.currentA || bNode.currentA,
            powerFactor: existing.powerFactor || bNode.powerFactor,
            phase: existing.phase || bNode.phase,
            subLocation: existing.subLocation || bNode.subLocation,
            rssiDbm: existing.rssiDbm || bNode.rssiDbm,
            relayClosed: existing.relayClosed ?? bNode.relayClosed,
            sensorTypeKey: existing.sensorTypeKey || bNode.sensorTypeKey,
          };
        }
        return bNode;
      });

      if (!merged.some((d) => d.id === selectedDeviceId) && merged.length > 0) {
        setSelectedDeviceId(merged[0].id);
      }
      return merged;
    });
  }, [selectedDeviceId]);

  const deregisterDevice = useCallback((id: string) => {
    setDevices((prev) => {
      const remaining = prev.filter((d) => d.id !== id);
      if (selectedDeviceId === id && remaining.length > 0) {
        setSelectedDeviceId(remaining[0].id);
      }
      return remaining;
    });
    showToast(`Virtual Node ${id} removed from simulation fleet`, 'delete', 'warning');
  }, [selectedDeviceId, showToast]);

  const rebootDevice = useCallback((id: string) => {
    if (hardwareState === 'CONNECTED') {
      hardwareTelemetryService.sendCommand('REBOOT', id);
      showToast(`Reboot command sent to physical ESP32 node ${id}`, 'restart_alt', 'info');
    } else {
      showToast(`[SIMULATION] Simulated remote reboot command executed for ${id}`, 'restart_alt', 'info');
    }
  }, [hardwareState, showToast]);

  const claimDiscoveredNode = useCallback((discovered: DiscoveredNode) => {
    const nextIndex = devices.length + 1;
    const newId = `VIRT_NODE_0${nextIndex}`;
    const claimedDevice: DeviceNode = {
      id: newId,
      name: `${discovered.model} [Simulated]`,
      mac: discovered.mac,
      ip: discovered.ip,
      hwModel: `${discovered.model} (Emulated)`,
      sensorInterface: 'ADS1115 + 100A CT Clamp (Synthetic)',
      sensorTypeKey: discovered.sensorType,
      location: 'Virtual Test Bay 02',
      subLocation: 'Simulated Feeder B',
      phase: 'PH-B',
      status: 'STANDBY',
      isSimulated: true,
      powerWatts: 380.0,
      voltageV: 230.0,
      currentA: 1.65,
      powerFactor: 0.97,
      rssiDbm: discovered.rssiDbm,
      relayClosed: true,
      lastSeenSecAgo: 0.2,
      firmwareVersion: 'v2.1.4-sim',
    };

    setDevices((prev) => [...prev, claimedDevice]);
    showToast(`Added Virtual Node ${newId} (${discovered.model}) to simulation fleet!`, 'add_circle', 'success');
  }, [devices.length, showToast]);

  const toggleDeviceRelay = useCallback((id: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextRelay = !d.relayClosed;
          showToast(
            `Virtual Relay for ${id} ${nextRelay ? 'CLOSED (Simulated Load On)' : 'OPEN (Simulated Load Tripped)'}`,
            'power_settings_new',
            nextRelay ? 'success' : 'warning'
          );
          return { ...d, relayClosed: nextRelay };
        }
        return d;
      })
    );
  }, [showToast]);

  return (
    <TelemetryContext.Provider
      value={{
        devices,
        selectedDeviceId,
        selectedDevice,
        streamMode,
        hardwareState,
        hardwareEndpoint,
        isStreaming,
        isOffline,
        isLoading,
        errorState,
        timeRange,
        reading,
        oscilloscopeBuffer,
        packets,
        subPanels,
        dailyTrends,
        heartbeatSecAgo,
        setStreamMode,
        setSelectedDeviceId,
        syncBackendDevices,
        toggleStreaming,
        clearBuffer,
        zeroCalibrate,
        triggerRelayTripTest,
        registerDevice,
        deregisterDevice,
        rebootDevice,
        claimDiscoveredNode,
        setTimeRange,
        connectHardware,
        disconnectHardware,
        simulateConnectionLost,
        setIsOffline,
        setIsLoading,
        setErrorState,
        toggleDeviceRelay,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
