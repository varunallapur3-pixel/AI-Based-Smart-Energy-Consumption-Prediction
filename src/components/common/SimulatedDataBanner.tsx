import React, { useState } from 'react';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { Modal } from './Modal';

export const SimulatedDataBanner: React.FC = () => {
  const {
    hardwareState,
    hardwareEndpoint,
    connectHardware,
    disconnectHardware,
    simulateConnectionLost,
  } = useTelemetry();

  const [modalOpen, setModalOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(hardwareEndpoint);

  const isConnected = hardwareState === 'CONNECTED';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    await connectHardware(customUrl);
  };

  return (
    <>
      <div className="w-full bg-surface-container-low/95 border border-tertiary/20 rounded-xl p-3 shadow-md backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Left Information */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-tertiary/15 text-tertiary shrink-0 border border-tertiary/30">
            <span className="material-symbols-outlined text-xl">model_training</span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-sm text-xs font-mono font-bold px-2 py-0.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/30 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse"></span>
                SIMULATED DATA ACTIVE
              </span>

              {/* Hardware State Indicator */}
              <span
                className={`font-label-sm text-xs font-mono font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                  hardwareState === 'CONNECTED'
                    ? 'bg-secondary/15 text-secondary border-secondary/30'
                    : hardwareState === 'CONNECTING'
                    ? 'bg-primary/15 text-primary border-primary/30 animate-pulse'
                    : hardwareState === 'CONNECTION_LOST'
                    ? 'bg-error/15 text-error border-error/30'
                    : 'bg-surface-container-high text-outline border-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  {hardwareState === 'CONNECTED'
                    ? 'verified'
                    : hardwareState === 'CONNECTING'
                    ? 'sync'
                    : hardwareState === 'CONNECTION_LOST'
                    ? 'signal_cellular_connected_no_internet_0_bar'
                    : 'link_off'}
                </span>
                <span>HARDWARE: {hardwareState}</span>
              </span>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant">
              Physical ESP32 microcontrollers are not attached. All metrics, waveform samples, and ML forecasts are produced by the VOLTIX synthetic energy model.
            </p>
          </div>
        </div>

        {/* Right Action Trigger */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-sm text-xs font-mono transition-colors border border-white/10 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-primary">sensors</span>
            <span>ESP32 Hardware Gateway Setup</span>
          </button>
        </div>
      </div>

      {/* Hardware Connection Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Physical ESP32 Gateway Integration"
        icon="router"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Connect your physical ESP32 running VOLTIX firmware (or a local gateway daemon) to transition from simulated mode to genuine hardware telemetry.
          </p>

          {/* Current State Card */}
          <div className="p-3 rounded-lg bg-surface-container border border-white/5 flex items-center justify-between font-mono font-label-sm text-label-sm">
            <div>
              <span className="text-outline uppercase block text-xs">Hardware Link State</span>
              <span
                className={`font-bold ${
                  hardwareState === 'CONNECTED'
                    ? 'text-secondary'
                    : hardwareState === 'CONNECTING'
                    ? 'text-primary'
                    : hardwareState === 'CONNECTION_LOST'
                    ? 'text-error'
                    : 'text-tertiary'
                }`}
              >
                {hardwareState}
              </span>
            </div>
            {isConnected ? (
              <button
                type="button"
                onClick={disconnectHardware}
                className="px-3 py-1 rounded bg-error/15 text-error font-semibold hover:bg-error/25 border border-error/30"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={simulateConnectionLost}
                  className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-bright text-outline text-xs"
                >
                  Simulate Lost
                </button>
              </div>
            )}
          </div>

          {/* Connection Form */}
          <form onSubmit={handleConnect} className="space-y-3">
            <div className="space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                ESP32 WebSocket or MQTT/WS Broker URL
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="Example: ws://192.168.1.50:8080/pzem"
                  className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                />
              </div>
              <span className="font-mono text-xs text-outline block">
                Provide the local WebSocket endpoint of your ESP32 node. Hardware will only be marked CONNECTED after identity verification.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-surface-container text-on-surface font-mono text-xs hover:bg-surface-container-high"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={hardwareState === 'CONNECTING'}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-mono text-xs font-semibold hover:bg-primary-fixed shadow-sm flex items-center gap-1"
              >
                {hardwareState === 'CONNECTING' ? (
                  <>
                    <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                    <span>Probing Gateway...</span>
                  </>
                ) : (
                  <span>Verify & Connect ESP32</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
};
