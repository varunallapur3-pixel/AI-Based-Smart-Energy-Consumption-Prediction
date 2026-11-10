import React, { useState } from 'react';
import { ProvisionFormInput, SensorInterfaceType } from '../../types/device';
import { generateHardwareId, generateHmacSecret, downloadConfigFile } from '../../services/deviceService';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { useToast } from '../../contexts/ToastContext';
import { DeviceCreate } from '../../services/api/types';

interface DeviceRegisterFormProps {
  initialHwId?: string;
  initialFriendlyName?: string;
  initialSensorType?: SensorInterfaceType;
  onSubmitDevice?: (data: DeviceCreate, payload: ProvisionFormInput) => Promise<void>;
  isSubmitting?: boolean;
}

export const DeviceRegisterForm: React.FC<DeviceRegisterFormProps> = ({
  initialHwId = 'VIRT_NODE_05',
  initialFriendlyName = '',
  initialSensorType = 'pzem',
  onSubmitDevice,
  isSubmitting = false,
}) => {
  const { registerDevice } = useTelemetry();
  const { showToast } = useToast();

  const [friendlyName, setFriendlyName] = useState(initialFriendlyName);
  const [hwId, setHwId] = useState(initialHwId);
  const [sensorType, setSensorType] = useState<SensorInterfaceType>(initialSensorType);
  const [phase, setPhase] = useState('PH-A');
  const [location, setLocation] = useState('');
  // Dynamically initialize ephemeral synthetic token without hardcoded secrets
  const [securityToken, setSecurityToken] = useState(() => generateHmacSecret());
  const [heartbeatSec, setHeartbeatSec] = useState(30);
  const [fallbackToDemo, setFallbackToDemo] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAutoGenerateId = () => {
    const newId = generateHardwareId();
    setHwId(newId);
    setFormError(null);
    showToast(`Generated ID: ${newId}`, 'tag', 'info');
  };

  const handleRegenerateToken = () => {
    const newToken = generateHmacSecret();
    setSecurityToken(newToken);
    showToast('New cryptographic HMAC token generated', 'key', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!friendlyName.trim()) {
      setFormError('Please specify a friendly name for the node.');
      showToast('Please specify a friendly name for the node', 'warning', 'warning');
      return;
    }
    if (!hwId.trim()) {
      setFormError('Hardware Node Identifier cannot be empty.');
      return;
    }

    setFormError(null);

    const payload: ProvisionFormInput = {
      friendlyName: friendlyName.trim(),
      hwId: hwId.trim(),
      sensorType,
      phase,
      location: location.trim() || 'Main Facility Feeder',
      securityToken,
      heartbeatSec,
      fallbackToDemo,
    };

    if (onSubmitDevice) {
      const backendData: DeviceCreate = {
        device_id: hwId.trim(),
        name: friendlyName.trim(),
        device_type: 'SIMULATED', // Virtual node is explicitly SIMULATED
        location: location.trim() || 'Main Facility Feeder',
        status: 'ONLINE',
        firmware_version: 'v2.1.4_STABLE',
      };

      try {
        await onSubmitDevice(backendData, payload);
        downloadConfigFile(payload);
        showToast(`Downloaded ${hwId.trim()}_config.h firmware header`, 'download_done', 'success');

        // Reset with next generated ID on success
        setFriendlyName('');
        setHwId(generateHardwareId());
        setLocation('');
      } catch (err: unknown) {
        const error = err as Error;
        setFormError(error.message || 'Failed to register device in backend.');
      }
    } else {
      registerDevice(payload);
      downloadConfigFile(payload);
      showToast(`Downloaded ${hwId}_config.h firmware header`, 'download_done', 'success');

      setFriendlyName('');
      setHwId(generateHardwareId());
      setLocation('');
    }
  };

  return (
    <div className="rounded-xl bg-surface-container-low shadow-md p-space-md space-y-space-md border border-white/5">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-lg">add_to_queue</span>
          </div>
          <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Provision Node
          </h2>
        </div>
        <span className="font-label-sm text-label-sm font-mono px-2 py-0.5 rounded bg-surface-container-high text-primary">
          STEP 1/2
        </span>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Register hardware parameters to generate the cryptographic provisioning header file (
        <code className="text-primary font-mono">config.h</code>).
      </p>

      {formError && (
        <div className="p-2.5 rounded-lg bg-error-container/20 border border-error/30 text-error font-body-sm text-body-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-space-sm">
        {/* Friendly Name */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Device Friendly Name
          </label>
          <input
            type="text"
            required
            value={friendlyName}
            onChange={(e) => {
              setFriendlyName(e.target.value);
              setFormError(null);
            }}
            disabled={isSubmitting}
            placeholder="e.g. Workshop Air Compressor"
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          />
        </div>

        {/* Hardware Node Identifier */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase">
              Hardware Node Identifier
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateId}
              disabled={isSubmitting}
              className="font-label-sm text-label-sm text-primary hover:underline font-mono disabled:opacity-50"
            >
              Auto-Generate
            </button>
          </div>
          <input
            type="text"
            required
            value={hwId}
            onChange={(e) => {
              setHwId(e.target.value);
              setFormError(null);
            }}
            disabled={isSubmitting}
            className="w-full bg-surface-container-lowest text-on-surface font-mono font-label-md text-label-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          />
        </div>

        {/* Sensor Interface Type */}
        <div className="space-y-1">
          <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
            Sensor Transducer Interface
          </label>
          <select
            value={sensorType}
            onChange={(e) => setSensorType(e.target.value as SensorInterfaceType)}
            disabled={isSubmitting}
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
          >
            <option value="pzem">PZEM-004T v3.0 (AC Voltage, Current, Active Power, Energy)</option>
            <option value="ct-ads1115">Non-invasive Split-Core CT Clamp + ADS1115 I2C</option>
            <option value="modbus-rs485">Modbus RTU RS485 Industrial Energy Meter</option>
            <option value="ade7758">Analog Devices ADE7758 Polyphase Energy IC</option>
          </select>
        </div>

        {/* Phase & Location */}
        <div className="grid grid-cols-2 gap-space-sm">
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Phase Assignment
            </label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
            >
              <option value="PH-A">Phase A (Red)</option>
              <option value="PH-B">Phase B (Yellow)</option>
              <option value="PH-C">Phase C (Blue)</option>
              <option value="PH-3P">3-Phase Balanced</option>
              <option value="PH-1P">Single Phase 230V</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Facility Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Bay 2 Breaker #8"
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary shadow-inner border border-white/5 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Security Token */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase">
              Simulated Token / Secret (Ephemeral)
            </label>
            <button
              type="button"
              onClick={handleRegenerateToken}
              disabled={isSubmitting}
              className="font-label-sm text-label-sm text-primary hover:underline font-mono disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={securityToken}
              className="w-full bg-surface-container-lowest text-on-surface-variant font-mono font-label-sm text-label-sm px-3 py-2 rounded-lg shadow-inner border border-white/5"
            />
            <span className="material-symbols-outlined absolute right-2.5 top-2 text-sm text-outline">
              key
            </span>
          </div>
          <p className="font-label-sm text-[11px] text-outline font-mono">
            Synthetic test key for simulated node. Contains no production credentials.
          </p>
        </div>

        {/* Heartbeat Timeout Slider */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center font-label-sm text-label-sm font-mono">
            <span className="text-outline uppercase">Heartbeat Timeout</span>
            <span className="text-primary font-semibold">{heartbeatSec}s</span>
          </div>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={heartbeatSec}
            onChange={(e) => setHeartbeatSec(Number(e.target.value))}
            disabled={isSubmitting}
            className="w-full accent-primary h-1 bg-surface-container-high rounded-lg cursor-pointer disabled:opacity-50"
          />
          <div className="flex justify-between text-outline font-label-sm text-label-sm font-mono">
            <span>10s (Fast)</span>
            <span>120s (Low Power)</span>
          </div>
        </div>

        {/* Fallback Behavior Toggle */}
        <div className="p-3 bg-surface-container rounded-lg flex items-center justify-between border border-white/5">
          <div className="space-y-0.5">
            <div className="font-label-sm text-label-sm font-semibold text-on-surface">
              Auto-Fallback to Demo
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant">
              Synthesize realistic noise load if node disconnects
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={fallbackToDemo}
              onChange={(e) => setFallbackToDemo(e.target.checked)}
              disabled={isSubmitting}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-primary after:border-gray-300 after:border-0 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-headline-md text-headline-md font-semibold text-center transition-all shadow-[0_0_16px_rgba(76,215,246,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">cyclone</span>
                <span>Registering Node in Backend...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">memory</span>
                <span>Commit & Download Firmware Header</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
