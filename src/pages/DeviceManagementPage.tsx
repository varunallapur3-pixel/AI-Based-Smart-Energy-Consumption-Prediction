import React, { useState } from 'react';
import { useDeviceFleet } from '../hooks/useDeviceFleet';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';
import { DeviceTable } from '../components/devices/DeviceTable';
import { DeviceRegisterForm } from '../components/devices/DeviceRegisterForm';
import { DeviceInspector } from '../components/devices/DeviceInspector';
import { SubnetScanModal } from '../components/devices/SubnetScanModal';
import { exportFleetManifestJson, MOCK_DISCOVERED_NODES } from '../services/deviceService';
import { DeviceNode } from '../types/device';

export const DeviceManagementPage: React.FC = () => {
  const { devices, stats, claimDiscoveredNode } = useDeviceFleet();
  const { selectedDevice, setSelectedDeviceId } = useTelemetry();
  const { showToast } = useToast();

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [inspectedNode, setInspectedNode] = useState<DeviceNode>(selectedDevice);

  const handleExportManifest = () => {
    exportFleetManifestJson(devices);
    showToast(`Exported manifest.json for ${devices.length} IoT hardware nodes`, 'file_download', 'success');
  };

  const handleClaimUnclaimed = () => {
    claimDiscoveredNode(MOCK_DISCOVERED_NODES[0]);
  };

  const handleInspect = (node: DeviceNode) => {
    setInspectedNode(node);
    setSelectedDeviceId(node.id);
    showToast(`Attached telemetry stream to ${node.id} (${node.name})`, 'sensors', 'info');
  };

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* Top Fleet Breadcrumbs & Quick Telemetry Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              TELEMETRY GATEWAY // FLEET CONTROL
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              ZONE_EAST_FEEDER_04
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            IoT Node Fleet & Gateway Management
          </h1>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={handleExportManifest}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm font-mono shadow-sm border border-white/5"
          >
            <span className="material-symbols-outlined text-sm text-primary">download</span>
            <span>EXPORT MANIFEST</span>
          </button>
          <button
            type="button"
            onClick={() => setScanModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm font-mono shadow-sm border border-white/5"
          >
            <span className="material-symbols-outlined text-sm text-secondary animate-pulse">radar</span>
            <span>SIMULATION SWEEP</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const formEl = document.getElementById('registration-panel');
              formEl?.scrollIntoView({ behavior: 'smooth' });
              showToast('Ready to provision virtual energy node', 'add', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-[0_0_16px_rgba(76,215,246,0.3)]"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>+ REGISTER VIRTUAL NODE</span>
          </button>
        </div>
      </div>

      {/* Status Ticker & Metric Strip (4 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex items-center justify-between border border-white/5">
          <div>
            <div className="font-label-sm text-label-sm font-mono uppercase text-on-surface-variant">
              TOTAL PROVISIONED
            </div>
            <div className="font-headline-lg text-headline-lg font-semibold text-on-surface mt-1 font-mono">
              {stats.totalCount} <span className="font-label-sm text-label-sm font-normal text-outline">NODES</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">memory</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex items-center justify-between border border-white/5">
          <div>
            <div className="font-label-sm text-label-sm font-mono uppercase text-secondary">
              EMULATED TELEMETRY
            </div>
            <div className="font-headline-lg text-headline-lg font-semibold text-secondary mt-1 font-mono">
              {stats.standbyCount} <span className="font-label-sm text-label-sm font-normal text-secondary-container">SIMULATED</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-2xl">sensors</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex items-center justify-between border border-white/5">
          <div>
            <div className="font-label-sm text-label-sm font-mono uppercase text-tertiary">
              PHYSICAL HARDWARE
            </div>
            <div className="font-headline-lg text-headline-lg font-semibold text-tertiary mt-1 font-mono">
              {stats.activeCount} <span className="font-label-sm text-label-sm font-normal text-tertiary-container">CONNECTED</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-2xl">link_off</span>
          </div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex items-center justify-between border border-white/5">
          <div>
            <div className="font-label-sm text-label-sm font-mono uppercase text-on-surface-variant">
              FAULT COND.
            </div>
            <div className="font-headline-lg text-headline-lg font-semibold text-on-surface mt-1 font-mono">
              {stats.faultCount} <span className="font-label-sm text-label-sm font-normal text-outline">NOMINAL</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
        </div>
      </div>

      {/* Discovery Notification Banner */}
      <div className="p-space-md rounded-xl bg-surface-container-low shadow-md flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden border border-white/5">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-start gap-space-md z-10">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 border border-primary/20">
            <span className="material-symbols-outlined text-xl">wifi_find</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm font-mono font-semibold text-primary uppercase">
                Virtual Bus Simulation Probe
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-ping"></span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                Virtual Bus Space (Simulated)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl">
              Virtual discovery sweeps synthetic node registers. No physical mDNS, UDP, or ARP packets are broadcast in simulation mode.
            </p>
          </div>
        </div>

        {/* Live Discovery Prompt Badge */}
        <div className="z-10 flex items-center gap-space-sm bg-surface-container p-2 rounded-lg shrink-0 border border-white/5">
          <div className="flex flex-col text-left">
            <span className="font-label-sm text-label-sm text-secondary font-mono font-semibold">
              1 UNCLAIMED VIRTUAL NODE
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              VIRT-BUS-142 [Virtual CT Node]
            </span>
          </div>
          <button
            type="button"
            onClick={handleClaimUnclaimed}
            className="px-3 py-1.5 bg-secondary-container hover:bg-secondary text-on-secondary rounded font-label-sm text-label-sm font-semibold transition-all flex items-center gap-1 shadow-sm"
          >
            <span>+ Add Virtual Node</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Fleet Table + Registration Drawer / Health Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* Primary Fleet Table & Diagnostics (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          <DeviceTable onInspect={handleInspect} />

          {/* Subnet Diagnostics & Latency Logs Panel */}
          <div className="rounded-xl bg-surface-container-low shadow-md p-space-md space-y-space-md border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">network_check</span>
                <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Subnet Diagnostics & Latency Logs
                </h3>
              </div>
              <span className="font-label-sm text-label-sm font-mono text-outline">
                Real-time WebSocket & MQTT QOS
              </span>
            </div>

            {/* Diagnostic Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
              <div className="bg-surface-container p-3 rounded-lg flex items-center justify-between border border-white/5">
                <div>
                  <div className="font-label-sm text-label-sm font-mono text-outline">
                    MQTT BROKER RTT
                  </div>
                  <div className="font-headline-md text-headline-md text-primary font-mono mt-0.5">
                    14.2 ms
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-2xl">speed</span>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex items-center justify-between border border-white/5">
                <div>
                  <div className="font-label-sm text-label-sm font-mono text-outline">
                    PACKET LOSS (24H)
                  </div>
                  <div className="font-headline-md text-headline-md text-secondary font-mono mt-0.5">
                    0.018 %
                  </div>
                </div>
                <span className="material-symbols-outlined text-secondary text-2xl">check_circle</span>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex items-center justify-between border border-white/5">
                <div>
                  <div className="font-label-sm text-label-sm font-mono text-outline">
                    HEARTBEAT DROP TIMEOUTS
                  </div>
                  <div className="font-headline-md text-headline-md text-on-surface font-mono mt-0.5">
                    0 DROPS
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-2xl">signal_cellular_alt</span>
              </div>
            </div>

            {/* Console-Style Event Timeline (Simulated Stream) */}
            <div className="bg-surface-container-lowest p-space-sm rounded-lg font-mono font-label-sm text-label-sm space-y-1.5 overflow-x-auto max-h-44 border border-white/5">
              <div className="text-on-surface-variant flex items-center gap-2">
                <span className="text-outline">[14:32:01.218]</span>
                <span className="text-secondary font-semibold">SIM_ACK</span>
                <span>Virtual loopback response received: simulated VIRT_NODE_01 (Synthetic ADC matrix nominal)</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-2">
                <span className="text-outline">[14:31:55.004]</span>
                <span className="text-primary font-semibold">VIRT_SWEEP</span>
                <span>Simulated bus sweep completed: emulated identifier VIRT-MAC-7F90 available to add</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-2">
                <span className="text-outline">[14:30:12.784]</span>
                <span className="text-tertiary font-semibold">SIM_WARN</span>
                <span>VIRT_NODE_03 simulated RF RSSI dropped to -78 dBm. Channel 6 noise floor modeled.</span>
              </div>
              <div className="text-on-surface-variant flex items-center gap-2">
                <span className="text-outline">[14:28:44.110]</span>
                <span className="text-secondary font-semibold">SIM_INFO</span>
                <span>Synthetic PZEM telemetry accumulator: simulated energy load 342.1 kWh.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Provision Form + Inspector (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          <div id="registration-panel">
            <DeviceRegisterForm />
          </div>
          <DeviceInspector node={inspectedNode} />
        </div>
      </div>

      <SubnetScanModal isOpen={scanModalOpen} onClose={() => setScanModalOpen(false)} />
    </div>
  );
};
