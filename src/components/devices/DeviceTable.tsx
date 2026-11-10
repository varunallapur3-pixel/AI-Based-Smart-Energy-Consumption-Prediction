import React, { useState } from 'react';
import { DeviceNode } from '../../types/device';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner, EmptyState } from '../common/StateViews';

interface DeviceTableProps {
  devices?: DeviceNode[];
  onInspect: (node: DeviceNode) => void;
  onEdit?: (node: DeviceNode) => void;
  onDelete?: (deviceId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isBackendConnected?: boolean;
}

export const DeviceTable: React.FC<DeviceTableProps> = ({
  devices: propDevices,
  onInspect,
  onEdit,
  onDelete,
  onRefresh,
  isLoading = false,
  isBackendConnected = true,
}) => {
  const { devices: contextDevices, deregisterDevice, rebootDevice, zeroCalibrate } = useTelemetry();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');

  const activeFleet = propDevices !== undefined ? propDevices : contextDevices;

  const filtered = activeFleet.filter((d) => {
    const q = query.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.phase.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q) ||
      d.mac.toLowerCase().includes(q)
    );
  });

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      showToast(`Subnet node state re-synchronized across ${activeFleet.length} devices`, 'sync', 'info');
    }
  };

  const handleDeregister = (id: string) => {
    if (window.confirm(`Deregister IoT Node '${id}'? Telemetry history will be archived.`)) {
      if (onDelete) {
        onDelete(id);
      } else {
        deregisterDevice(id);
      }
    }
  };

  return (
    <div className="rounded-xl bg-surface-container-low shadow-md overflow-hidden border border-white/5">
      {/* Table Header Bar */}
      <div className="p-space-md bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">lan</span>
          <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            {isBackendConnected ? 'Registered Node Fleet' : 'Provisioned Node Fleet (Local Simulation)'}
          </h2>
          <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-highest text-tertiary font-mono border border-tertiary/20">
            {activeFleet.length} {activeFleet.length === 1 ? 'NODE' : 'NODES'}
          </span>
        </div>
        <div className="flex items-center gap-space-sm">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by ID, phase, location..."
              className="w-56 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant font-label-sm text-label-sm px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5"
            />
            <span className="material-symbols-outlined absolute right-2.5 top-1.5 text-sm text-outline">
              search
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1.5 bg-surface-container-high hover:bg-surface-bright rounded-lg text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
            title="Refresh Fleet"
          >
            <span className={`material-symbols-outlined text-lg ${isLoading ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>
      </div>

      {/* Table Body / Loading / Empty State */}
      {isLoading ? (
        <div className="p-8">
          <LoadingSpinner message="Retrieving registered node fleet from FastAPI backend..." />
        </div>
      ) : activeFleet.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title="No Registered Energy Nodes"
            description="The backend database has no device records provisioned. Use the registration panel to register your first node."
            actionLabel="+ Register First Node"
            onAction={() => {
              const formEl = document.getElementById('registration-panel');
              formEl?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-surface-container-lowest/60 text-outline uppercase font-label-sm text-label-sm font-mono tracking-wider border-b border-white/5">
              <tr>
                <th className="py-3 px-space-md" scope="col">Node / Identifier</th>
                <th className="py-3 px-space-md" scope="col">Hardware & Sensor</th>
                <th className="py-3 px-space-md" scope="col">Location</th>
                <th className="py-3 px-space-md" scope="col">Status</th>
                <th className="py-3 px-space-md" scope="col">Telemetry Load</th>
                <th className="py-3 px-space-md" scope="col">RF Signal</th>
                <th className="py-3 px-space-md text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/20 font-body-sm text-body-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-outline font-mono">
                    No matching nodes found for "{query}"
                  </td>
                </tr>
              ) : (
                filtered.map((node) => (
                  <tr key={node.id} className="hover:bg-surface-container/50 transition-colors group">
                    {/* Node ID */}
                    <td className="py-3.5 px-space-md">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body-md text-body-md font-semibold text-on-surface">
                            {node.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-mono">
                            {node.phase}
                          </span>
                          {node.isSimulated && (
                            <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-mono text-[10px] tracking-wide border border-secondary/20">
                              SIMULATED
                            </span>
                          )}
                        </div>
                        <span className="font-label-sm text-label-sm font-mono text-outline">
                          MAC: {node.mac} • {node.id}
                        </span>
                      </div>
                    </td>

                    {/* Hardware & Sensor */}
                    <td className="py-3.5 px-space-md font-mono">
                      <div className="text-on-surface">{node.hwModel}</div>
                      <div className="text-on-surface-variant font-label-sm text-label-sm">
                        {node.sensorInterface}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-space-md">
                      <div className="text-on-surface">{node.location}</div>
                      <div className="text-outline font-label-sm text-label-sm">
                        {node.subLocation}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-space-md">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-sm text-label-sm font-mono border ${
                          node.status === 'ONLINE'
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : node.status === 'OFFLINE'
                            ? 'bg-outline/10 text-outline border-outline/20'
                            : node.status === 'STANDBY'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : node.status === 'FAULT'
                            ? 'bg-error/10 text-error border-error/30'
                            : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            node.status === 'ONLINE'
                              ? 'bg-secondary animate-pulse'
                              : node.status === 'OFFLINE'
                              ? 'bg-outline'
                              : node.status === 'STANDBY'
                              ? 'bg-primary'
                              : node.status === 'FAULT'
                              ? 'bg-error animate-ping'
                              : 'bg-tertiary'
                          }`}
                        ></span>
                        <span>{node.status}</span>
                      </div>
                    </td>

                    {/* Telemetry Load */}
                    <td className="py-3.5 px-space-md font-mono">
                      <div className="text-primary font-semibold">
                        {node.powerWatts.toFixed(1)} W
                      </div>
                      <div className="text-outline font-label-sm text-label-sm">
                        {node.voltageV.toFixed(1)} V • {node.currentA.toFixed(2)} A • PF {node.powerFactor.toFixed(2)}
                      </div>
                    </td>

                    {/* RF Signal */}
                    <td className="py-3.5 px-space-md">
                      <div
                        className={`flex items-center gap-1.5 font-mono font-label-sm text-label-sm ${
                          node.rssiDbm > -70 ? 'text-secondary' : 'text-tertiary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">wifi</span>
                        <span>{node.rssiDbm} dBm</span>
                      </div>
                      <div className="w-14 bg-surface-container-high rounded-full h-1 mt-1 overflow-hidden">
                        <div
                          className={`h-1 rounded-full ${
                            node.rssiDbm > -70 ? 'bg-secondary' : 'bg-tertiary'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, (node.rssiDbm + 100) * 1.5))}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-space-md text-right">
                      <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => onInspect(node)}
                          className="p-1 rounded hover:bg-surface-container-highest text-primary transition-colors"
                          title="Attach Telemetry Stream"
                        >
                          <span className="material-symbols-outlined text-base">monitoring</span>
                        </button>
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(node)}
                            className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors"
                            title="Edit Device Configuration"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => zeroCalibrate(node.id)}
                          className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                          title="Calibrate CT Zero"
                        >
                          <span className="material-symbols-outlined text-base">tune</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => rebootDevice(node.id)}
                          className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-tertiary transition-colors"
                          title="Reboot MCU"
                        >
                          <span className="material-symbols-outlined text-base">restart_alt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeregister(node.id)}
                          className="p-1 rounded hover:bg-surface-container-highest text-error transition-colors"
                          title="Deregister Device"
                        >
                          <span className="material-symbols-outlined text-base">delete_outline</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Table Footer */}
      <div className="p-space-sm bg-surface-container-lowest/80 px-space-md flex flex-wrap items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono border-t border-white/5">
        <div className="flex items-center gap-4">
          <span>
            Target firmware baseline: <strong className="text-on-surface">v2.1.4_STABLE</strong>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            Active Fleet Mode: <strong className="text-primary">{isBackendConnected ? 'FastAPI Synchronized' : 'Offline / Standalone'}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-secondary">verified</span>
          <span className="text-secondary font-semibold">
            {activeFleet.filter((d) => d.isSimulated).length} Simulated Nodes (No Physical HW Connected)
          </span>
        </div>
      </div>
    </div>
  );
};
