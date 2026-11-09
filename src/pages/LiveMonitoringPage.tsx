import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';
import { Oscilloscope } from '../components/telemetry/Oscilloscope';
import { TelemetryTable } from '../components/telemetry/TelemetryTable';
import { Modal } from '../components/common/Modal';

export const LiveMonitoringPage: React.FC = () => {
  const {
    devices,
    selectedDeviceId,
    selectedDevice,
    setSelectedDeviceId,
    hardwareState,
    connectHardware,
    disconnectHardware,
    reading,
    heartbeatSecAgo,
    zeroCalibrate,
    triggerRelayTripTest,
    oscilloscopeBuffer,
  } = useTelemetry();

  const { showToast } = useToast();
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const isConnected = hardwareState === 'CONNECTED';

  const handleZeroCalibrate = async () => {
    setCalibrating(true);
    await zeroCalibrate(selectedDevice.id);
    setCalibrating(false);
  };

  const handleToggleHardwareLink = async () => {
    if (isConnected) {
      disconnectHardware();
    } else {
      await connectHardware();
    }
  };

  const handleExportJson = () => {
    const payload = {
      node_id: selectedDevice.id,
      device_type: selectedDevice.sensorInterface,
      mac: selectedDevice.mac,
      timestamp: new Date().toISOString(),
      data_source: isConnected ? 'GENUINE_HARDWARE' : 'SYNTHETIC_SIMULATION',
      hardware_status: hardwareState,
      telemetry: reading,
      buffer_history: {
        power_watts: oscilloscopeBuffer.map((b) => b.power),
        voltage_rms: oscilloscopeBuffer.map((b) => b.voltage),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDevice.id}_sim_telemetry_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${selectedDevice.id} simulated telemetry JSON`, 'download', 'success');
  };

  const rawJsonPayload = JSON.stringify(
    {
      node_id: selectedDevice.id,
      mac: selectedDevice.mac,
      timestamp: new Date().toISOString(),
      data_source: isConnected ? 'GENUINE_HARDWARE' : 'SYNTHETIC_SIMULATION',
      hardware_connected: isConnected,
      hardware_state: hardwareState,
      hardware_spec: {
        target_model: selectedDevice.hwModel,
        interface: 'UART_TTL_MODBUS',
        baud: 9600,
        temperature_c: reading.temperatureC,
        rssi_dbm: selectedDevice.rssiDbm,
      },
      telemetry: {
        voltage_rms_v: reading.voltage,
        current_rms_a: reading.current,
        active_power_w: reading.power,
        apparent_power_va: reading.apparentPower,
        reactive_power_var: reading.reactivePower,
        power_factor: reading.powerFactor,
        frequency_hz: reading.frequency,
        energy_accum_kwh: reading.energyToday,
      },
      diagnostics: {
        watchdog_resets: 0,
        crc_error_count: 0,
        alarm_overvoltage: reading.voltage > 250,
        alarm_overcurrent: reading.current > 16,
        status: isConnected ? 'GENUINE_ONLINE' : 'SIMULATION_ACTIVE',
      },
    },
    null,
    2
  );

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(rawJsonPayload);
    setCopiedPayload(true);
    showToast('Simulated telemetry payload copied to clipboard', 'content_copy', 'info');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="px-space-md lg:px-margin-desktop py-space-md flex flex-col gap-space-lg max-w-[1720px] mx-auto w-full">
      {/* Top Breadcrumb & Status Ribbon */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md bg-surface-container/60 backdrop-blur-xl p-space-md rounded-xl shadow-sm border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm sm:gap-space-md">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-tertiary/15 text-tertiary border border-tertiary/20">
              <span className="material-symbols-outlined text-xl">tune</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-mono">
                  Telemetry Channel
                </span>
                <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-mono flex items-center gap-1 border border-tertiary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  SIMULATED
                </span>
              </div>
              <div className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                {selectedDevice.id} Incomer Telemetry Matrix (Simulated)
              </div>
            </div>
          </div>
        </div>

        {/* Device Switcher & Live Polling Control Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-space-sm w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[260px]">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-surface-container-high text-on-surface font-label-md text-label-md rounded px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-primary font-mono border border-white/5"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} ({d.name} - Emulated)
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-sm pointer-events-none text-outline">
              expand_more
            </span>
          </div>

          {/* Genuine Hardware Connection Trigger */}
          <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={handleToggleHardwareLink}
              className={`px-3 py-1.5 rounded font-label-sm text-label-sm font-mono transition-all flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
                  : 'bg-tertiary-container text-on-tertiary-container font-semibold shadow-sm'
              }`}
            >
              <span
                className={`material-symbols-outlined text-sm ${
                  hardwareState === 'CONNECTING' ? 'animate-spin' : ''
                }`}
              >
                {isConnected ? 'verified' : hardwareState === 'CONNECTING' ? 'refresh' : 'tune'}
              </span>
              <span>
                {isConnected ? 'HARDWARE CONNECTED' : 'SIMULATION MODE (CONNECT HW)'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleZeroCalibrate}
            disabled={calibrating}
            className="px-3 py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm font-mono flex items-center gap-1.5 transition-colors border border-white/5"
          >
            <span
              className={`material-symbols-outlined text-sm ${calibrating ? 'animate-spin' : ''}`}
            >
              {calibrating ? 'refresh' : 'restart_alt'}
            </span>
            <span className="hidden sm:inline">
              {calibrating ? 'Calibrating...' : 'Simulate CT Zero'}
            </span>
          </button>
        </div>
      </div>

      {/* Gateway & Physical Hardware Status Card */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low/90 backdrop-blur-md p-space-md shadow-md border border-white/5">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-md">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-12 w-12 rounded-lg bg-surface-container-highest/60 text-tertiary border border-tertiary/20">
              <span className="material-symbols-outlined text-2xl">router</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Target Architecture: {selectedDevice.hwModel}
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container-highest text-tertiary font-label-sm text-label-sm font-mono border border-tertiary/20">
                  PZEM Modbus Emulation
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-on-surface-variant font-label-sm text-label-sm font-mono mt-0.5">
                <span>VIRTUAL MAC: {selectedDevice.mac}</span>
                <span>•</span>
                <span className="text-tertiary flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">wifi</span>
                  SIM RSSI {selectedDevice.rssiDbm} dBm
                </span>
                <span>•</span>
                <span>Firmware {selectedDevice.firmwareVersion}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-md bg-surface-container-lowest/80 px-space-md py-2.5 rounded-lg font-mono border border-white/5">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline">SYNTHETIC TICK</span>
              <div className="flex items-center gap-1.5 text-tertiary font-semibold font-label-md text-label-md">
                <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
                <span>{heartbeatSecAgo}s ago</span>
              </div>
            </div>
            <div className="h-6 w-px bg-surface-container-highest"></div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-outline">TRANSCEIVER CHANNEL</span>
              <span className="font-label-md text-label-md text-on-surface">
                ws://internal.voltix:8080/pzem (Simulated Loopback)
              </span>
            </div>
            <div className="h-6 w-px bg-surface-container-highest hidden sm:block"></div>
            <div className="flex-col hidden sm:flex">
              <span className="font-label-sm text-label-sm text-outline">SENSOR TEMP (SIM)</span>
              <span className="font-label-md text-label-md text-primary font-semibold">
                {reading.temperatureC}°C (Modeled)
              </span>
            </div>
          </div>
        </div>

        {/* Transceiver Grid Micro Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-space-sm pt-space-sm border-t border-surface-container-high/40">
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">CT CLAMP SPEC</span>
            <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">100A / 50mA</span>
            <span className="font-body-sm text-body-sm text-tertiary font-mono block mt-0.5">±0.5% Calibrated</span>
          </div>
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">MODEL RATE</span>
            <span className="font-headline-md text-headline-md font-mono text-primary font-semibold">1000 ms</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant font-mono block mt-0.5">Synthetic Tick</span>
          </div>
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">UART PROTOCOL</span>
            <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">9600 8N1</span>
            <span className="font-body-sm text-body-sm text-secondary font-mono block mt-0.5">Modbus Ready</span>
          </div>
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">VIRTUAL TICKS</span>
            <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">41,208</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant font-mono block mt-0.5">Sim Engine</span>
          </div>
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">RUN TIME</span>
            <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">14d 08h 12m</span>
            <span className="font-body-sm text-body-sm text-secondary font-mono block mt-0.5">Simulation Active</span>
          </div>
          <div className="p-space-sm rounded bg-surface-container/40 border border-white/5">
            <span className="font-label-sm text-label-sm text-outline font-mono block">FRAME CRC</span>
            <span className="font-headline-md text-headline-md font-mono text-secondary font-semibold">VALID (SIM)</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant font-mono block mt-0.5">CRC-16 Modbus</span>
          </div>
        </div>
      </div>

      {/* Visual Hardware Module Strip */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl shadow-sm border border-white/5">
        <div className="md:col-span-4 relative rounded-lg overflow-hidden h-44 bg-surface-container-lowest border border-white/5">
          <div className="w-full h-full bg-gradient-to-tr from-surface-container-lowest via-surface-container to-surface-container-high flex flex-col items-center justify-center p-4 text-center">
            <span className="material-symbols-outlined text-4xl text-tertiary mb-2">memory</span>
            <span className="font-mono text-label-sm text-on-surface font-semibold">
              {selectedDevice.hwModel}
            </span>
            <span className="font-mono text-xs text-outline">{selectedDevice.sensorInterface}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between font-mono">
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest/90 text-primary font-semibold border border-primary/20">
              TARGET HARDWARE PROFILE
            </span>
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span>
              EMULATED FEED
            </span>
          </div>
        </div>

        <div className="md:col-span-8 flex flex-col justify-between h-full gap-space-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="font-label-sm text-label-sm text-primary uppercase font-mono tracking-wider">
                Simulated Line Load
              </span>
              <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                {selectedDevice.name} (Virtual Busbar)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-secondary/15 text-secondary font-mono font-medium border border-secondary/20">
                Phase 1 Balanced
              </span>
              <span className="font-label-sm text-label-sm px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary font-mono font-medium border border-tertiary/20">
                50Hz Synthetic Grid
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            <div className="p-space-sm rounded-lg bg-surface-container-lowest/80 flex flex-col justify-between border border-white/5">
              <span className="font-label-sm text-label-sm text-outline font-mono">THERMAL SINK (SIM)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">
                  {reading.temperatureC}°C
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-mono">ΔT +2.4°C</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '32%' }}></div>
              </div>
            </div>

            <div className="p-space-sm rounded-lg bg-surface-container-lowest/80 flex flex-col justify-between border border-white/5">
              <span className="font-label-sm text-label-sm text-outline font-mono">SIM TOTAL ACCUMULATED</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-mono text-on-surface font-semibold">
                  {reading.totalRunKwh.toFixed(2)} kWh
                </span>
                <span className="font-label-sm text-label-sm text-primary font-mono">MTD</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: '64%' }}></div>
              </div>
            </div>

            <div className="p-space-sm rounded-lg bg-surface-container-lowest/80 flex flex-col justify-between border border-white/5">
              <span className="font-label-sm text-label-sm text-outline font-mono">PACKET INTEGRITY</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-md text-headline-md font-mono text-secondary font-semibold">
                  100%
                </span>
                <span className="font-label-sm text-label-sm text-outline font-mono">0 dropouts</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-secondary h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Telemetry Measurement Matrix (8 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* 1. Active Power */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm group border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-primary">bolt</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Active Power (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-mono border border-tertiary/20">
              Synthetic
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-primary font-bold tracking-tight">
              {reading.power.toFixed(1)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-primary-fixed">W</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Peak: <span className="text-on-surface font-semibold">890.0 W</span></span>
            <span>•</span>
            <span>Min: <span className="text-on-surface font-semibold">320.4 W</span></span>
            <span className="text-secondary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_flat</span>
              ±1.2%
            </span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, (reading.power / 900) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 2. Voltage RMS */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm group border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-secondary">electric_meter</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                RMS Voltage (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-mono border border-tertiary/20">
              Synthetic
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-secondary font-bold tracking-tight">
              {reading.voltage.toFixed(1)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-secondary-fixed">V</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Nominal: <span className="text-on-surface font-semibold">230.0 V</span></span>
            <span>•</span>
            <span>Crest: <span className="text-on-surface font-semibold">1.414</span></span>
            <span className="text-secondary">Sim Nominal</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="bg-secondary h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, ((reading.voltage - 200) / 50) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 3. Current RMS */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm group border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-tertiary">airwave</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Current (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-mono border border-tertiary/20">
              Model
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-tertiary font-bold tracking-tight">
              {reading.current.toFixed(3)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-tertiary-fixed">A</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Peak: <span className="text-on-surface font-semibold">3.88 A</span></span>
            <span>•</span>
            <span>Breaker: <span className="text-outline">16.0 A (15.6%)</span></span>
            <span className="text-secondary font-semibold">Normal</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="bg-tertiary h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, (reading.current / 16) * 100))}%` }}
            ></div>
          </div>
        </div>

        {/* 4. Power Factor */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm group border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-secondary">speed</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Power Factor (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-mono border border-secondary/20">
              Sim Profile
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold tracking-tight">
              {reading.powerFactor.toFixed(2)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-outline">PF</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Vector: <span className="text-on-surface font-semibold">Lagging</span></span>
            <span>•</span>
            <span>Penalty: <span className="text-secondary font-semibold">0.00%</span></span>
            <span className="text-secondary">Clean Profile</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="bg-secondary h-full transition-all duration-500"
              style={{ width: `${reading.powerFactor * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 5. Line Frequency */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-primary">graphic_eq</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Frequency (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-mono">
              Virtual Lock
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold tracking-tight">
              {reading.frequency.toFixed(2)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-primary">Hz</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Dev: <span className="text-secondary">+0.04%</span></span>
            <span>•</span>
            <span>Window: <span className="text-on-surface font-semibold">49.8 - 50.2</span></span>
            <span className="text-secondary font-semibold">Stable</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '50%' }}></div>
          </div>
        </div>

        {/* 6. Accumulated Energy */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-secondary">memory</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Active Energy (Sim)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary font-mono border border-secondary/20">
              Virtual Reg
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold tracking-tight">
              {reading.energyToday.toFixed(3)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-secondary">kWh</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Since: <span className="text-on-surface">00:00 UTC</span></span>
            <span>•</span>
            <span>Cost est: <span className="text-secondary font-semibold">₹112.50</span></span>
            <span className="text-outline">Sync OK</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className="bg-secondary h-full" style={{ width: '42%' }}></div>
          </div>
        </div>

        {/* 7. Apparent Power */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-primary">all_inclusive</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Apparent Power (S)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-outline font-mono">
              Calculated
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold tracking-tight">
              {reading.apparentPower.toFixed(1)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-outline">VA</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>V × I Vector: <span className="text-on-surface">{reading.apparentPower} VA</span></span>
            <span>•</span>
            <span className="text-primary font-semibold">Load factor 64%</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '61%' }}></div>
          </div>
        </div>

        {/* 8. Reactive Power */}
        <div className="relative overflow-hidden p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-outline">
              <span className="material-symbols-outlined text-lg text-tertiary">swap_driving_apps</span>
              <span className="font-label-sm text-label-sm uppercase font-mono tracking-wider">
                Reactive Power (Q)
              </span>
            </div>
            <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-mono border border-tertiary/20">
              Inductive
            </span>
          </div>
          <div className="mt-space-sm flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold tracking-tight">
              {reading.reactivePower.toFixed(1)}
            </span>
            <span className="font-headline-md text-headline-md font-mono text-tertiary">VAR</span>
          </div>
          <div className="mt-space-sm flex items-center justify-between text-on-surface-variant font-mono font-label-sm text-label-sm">
            <span>Capacitor Bank: <span className="text-on-surface">OFF</span></span>
            <span>•</span>
            <span className="text-secondary font-semibold">Within spec</span>
          </div>
          <div className="mt-space-sm h-1 w-full bg-surface-container-high rounded-full overflow-hidden">
            <div className="bg-tertiary h-full" style={{ width: '28%' }}></div>
          </div>
        </div>
      </div>

      {/* Real-Time Waveform / Oscilloscope Panel */}
      <Oscilloscope onExportJson={handleExportJson} />

      {/* Dual Split Section: FIFO Packet Buffer & Safety Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        <div className="lg:col-span-8">
          <TelemetryTable onOpenInspector={() => setInspectorModalOpen(true)} />
        </div>

        {/* Safety Thresholds Panel (4-cols) */}
        <div className="lg:col-span-4 bg-surface-container-low p-space-md rounded-xl shadow-md flex flex-col justify-between gap-space-md border border-white/5">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">verified_user</span>
                <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Safety Thresholds (Simulation)
                </span>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-secondary/15 text-secondary font-mono border border-secondary/20">
                ALL PASS
              </span>
            </div>

            {/* Threshold List */}
            <div className="mt-space-md space-y-space-sm">
              {/* Overvoltage Cutoff */}
              <div className="p-space-sm rounded-lg bg-surface-container/60 flex flex-col gap-1.5 border border-white/5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    Overvoltage Cutoff
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                    NOMINAL
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
                  <span>Trip Point: 250.0 V</span>
                  <span>
                    Simulated: <strong className="text-on-surface">{reading.voltage.toFixed(1)} V</strong>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>

              {/* Overcurrent Limit */}
              <div className="p-space-sm rounded-lg bg-surface-container/60 flex flex-col gap-1.5 border border-white/5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    Incomer Breaker Limit (16A)
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                    15.6% LOAD
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
                  <span>Trip: 16.00 A</span>
                  <span>
                    Active: <strong className="text-tertiary">{reading.current.toFixed(3)} A</strong>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '15.6%' }}></div>
                </div>
              </div>

              {/* Power Factor Degradation Rule */}
              <div className="p-space-sm rounded-lg bg-surface-container/60 flex flex-col gap-1.5 border border-white/5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    PF Degradation Alert (&lt;0.85)
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/20">
                    CLEAR
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
                  <span>Penalty Line: 0.85 PF</span>
                  <span>
                    Operating: <strong className="text-secondary font-semibold">{reading.powerFactor.toFixed(2)} PF</strong>
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '95%' }}></div>
                </div>
              </div>

              {/* Sensor Clamp Integrity */}
              <div className="p-space-sm rounded-lg bg-surface-container/60 flex flex-col gap-1.5 border border-white/5">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-body-md text-body-md text-on-surface font-semibold">
                    CT Saturation Warning
                  </span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest text-outline">
                    STABLE
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
                  <span>Core Flux: 0.28 Tesla</span>
                  <span>Limit: 1.60 Tesla</span>
                </div>
              </div>
            </div>
          </div>

          {/* Relay Manual Trip Simulation Action */}
          <div className="bg-surface-container-lowest/90 p-space-sm rounded-lg flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-xl">gavel</span>
              <div className="font-mono">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold block">
                  Virtual Opto-Isolated Trip Relay
                </span>
                <span className="font-label-sm text-label-sm text-outline">GPIO 26 • Armed (Sim)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={triggerRelayTripTest}
              className="px-2.5 py-1.5 rounded bg-error-container hover:bg-error text-error hover:text-on-error font-label-sm text-label-sm font-mono transition-colors font-semibold"
            >
              TEST INTERRUPT
            </button>
          </div>
        </div>
      </div>

      {/* In-Cabinet Multi-Angle Imagery Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm text-outline font-mono">
              TARGET SWITCHBOARD ARCHITECTURE
            </span>
            <span className="material-symbols-outlined text-primary text-sm">
              precision_manufacturing
            </span>
          </div>
          <div className="h-32 rounded-lg overflow-hidden bg-surface-container-lowest relative border border-white/5 flex items-center justify-center">
            <div className="text-center font-mono text-outline">
              <span className="material-symbols-outlined text-3xl text-primary mb-1">power</span>
              <div className="text-xs">MAIN FEEDER BUS A (230V 50Hz)</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            <div className="absolute bottom-2 left-2 font-mono font-label-sm text-label-sm text-on-surface">
              REFERENCE BUSBAR SPEC
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm text-outline font-mono">
              SENSOR OPTICAL ISOLATOR SPEC
            </span>
            <span className="material-symbols-outlined text-secondary text-sm">security</span>
          </div>
          <div className="h-32 rounded-lg overflow-hidden bg-surface-container-lowest relative border border-white/5 flex items-center justify-center">
            <div className="text-center font-mono text-outline">
              <span className="material-symbols-outlined text-3xl text-secondary mb-1">lock</span>
              <div className="text-xs">OPTOCOUPLER BARRIER PROFILE</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            <div className="absolute bottom-2 left-2 font-mono font-label-sm text-label-sm text-secondary">
              2.5kV GALVANIC ISOLATION SPEC
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-sm text-label-sm text-outline font-mono">
              ANTENNA TELEMETRY SPECTRUM
            </span>
            <span className="material-symbols-outlined text-tertiary text-sm">rss_feed</span>
          </div>
          <div className="h-32 rounded-lg overflow-hidden bg-surface-container-lowest relative border border-white/5 flex items-center justify-center">
            <div className="text-center font-mono text-outline">
              <span className="material-symbols-outlined text-3xl text-tertiary mb-1">cell_tower</span>
              <div className="text-xs">CH 36 5.8GHz DSSS ARCHITECTURE</div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            <div className="absolute bottom-2 left-2 font-mono font-label-sm text-label-sm text-tertiary">
              5.8 GHz ULTRA-LOW LATENCY SPEC
            </div>
          </div>
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      <Modal
        isOpen={inspectorModalOpen}
        onClose={() => setInspectorModalOpen(false)}
        title="Simulated ESP32 Inbound Frame Payload"
        icon="terminal"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-space-md bg-surface-container-lowest rounded-lg border border-white/5 overflow-x-auto">
            <pre className="font-mono font-label-sm text-label-sm text-primary leading-relaxed select-all">
              {rawJsonPayload}
            </pre>
          </div>
          <div className="flex items-center justify-between font-mono font-label-sm text-label-sm">
            <span className="text-outline">Encoding: UTF-8 JSON Stream (Synthetic Modbus Decoded)</span>
            <button
              type="button"
              onClick={handleCopyPayload}
              className="px-3 py-1.5 rounded bg-primary-container text-on-primary-container font-semibold flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              <span>{copiedPayload ? 'Copied!' : 'Copy Payload'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
