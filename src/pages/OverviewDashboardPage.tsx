import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';
import { Sparkline } from '../components/telemetry/Sparkline';
import { CircuitDistribution } from '../components/ai/CircuitDistribution';

export const OverviewDashboardPage: React.FC = () => {
  const {
    reading,
    subPanels,
    dailyTrends,
    timeRange,
    setTimeRange,
    heartbeatSecAgo,
    devices,
    hardwareState,
  } = useTelemetry();

  const { showToast } = useToast();
  const [isDumping, setIsDumping] = useState(false);
  const [anomalyDismissed, setAnomalyDismissed] = useState(false);
  const [profileApplied, setProfileApplied] = useState(false);

  const handleSnapshot = () => {
    setIsDumping(true);
    setTimeout(() => {
      setIsDumping(false);
      showToast('Simulated telemetry buffer snapshot saved to telemetry_snapshot.json', 'check_circle', 'success');

      // Create snapshot download
      const snapshot = {
        timestamp: new Date().toISOString(),
        mode: 'SIMULATION',
        hardware_connected: hardwareState === 'CONNECTED',
        unit: 'Unit #A-4 / Substation Feed (Simulated Profile)',
        reading,
        devices,
        subPanels,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voltix_sim_snapshot_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }, 800);
  };

  const handleApplyProfile = () => {
    setProfileApplied(true);
    showToast('Applied simulated HVAC damper optimization profile. Simulated idle draw throttled.', 'tune', 'success');
  };

  return (
    <div className="relative w-full px-space-md lg:px-margin-desktop py-space-md space-y-space-lg overflow-hidden">
      {/* Subtle Ambient Topographic Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 left-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* 1. Header Sub-bar & Industrial Status Deck */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low/90 backdrop-blur-md p-space-md rounded-xl shadow-md border border-white/5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Industrial Grid Telemetry (Simulated Profile)
            </span>
            <span className="text-outline-variant font-label-sm text-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-tertiary font-mono bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
              Unit #A-4 / Substation Feed (Synthetic)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm pt-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container text-tertiary font-label-sm text-label-sm font-mono border border-tertiary/20">
              <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse"></span>
              <span>4/4 SIMULATED NODES</span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              AGGREGATE (SIM): <span className="text-on-surface font-semibold">3.42 kW</span>
            </div>
            <div className="text-outline-variant hidden sm:inline">•</div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              VIRTUAL HEARTBEAT: <span className="text-tertiary font-semibold">{heartbeatSecAgo}s</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-outline font-label-sm text-label-sm font-mono border border-white/5">
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>SYNTHETIC ESP32 ENGINE</span>
            </div>
          </div>
        </div>

        {/* Controls & Range Switchers */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="inline-flex p-1 bg-surface-container-lowest rounded-lg border border-white/5">
            {(['today', '7d', '30d', 'custom'] as const).map((rng) => (
              <button
                key={rng}
                type="button"
                onClick={() => setTimeRange(rng)}
                className={`px-3 py-1 rounded font-label-sm text-label-sm font-mono transition-all uppercase ${
                  timeRange === rng
                    ? 'text-primary bg-primary/15 font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {rng}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSnapshot}
            disabled={isDumping}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono transition-colors shadow-sm border border-white/5"
          >
            <span
              className={`material-symbols-outlined text-sm text-primary ${
                isDumping ? 'animate-spin' : ''
              }`}
            >
              {isDumping ? 'sync' : 'file_download'}
            </span>
            <span>{isDumping ? 'DUMPING...' : 'EXPORT SIM SNAPSHOT'}</span>
          </button>
        </div>
      </section>

      {/* 2. Primary KPI Telemetry Cards (6 Grid Layout) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-space-sm">
        {/* KPI 1: Live Active Power */}
        <div className="relative bg-surface-container-low p-space-md rounded-xl shadow-sm hover:shadow-cyan-900/10 transition-all flex flex-col justify-between overflow-hidden group border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Active Power (Sim)
            </span>
            <span className="p-1 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-base">bolt</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg font-mono text-primary font-bold tracking-tight">
                {reading.power.toFixed(0)}
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">W</span>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-tertiary font-mono mt-0.5">
              <span className="material-symbols-outlined text-xs">tune</span>
              <span>Synthetic fluctuation (±12W)</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center text-outline-variant font-label-sm text-label-sm font-mono mb-1">
              <span>Phase-A Load</span>
              <span className="text-primary font-semibold">Simulated Nominal</span>
            </div>
            <Sparkline color="#4cd7f6" />
          </div>
        </div>

        {/* KPI 2: Line Voltage */}
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Line Voltage (Sim)
            </span>
            <span className="p-1 rounded bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-base">speed</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg font-mono text-on-surface font-bold">
                {reading.voltage.toFixed(1)}
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">V</span>
            </div>
            <div className="flex items-center gap-1 font-label-sm text-label-sm text-secondary font-mono mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              <span>SIMULATED STABLE (±0.4%)</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm font-mono">
              <span>Grid Freq:</span>
              <span className="text-on-surface font-semibold">{reading.frequency.toFixed(2)} Hz</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-secondary h-full rounded-full" style={{ width: '78%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 3: Active Current */}
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Active Current (Sim)
            </span>
            <span className="p-1 rounded bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-base">electrical_services</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg font-mono text-on-surface font-bold">
                {reading.current.toFixed(2)}
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">A</span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
              Sim Peak: <span className="text-primary">4.8 A</span>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm font-mono mb-1">
              <span>Virtual Breaker</span>
              <span className="text-secondary font-mono">SAFE &lt; 16A</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 4: Today's Total Energy */}
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Accumulated (Sim)
            </span>
            <span className="p-1 rounded bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-base">history_toggle_off</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg font-mono text-secondary font-bold">
                {reading.energyToday.toFixed(2)}
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">kWh</span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
              Synthetic Day 18 of 30
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center text-outline-variant font-label-sm text-label-sm font-mono mb-1">
              <span>Quota Modeling</span>
              <span className="text-on-surface">62%</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary-container h-full rounded-full" style={{ width: '62%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 5: Estimated Bill */}
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Tariff Model Est.
            </span>
            <span className="p-1 rounded bg-tertiary/10 text-tertiary">
              <span className="material-symbols-outlined text-base">payments</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1">
              <span className="font-headline-lg text-headline-lg font-mono text-tertiary font-bold">
                ₹1,842
              </span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
              Model Proj: <span className="text-on-surface">₹2,110</span> (Slab-2)
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center text-outline-variant font-label-sm text-label-sm font-mono mb-1">
              <span>Base Tariff Rate</span>
              <span className="text-on-surface font-mono">₹7.50/kWh</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-tertiary h-full rounded-full" style={{ width: '71%' }}></div>
            </div>
          </div>
        </div>

        {/* KPI 6: Hardware Status */}
        <div className="bg-surface-container-low p-space-md rounded-xl shadow-sm flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
              Virtual Nodes
            </span>
            <span className="p-1 rounded bg-tertiary/10 text-tertiary">
              <span className="material-symbols-outlined text-base">hub</span>
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-lg text-headline-lg font-mono text-on-surface font-bold">
                {devices.length} / {devices.length}
              </span>
              <span className="font-label-sm text-label-sm font-mono text-tertiary">SIM</span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
              0 Physical HW Connected
            </div>
          </div>
          <div className="pt-2">
            <div className="flex items-center gap-1.5">
              {devices.map((d) => (
                <span
                  key={d.id}
                  className="h-2 w-2 rounded-full bg-tertiary"
                  title={`${d.name} (Simulated Model)`}
                ></span>
              ))}
              <span className="font-label-sm text-label-sm text-outline-variant font-mono ml-auto">
                ALL EMULATED
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Primary Data Charts Section (Split Bento Layout) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Panel A: Real-Time Power Telemetry Wave Visualizer (8-cols desktop) */}
        <section className="xl:col-span-8 bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-md flex flex-col justify-between border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-ping"></span>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Real-Time Power Consumption (Simulated Feed)
                </h2>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant font-mono mt-0.5">
                SYNTHETIC SENSOR TIME-SERIES • 30-MINUTE HORIZON
              </p>
            </div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container font-label-sm text-label-sm font-mono border border-white/5">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                <span className="text-on-surface-variant">Simulated Load</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container font-label-sm text-label-sm font-mono border border-white/5">
                <span className="h-1.5 w-3 bg-error rounded-sm"></span>
                <span className="text-on-surface-variant">Sim Alert &gt; 1000W</span>
              </div>
              <span className="font-label-sm text-label-sm font-mono text-outline-variant ml-2">
                SIM TICK: 1.0 Hz
              </span>
            </div>
          </div>

          {/* Telemetry Canvas Visualizer (SVG) */}
          <div className="relative w-full h-72 sm:h-80 bg-surface-container-lowest/60 rounded-xl p-space-sm overflow-hidden flex flex-col justify-end border border-white/5">
            {/* Background Coordinate Grid */}
            <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none opacity-20">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="border-b border-r border-outline-variant"></div>
              ))}
            </div>

            {/* Threshold Guidelines */}
            <div className="absolute left-0 right-0 top-[20%] border-t border-dashed border-error/50 flex justify-between px-2">
              <span className="font-label-sm text-label-sm font-mono text-error/80 bg-surface-container-lowest/90 px-1 rounded border border-error/20">
                2000W CRITICAL SURGE (RULE)
              </span>
            </div>
            <div className="absolute left-0 right-0 top-[52%] border-t border-dashed border-tertiary/40 flex justify-between px-2">
              <span className="font-label-sm text-label-sm font-mono text-tertiary/90 bg-surface-container-lowest/90 px-1 rounded border border-tertiary/20">
                1000W THRESHOLD
              </span>
            </div>

            {/* Dynamic SVG Wave Chart */}
            <svg
              className="w-full h-full relative z-10"
              preserveAspectRatio="none"
              viewBox="0 0 900 240"
            >
              <defs>
                <linearGradient id="overviewLoadGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.38" />
                  <stop offset="85%" stopColor="#4cd7f6" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Filled Area */}
              <polygon
                fill="url(#overviewLoadGradient)"
                points="0,240 0,180 60,175 120,190 180,165 240,150 300,162 360,120 420,140 480,95 540,125 600,145 660,110 720,135 780,105 840,130 900,122 900,240"
              />
              {/* Dynamic Wave Line */}
              <polyline
                fill="none"
                points="0,180 60,175 120,190 180,165 240,150 300,162 360,120 420,140 480,95 540,125 600,145 660,110 720,135 780,105 840,130 900,122"
                stroke="#4cd7f6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
              {/* Peak Callout Point (480, 95) */}
              <circle cx="480" cy="95" fill="#4cd7f6" r="4.5" stroke="#0b1326" strokeWidth="2" />
              <rect
                fill="#171f33"
                height="22"
                rx="4"
                stroke="#4cd7f6"
                strokeWidth="0.75"
                width="80"
                x="440"
                y="65"
              />
              <text
                fill="#dae2fd"
                fontFamily="JetBrains Mono"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                x="480"
                y="79"
              >
                PEAK 720W
              </text>
              {/* Current Head Value (900, 122) */}
              <circle
                className="animate-pulse"
                cx="900"
                cy="122"
                fill="#4edea3"
                r="5"
                stroke="#0b1326"
                strokeWidth="2"
              />
            </svg>

            {/* Timeline X-Axis Labels */}
            <div className="flex justify-between items-center text-outline-variant font-label-sm text-label-sm font-mono pt-2 px-1 border-t border-surface-container-highest">
              <span>-30m</span>
              <span>-25m</span>
              <span>-20m</span>
              <span>-15m</span>
              <span>-10m</span>
              <span>-5m</span>
              <span className="text-primary font-semibold">
                NOW ({reading.power.toFixed(0)}W Sim)
              </span>
            </div>
          </div>

          {/* Telemetry Metadata Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-space-md pt-space-sm border-t border-surface-container-high/60">
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                30M BASELINE (SIM)
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface font-semibold">
                410 W
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                RECORD HIGH (SIM)
              </span>
              <span className="font-label-lg text-label-lg font-mono text-primary font-semibold">
                720 W
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                POWER FACTOR (SIM)
              </span>
              <span className="font-label-lg text-label-lg font-mono text-secondary font-semibold">
                {reading.powerFactor.toFixed(2)} (LAG)
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                SYNTHETIC THD
              </span>
              <span className="font-label-lg text-label-lg font-mono text-on-surface font-semibold">
                1.8% (CLEAN)
              </span>
            </div>
          </div>
        </section>

        {/* Panel B & C Combined Right Column (4-cols desktop) */}
        <div className="xl:col-span-4 flex flex-col gap-space-lg">
          {/* Sub-panel Distribution */}
          <section className="bg-surface-container-low p-space-md rounded-xl shadow-md flex flex-col justify-between border border-white/5">
            <div className="flex items-center justify-between mb-space-sm">
              <div>
                <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Sub-panel Distribution
                </h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  SIMULATED CIRCUIT DRAW
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">pie_chart</span>
            </div>
            <CircuitDistribution distribution={subPanels} totalKw="3.42" variant="donut" />
          </section>

          {/* Historical Benchmark Card */}
          <section className="bg-surface-container-low p-space-md rounded-xl shadow-md flex items-center justify-between relative overflow-hidden border border-white/5">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none"></div>
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-mono">
                Grid Efficiency Delta (Sim)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-headline-lg text-headline-lg font-mono text-secondary font-bold">
                  -8.4%
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  vs Baseline
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Simulated load-shedding saved{' '}
                <strong className="text-on-surface font-mono">18.6 kWh</strong> across peak tariff bands.
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0 border border-secondary/20">
              <span className="material-symbols-outlined text-2xl">energy_savings_leaf</span>
            </div>
          </section>
        </div>
      </div>

      {/* 4. Lower Tier: Daily Energy Trends Bar Chart & AI Predictive Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
        {/* Daily Energy Consumption Bar Trends (7-cols) */}
        <section className="xl:col-span-7 bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-md flex flex-col justify-between border border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div>
              <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                Consumption Profile (Simulated kWh)
              </h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                7-DAY TARIFF WINDOW BREAKDOWN (OFF-PEAK / STANDARD / PEAK)
              </p>
            </div>
            <div className="flex items-center gap-3 font-label-sm text-label-sm font-mono text-outline-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>Off-Peak
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary"></span>Std
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-tertiary"></span>Peak
              </span>
            </div>
          </div>

          {/* High-Precision Tabular Bar Chart Matrix */}
          <div className="w-full h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-6 pb-2 bg-surface-container-lowest/40 rounded-xl relative border border-white/5">
            {/* 7-day Moving Average Line */}
            <div className="absolute left-4 right-4 top-[35%] border-t border-dotted border-outline-variant flex items-center justify-end">
              <span className="font-label-sm text-label-sm font-mono text-outline bg-surface-container-lowest px-1.5 rounded -mt-2.5 border border-white/5">
                7D SIM MOVING AVG: 16.8 kWh
              </span>
            </div>

            {dailyTrends.map((bar) => {
              const heightPct = Math.min(100, (bar.totalKwh / 20) * 100);
              const offPct = (bar.offPeakKwh / bar.totalKwh) * 100;
              const stdPct = (bar.stdKwh / bar.totalKwh) * 100;
              const peakPct = (bar.peakKwh / bar.totalKwh) * 100;

              return (
                <div
                  key={bar.day}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                >
                  <span
                    className={`font-label-sm text-label-sm font-mono transition-opacity ${
                      bar.isToday
                        ? 'text-primary font-bold'
                        : 'text-on-surface opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {bar.totalKwh.toFixed(1)}
                  </span>
                  <div
                    className={`w-full max-w-[32px] flex flex-col rounded-t overflow-hidden bg-surface-container-high transition-all ${
                      bar.isToday ? 'ring-2 ring-primary/40' : ''
                    }`}
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="bg-tertiary w-full" style={{ height: `${peakPct}%` }} title={`Peak: ${bar.peakKwh} kWh`}></div>
                    <div className="bg-primary w-full" style={{ height: `${stdPct}%` }} title={`Std: ${bar.stdKwh} kWh`}></div>
                    <div className="bg-secondary w-full" style={{ height: `${offPct}%` }} title={`Off-Peak: ${bar.offPeakKwh} kWh`}></div>
                  </div>
                  <span
                    className={`font-label-sm text-label-sm font-mono ${
                      bar.isToday ? 'text-primary font-bold' : 'text-on-surface-variant'
                    }`}
                  >
                    {bar.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-space-sm font-label-sm text-label-sm text-on-surface-variant font-mono">
            <span>Target Daily Limit: &lt; 20.0 kWh</span>
            <span className="text-secondary font-semibold">ALL DAYS WITHIN TOLERANCE</span>
          </div>
        </section>

        {/* Panel E: AI Telemetry Predictor & Anomaly Detection (5-cols) */}
        <section className="xl:col-span-5 bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-md flex flex-col justify-between border border-white/5">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <span className="material-symbols-outlined text-lg">psychology</span>
                </span>
                <div>
                  <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    VoltPredict Engine (Simulated ML)
                  </h3>
                  <span className="font-label-sm text-label-sm text-outline font-mono">
                    SYNTHETIC LSTM ARCHITECTURE
                  </span>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-tertiary/15 text-tertiary font-mono font-semibold border border-tertiary/20">
                PRE-TRAINED SCAFFOLD
              </span>
            </div>

            {/* Forecast Gauge Box */}
            <div className="bg-surface-container p-space-md rounded-xl mt-space-sm mb-space-md border border-white/5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono uppercase">
                  Day-End Energy Forecast (Simulated)
                </span>
                <span className="font-label-sm text-label-sm text-primary font-mono">
                  +1.8% vs Baseline
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1.5">
                <span className="font-headline-xl text-headline-xl font-mono text-on-surface font-bold">
                  18.20
                </span>
                <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">
                  kWh Projected
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Mathematical projection generated from historical diurnal load patterns pending real edge telemetry ingestion.
              </p>
            </div>

            {/* Detected Anomaly Alert Pill */}
            {!anomalyDismissed && (
              <div className="p-space-md rounded-xl bg-error-container/20 border border-error/30 flex flex-col gap-2 mb-space-md">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">
                    report_problem
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm font-mono text-error font-semibold uppercase">
                        Simulated Surge Event
                      </span>
                      <span className="font-label-sm text-label-sm font-mono text-outline">
                        03:14 AM
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface mt-1 leading-snug">
                      Synthetic <strong className="text-error font-mono">480W spike</strong> sustained for 22 mins on Virtual Circuit #2 (HVAC Auxiliary).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Prescriptive Recommendation Action Box */}
            <div className="p-space-md rounded-xl bg-surface-container flex items-start gap-3 border border-white/5">
              <span className="material-symbols-outlined text-tertiary text-xl shrink-0 mt-0.5">
                tune
              </span>
              <div className="flex-1">
                <span className="font-label-sm text-label-sm font-mono text-tertiary uppercase font-semibold">
                  Recommended Remediation (Modeled)
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Inspect HVAC Compressor #2 cycle damper. Idle draw can be curtailed by resetting thermal cutoff band to 22.5°C.
                </p>
                <div className="mt-2.5 flex items-center gap-space-sm">
                  <button
                    type="button"
                    onClick={handleApplyProfile}
                    className={`px-3 py-1 rounded font-label-sm text-label-sm font-mono transition-colors ${
                      profileApplied
                        ? 'bg-secondary text-on-secondary font-semibold'
                        : 'bg-primary text-on-primary hover:bg-primary-fixed'
                    }`}
                  >
                    {profileApplied ? 'PROFILE APPLIED (SIM)' : 'APPLY PROFILE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnomalyDismissed(true);
                      showToast('Simulated anomaly dismissed from active deck', 'check', 'info');
                    }}
                    className="px-3 py-1 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-mono hover:text-on-surface transition-colors"
                  >
                    DISMISS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 5. Active Circuit Sensor Matrix (Dense Table) */}
      <section className="bg-surface-container-low p-space-md lg:p-space-lg rounded-xl shadow-md border border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
          <div>
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Monitored Sub-Nodes & Hardware Gateways (Emulated Bus)
            </h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
              VIRTUAL RS485 / MODBUS OVER SYNTHETIC 1000ms POLLING INTERVAL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm font-mono text-outline">AUTO-REFRESH:</span>
            <span className="font-label-sm text-label-sm font-mono text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
              SYNTHETIC STREAM
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-label-sm">
            <thead>
              <tr className="bg-surface-container-lowest/80 text-outline uppercase tracking-wider border-b border-white/5">
                <th className="py-2.5 px-3">Node ID</th>
                <th className="py-2.5 px-3">Channel Name</th>
                <th className="py-2.5 px-3">Voltage</th>
                <th className="py-2.5 px-3">Current</th>
                <th className="py-2.5 px-3">Active Load</th>
                <th className="py-2.5 px-3">PF</th>
                <th className="py-2.5 px-3">RSSI</th>
                <th className="py-2.5 px-3 text-right">Relay State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/40 text-on-surface">
              {devices.map((dev, i) => (
                <tr
                  key={dev.id}
                  className={`hover:bg-surface-container/60 transition-colors ${
                    i % 2 === 1 ? 'bg-surface-container-lowest/20' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-primary">{dev.id}</td>
                  <td className="py-3 px-3 text-on-surface font-body-sm">{dev.name} (Virtual)</td>
                  <td className="py-3 px-3">{dev.voltageV.toFixed(1)} V</td>
                  <td className="py-3 px-3">{dev.currentA.toFixed(2)} A</td>
                  <td className="py-3 px-3 text-primary font-bold">
                    {dev.powerWatts.toFixed(0)} W
                  </td>
                  <td className="py-3 px-3 text-secondary">{dev.powerFactor.toFixed(2)}</td>
                  <td className="py-3 px-3 text-on-surface-variant">{dev.rssiDbm} dBm</td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded font-label-sm border border-tertiary/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span>
                      SIM CLOSED (ON)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
