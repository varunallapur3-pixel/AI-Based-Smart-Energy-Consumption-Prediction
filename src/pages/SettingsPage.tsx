import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';

interface VoltixSavedSettings {
  noiseEnabled: boolean;
  gridFrequencyHz: number;
  voltagePreset: 'nominal' | 'sag' | 'swell';
  telemetryTickSpeedMs: number;
  gatewayUrl: string;
  handshakeTimeoutMs: number;
  autoReconnect: boolean;
  nominalVoltageV: number;
  defaultCtRatio: string;
  overcurrentThresholdA: number;
  lowPfThreshold: number;
  tabularNumbers: boolean;
  highContrastWaveform: boolean;
  soundChimes: boolean;
}

const SETTINGS_STORAGE_KEY = 'voltix_platform_settings';

export const SettingsPage: React.FC = () => {
  const { hardwareEndpoint, connectHardware, disconnectHardware, hardwareState } = useTelemetry();
  const { showToast } = useToast();

  // 1. Simulation Config State
  const [noiseEnabled, setNoiseEnabled] = useState<boolean>(true);
  const [gridFrequencyHz, setGridFrequencyHz] = useState<number>(50.0);
  const [voltagePreset, setVoltagePreset] = useState<'nominal' | 'sag' | 'swell'>('nominal');
  const [telemetryTickSpeedMs, setTelemetryTickSpeedMs] = useState<number>(1000);

  // 2. Gateway Config State
  const [gatewayUrl, setGatewayUrl] = useState<string>(hardwareEndpoint);
  const [handshakeTimeoutMs, setHandshakeTimeoutMs] = useState<number>(3500);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(true);

  // 3. Device & Electrical Presets
  const [nominalVoltageV, setNominalVoltageV] = useState<number>(230);
  const [defaultCtRatio, setDefaultCtRatio] = useState<string>('100A_50mA');
  const [overcurrentThresholdA, setOvercurrentThresholdA] = useState<number>(16.0);
  const [lowPfThreshold, setLowPfThreshold] = useState<number>(0.9);

  // 4. Interface Preferences
  const [tabularNumbers, setTabularNumbers] = useState<boolean>(true);
  const [highContrastWaveform, setHighContrastWaveform] = useState<boolean>(false);
  const [soundChimes, setSoundChimes] = useState<boolean>(false);

  // 5. Unimplemented Backend Settings (explicitly marked)
  const [fastApiEndpoint, setFastApiEndpoint] = useState<string>('http://localhost:8000/api/v1');
  const [timescaleDbSync, setTimescaleDbSync] = useState<boolean>(false);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed: Partial<VoltixSavedSettings> = JSON.parse(saved);
        if (typeof parsed.noiseEnabled === 'boolean') setNoiseEnabled(parsed.noiseEnabled);
        if (typeof parsed.gridFrequencyHz === 'number') setGridFrequencyHz(parsed.gridFrequencyHz);
        if (parsed.voltagePreset) setVoltagePreset(parsed.voltagePreset);
        if (typeof parsed.telemetryTickSpeedMs === 'number') setTelemetryTickSpeedMs(parsed.telemetryTickSpeedMs);
        if (typeof parsed.gatewayUrl === 'string') setGatewayUrl(parsed.gatewayUrl);
        if (typeof parsed.handshakeTimeoutMs === 'number') setHandshakeTimeoutMs(parsed.handshakeTimeoutMs);
        if (typeof parsed.autoReconnect === 'boolean') setAutoReconnect(parsed.autoReconnect);
        if (typeof parsed.nominalVoltageV === 'number') setNominalVoltageV(parsed.nominalVoltageV);
        if (typeof parsed.defaultCtRatio === 'string') setDefaultCtRatio(parsed.defaultCtRatio);
        if (typeof parsed.overcurrentThresholdA === 'number') setOvercurrentThresholdA(parsed.overcurrentThresholdA);
        if (typeof parsed.lowPfThreshold === 'number') setLowPfThreshold(parsed.lowPfThreshold);
        if (typeof parsed.tabularNumbers === 'boolean') setTabularNumbers(parsed.tabularNumbers);
        if (typeof parsed.highContrastWaveform === 'boolean') setHighContrastWaveform(parsed.highContrastWaveform);
        if (typeof parsed.soundChimes === 'boolean') setSoundChimes(parsed.soundChimes);
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, []);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const settingsToSave: VoltixSavedSettings = {
      noiseEnabled,
      gridFrequencyHz,
      voltagePreset,
      telemetryTickSpeedMs,
      gatewayUrl,
      handshakeTimeoutMs,
      autoReconnect,
      nominalVoltageV,
      defaultCtRatio,
      overcurrentThresholdA,
      lowPfThreshold,
      tabularNumbers,
      highContrastWaveform,
      soundChimes,
    };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch {
      // Ignore write errors
    }
    showToast('Platform settings saved to browser storage (localStorage).', 'check_circle', 'success');
  };

  const handleResetDefaults = () => {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore write errors
    }
    setNoiseEnabled(true);
    setGridFrequencyHz(50.0);
    setVoltagePreset('nominal');
    setTelemetryTickSpeedMs(1000);
    setGatewayUrl('');
    setNominalVoltageV(230);
    setDefaultCtRatio('100A_50mA');
    setOvercurrentThresholdA(16.0);
    setLowPfThreshold(0.9);
    setTabularNumbers(true);
    setHighContrastWaveform(false);
    setSoundChimes(false);
    showToast('Settings reset to factory defaults (localStorage cleared)', 'restart_alt', 'info');
  };

  const handleTestGatewayConnection = async () => {
    if (!gatewayUrl.trim()) {
      showToast('Please specify an ESP32 WebSocket endpoint URL (e.g. ws://192.168.1.50:8080/pzem)', 'warning', 'warning');
      return;
    }
    await connectHardware(gatewayUrl);
  };

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg max-w-5xl">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              SYSTEM CONTROL // CONFIGURATION REGISTRY
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              VOLTIX CORE v2.4
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            Platform, Gateway & Simulation Settings
          </h1>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-label-sm text-label-sm transition-colors border border-white/5"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-mono text-label-sm text-label-sm font-semibold transition-all shadow-[0_0_16px_rgba(76,215,246,0.3)] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {/* Persistence Architecture Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container border border-tertiary/20 text-on-surface">
        <span className="material-symbols-outlined text-tertiary text-lg shrink-0 mt-0.5">storage</span>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-tertiary font-mono uppercase tracking-wider">
            STORAGE PERSISTENCE ARCHITECTURE: CLIENT-SIDE LOCALSTORAGE
          </p>
          <p className="text-on-surface-variant font-mono leading-relaxed">
            All configured simulation physics, gateway endpoints, and alert thresholds are persisted in browser storage (<code className="text-primary bg-primary/10 px-1 py-0.5 rounded">localStorage: voltix_platform_settings</code>). 
            No remote PostgreSQL / TimescaleDB database or FastAPI backend server is currently connected. State updates persist on this browser profile across tab reloads.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-space-lg">
        {/* SECTION 1: SIMULATION PHYSICS CONFIGURATION */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-xl">model_training</span>
              <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                Simulation Engine & Physics Jitter
              </h2>
            </div>
            <span className="font-label-sm text-label-sm font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              ACTIVE VIRTUAL ENGINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Noise Jitter Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
              <div>
                <span className="font-label-sm text-sm font-mono text-on-surface font-semibold block">
                  Synthetic Gaussian Noise
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Emulates micro-fluctuations in CT/PT ADC registers (±0.4% RMS jitter).
                </span>
              </div>
              <input
                type="checkbox"
                checked={noiseEnabled}
                onChange={(e) => setNoiseEnabled(e.target.checked)}
                className="w-5 h-5 rounded bg-surface-container-high border-white/20 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Telemetry Tick Speed */}
            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Telemetry Refresh Interval
              </label>
              <select
                value={telemetryTickSpeedMs}
                onChange={(e) => setTelemetryTickSpeedMs(+e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={500}>500 ms (High-Rate Stream)</option>
                <option value={1000}>1,000 ms / 1 Hz (Nominal Standard)</option>
                <option value={2000}>2,000 ms (Low-Bandwidth Mode)</option>
              </select>
            </div>

            {/* Grid Frequency Tuning */}
            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-outline uppercase">Virtual Grid Frequency</span>
                <span className="text-primary font-bold">{gridFrequencyHz.toFixed(2)} Hz</span>
              </div>
              <input
                type="range"
                min="49.5"
                max="50.5"
                step="0.02"
                value={gridFrequencyHz}
                onChange={(e) => setGridFrequencyHz(+e.target.value)}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-outline">
                <span>49.50 Hz (Under-Freq)</span>
                <span>50.00 Hz (Nominal)</span>
                <span>50.50 Hz (Over-Freq)</span>
              </div>
            </div>

            {/* Voltage Disturbance Preset */}
            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Voltage Stability Profile
              </label>
              <select
                value={voltagePreset}
                onChange={(e) => setVoltagePreset(e.target.value as any)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="nominal">Nominal Stable Line (230.1 V ± 0.4%)</option>
                <option value="sag">Simulate Grid Voltage Sag (208.5 V)</option>
                <option value="swell">Simulate Grid Overvoltage Swell (252.0 V)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: HARDWARE GATEWAY CONFIGURATION */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">router</span>
              <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                Hardware Gateway & WebSocket Transceiver
              </h2>
            </div>
            <span
              className={`font-label-sm text-label-sm font-mono px-2 py-0.5 rounded border ${
                hardwareState === 'CONNECTED'
                  ? 'bg-secondary/10 text-secondary border-secondary/20'
                  : 'bg-surface-container text-outline border-white/5'
              }`}
            >
              HW: {hardwareState}
            </span>
          </div>

          <div className="space-y-space-sm">
            {/* Gateway Address Input */}
            <div className="space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                ESP32 WebSocket or MQTT/WS Broker URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  placeholder="Example: ws://192.168.1.50:8080/pzem"
                  className="flex-1 bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {hardwareState === 'CONNECTED' ? (
                  <button
                    type="button"
                    onClick={disconnectHardware}
                    className="px-4 py-2 rounded-lg bg-error/15 hover:bg-error/25 text-error font-mono text-xs font-semibold border border-error/30 transition-colors shrink-0"
                  >
                    Disconnect HW
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestGatewayConnection}
                    className="px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary font-mono text-xs font-semibold border border-primary/20 transition-colors shrink-0"
                  >
                    Test Connection
                  </button>
                )}
              </div>
              <span className="font-mono text-[11px] text-outline block">
                Left empty by default. Hardware is only marked CONNECTED after successful identity verification and authenticated frame receipt.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm pt-2">
              <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
                <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                  Handshake Timeout (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={handshakeTimeoutMs}
                  onChange={(e) => setHandshakeTimeoutMs(+e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
                <div>
                  <span className="font-label-sm text-sm font-mono text-on-surface font-semibold block">
                    Auto-Reconnect on Socket Drop
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant">
                    Attempts 3 exponential backoff handshakes before flagging CONNECTION_LOST.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                  className="w-5 h-5 rounded bg-surface-container-high border-white/20 text-primary focus:ring-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DEVICE & ELECTRICAL THRESHOLDS */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="material-symbols-outlined text-secondary text-xl">electrical_services</span>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Electrical Parameters & Safety Thresholds
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Nominal Voltage
              </label>
              <select
                value={nominalVoltageV}
                onChange={(e) => setNominalVoltageV(+e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={230}>230 V (1-Phase / Phase-to-N)</option>
                <option value={415}>415 V (3-Phase Delta / Line-to-Line)</option>
                <option value={120}>120 V (US Grid Reference)</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Default CT Ratio
              </label>
              <select
                value={defaultCtRatio}
                onChange={(e) => setDefaultCtRatio(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="100A_50mA">100A / 50mA (1:2000 Turns)</option>
                <option value="50A_50mA">50A / 50mA (1:1000 Turns)</option>
                <option value="200A_50mA">200A / 50mA (1:4000 Turns)</option>
              </select>
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Overcurrent Trip Limit (A)
              </label>
              <input
                type="number"
                step="0.5"
                value={overcurrentThresholdA}
                onChange={(e) => setOvercurrentThresholdA(+e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                Low PF Warning Limit
              </label>
              <input
                type="number"
                step="0.02"
                min="0.7"
                max="0.98"
                value={lowPfThreshold}
                onChange={(e) => setLowPfThreshold(+e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-mono text-xs px-3 py-1.5 rounded border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: INTERFACE & DISPLAY PREFERENCES */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="material-symbols-outlined text-primary text-xl">palette</span>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Interface & Display Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
              <div>
                <span className="font-label-sm text-sm font-mono text-on-surface font-semibold block">
                  Tabular Numerals
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Fixed-width figures prevent jitter during 1Hz telemetry updates.
                </span>
              </div>
              <input
                type="checkbox"
                checked={tabularNumbers}
                onChange={(e) => setTabularNumbers(e.target.checked)}
                className="w-5 h-5 rounded bg-surface-container-high border-white/20 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
              <div>
                <span className="font-label-sm text-sm font-mono text-on-surface font-semibold block">
                  High-Contrast Waveform
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Increases phosphor glow on 60s oscilloscope traces.
                </span>
              </div>
              <input
                type="checkbox"
                checked={highContrastWaveform}
                onChange={(e) => setHighContrastWaveform(e.target.checked)}
                className="w-5 h-5 rounded bg-surface-container-high border-white/20 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
              <div>
                <span className="font-label-sm text-sm font-mono text-on-surface font-semibold block">
                  Trip Alarm Chimes
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Audible feedback when virtual breaker trip event triggers.
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundChimes}
                onChange={(e) => setSoundChimes(e.target.checked)}
                className="w-5 h-5 rounded bg-surface-container-high border-white/20 text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: UNIMPLEMENTED BACKEND INTEGRATIONS (HONEST LABELS) */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md opacity-85">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-xl">cloud_sync</span>
              <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                Backend Services & TimescaleDB Ingestion
              </h2>
            </div>
            <span className="font-label-sm text-xs font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              REQUIRES PYTHON FASTAPI BACKEND (PLANNED)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="p-3 rounded-lg bg-surface-container border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-label-sm text-xs font-mono text-outline uppercase block">
                  FastAPI REST / GraphQL Endpoint
                </label>
                <span className="text-[10px] text-tertiary font-mono">UNIMPLEMENTED</span>
              </div>
              <input
                type="text"
                disabled
                value={fastApiEndpoint}
                onChange={(e) => setFastApiEndpoint(e.target.value)}
                className="w-full bg-surface-container-lowest text-outline font-mono text-xs px-3 py-1.5 rounded border border-white/5 cursor-not-allowed"
              />
              <span className="text-[10px] text-outline font-mono block">
                Backend Python FastAPI server has not been started. The application is running in standalone React simulation mode.
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-white/5">
              <div>
                <span className="font-label-sm text-sm font-mono text-outline font-semibold block">
                  TimescaleDB Ingest Pipeline
                </span>
                <span className="font-body-sm text-xs text-outline">
                  Continuous microsecond time-series persistence to PostgreSQL.
                </span>
                <span className="text-[10px] text-tertiary font-mono block mt-1">
                  [PLANNED INFRASTRUCTURE]
                </span>
              </div>
              <input
                type="checkbox"
                disabled
                checked={timescaleDbSync}
                onChange={(e) => setTimescaleDbSync(e.target.checked)}
                className="w-5 h-5 rounded bg-surface-container-high border-white/10 text-outline cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
