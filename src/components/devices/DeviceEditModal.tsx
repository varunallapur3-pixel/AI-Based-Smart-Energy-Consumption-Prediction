import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DeviceNode } from '../../types/device';
import { DeviceUpdate, BackendDeviceStatus } from '../../services/api/types';
import { mapFrontendDeviceStatus } from '../../services/api/mappers';

interface DeviceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: DeviceNode | null;
  onSave: (deviceId: string, updateData: DeviceUpdate) => Promise<void>;
  isSubmitting?: boolean;
}

export const DeviceEditModal: React.FC<DeviceEditModalProps> = ({
  isOpen,
  onClose,
  node,
  onSave,
  isSubmitting = false,
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<BackendDeviceStatus>('ONLINE');
  const [firmwareVersion, setFirmwareVersion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setName(node.name);
      setLocation(node.location);
      setStatus(mapFrontendDeviceStatus(node.status));
      setFirmwareVersion(node.firmwareVersion || 'v2.1.4_STABLE');
      setFormError(null);
    }
  }, [node]);

  if (!node) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Device name cannot be empty.');
      return;
    }

    try {
      setFormError(null);
      await onSave(node.id, {
        name: name.trim(),
        location: location.trim() || 'Main Facility Feeder',
        status,
        firmware_version: firmwareVersion.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || 'Failed to update device.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Node: ${node.id}`}
      icon="settings_suggest"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-space-md">
        {/* Hardware Status Strip */}
        <div className="p-2.5 rounded-lg bg-surface-container flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">memory</span>
            <span className="font-mono font-label-sm text-label-sm text-on-surface">
              {node.id}
            </span>
          </div>
          <span
            className={`font-label-sm text-label-sm font-mono px-2 py-0.5 rounded ${
              node.isSimulated
                ? 'bg-secondary/10 text-secondary border border-secondary/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {node.isSimulated ? 'SIMULATED' : 'PHYSICAL HW'}
          </span>
        </div>

        {formError && (
          <div className="p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-error font-body-sm text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{formError}</span>
          </div>
        )}

        {/* Name */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Friendly Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          />
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. Workshop Sub-Panel B"
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Operational Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BackendDeviceStatus)}
            disabled={isSubmitting}
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          >
            <option value="ONLINE">ONLINE (Nominal Operational)</option>
            <option value="OFFLINE">OFFLINE (De-energized)</option>
            <option value="UNKNOWN">UNKNOWN (Telemetry Suspended)</option>
          </select>
        </div>

        {/* Firmware Version */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Firmware Version
          </label>
          <input
            type="text"
            value={firmwareVersion}
            onChange={(e) => setFirmwareVersion(e.target.value)}
            disabled={isSubmitting}
            placeholder="e.g. v2.1.4_STABLE"
            className="w-full bg-surface-container-lowest text-on-surface font-mono font-label-md text-label-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-space-sm pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm font-mono disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-[0_0_12px_rgba(76,215,246,0.3)] flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">cyclone</span>
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                <span>SAVE CHANGES</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
