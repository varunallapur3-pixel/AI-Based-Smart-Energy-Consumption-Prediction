import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';

type Granularity = '24h' | '7d' | '30d';
type PhaseFilter = 'all' | 'phase_a' | 'phase_b' | 'phase_c';

interface TimeSeriesPoint {
  timeLabel: string;
  energyKwh: number;
  peakDemandKw: number;
  powerFactor: number;
  phaseA_Kw: number;
  phaseB_Kw: number;
  phaseC_Kw: number;
  reactiveKvar: number;
  isPeakTariff?: boolean;
}

export const EnergyAnalyticsPage: React.FC = () => {
  const { reading } = useTelemetry();
  const { showToast } = useToast();

  const [granularity, setGranularity] = useState<Granularity>('24h');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [activeTab, setActiveTab] = useState<'consumption' | 'power_factor' | 'phase_balance'>('consumption');

  // Synthetic dataset modeled according to selected granularity
  const timeSeriesData: TimeSeriesPoint[] = React.useMemo(() => {
    if (granularity === '24h') {
      const hours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      return hours.map((h, i) => {
        const isPeak = i >= 8 && i <= 10; // 16:00 - 20:00 peak
        const base = isPeak ? 3.1 : 1.4;
        const noise = (Math.sin(i * 1.5) * 0.4);
        const total = +(base + noise).toFixed(2);
        return {
          timeLabel: h,
          energyKwh: +(total * 0.9).toFixed(2),
          peakDemandKw: total,
          powerFactor: +(0.92 + (i % 3) * 0.02).toFixed(2),
          phaseA_Kw: +(total * 0.42).toFixed(2),
          phaseB_Kw: +(total * 0.33).toFixed(2),
          phaseC_Kw: +(total * 0.25).toFixed(2),
          reactiveKvar: +(total * 0.31).toFixed(2),
          isPeakTariff: isPeak,
        };
      });
    } else if (granularity === '7d') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return days.map((d, i) => {
        const isWeekend = i >= 5;
        const total = isWeekend ? 22.4 : 36.8;
        return {
          timeLabel: d,
          energyKwh: +(total + Math.sin(i) * 3).toFixed(1),
          peakDemandKw: +(isWeekend ? 2.4 : 3.6).toFixed(2),
          powerFactor: +(0.94 + (i % 2) * 0.02).toFixed(2),
          phaseA_Kw: +(total * 0.4).toFixed(1),
          phaseB_Kw: +(total * 0.35).toFixed(1),
          phaseC_Kw: +(total * 0.25).toFixed(1),
          reactiveKvar: +(total * 0.28).toFixed(1),
        };
      });
    } else {
      // 30 days
      return Array.from({ length: 15 }, (_, i) => {
        const day = `Day ${i * 2 + 1}`;
        const total = +(32 + Math.cos(i) * 6).toFixed(1);
        return {
          timeLabel: day,
          energyKwh: total,
          peakDemandKw: +(3.2 + (i % 4) * 0.2).toFixed(2),
          powerFactor: +(0.93 + (i % 3) * 0.02).toFixed(2),
          phaseA_Kw: +(total * 0.41).toFixed(1),
          phaseB_Kw: +(total * 0.34).toFixed(1),
          phaseC_Kw: +(total * 0.25).toFixed(1),
          reactiveKvar: +(total * 0.30).toFixed(1),
        };
      });
    }
  }, [granularity]);

  // Aggregate metrics
  const totalEnergy = timeSeriesData.reduce((acc, p) => acc + p.energyKwh, 0);
  const maxDemand = Math.max(...timeSeriesData.map((p) => p.peakDemandKw));
  const avgPf = +(timeSeriesData.reduce((acc, p) => acc + p.powerFactor, 0) / timeSeriesData.length).toFixed(3);
  const phaseUnbalancePercent = 4.2; // % current imbalance

  const handleExportData = () => {
    const csvContent = [
      'Timestamp,Energy_kWh,Peak_Demand_kW,Power_Factor,Phase_A_kW,Phase_B_kW,Phase_C_kW,Reactive_kVAR,Data_Origin',
      ...timeSeriesData.map(
        (p) => `${p.timeLabel},${p.energyKwh},${p.peakDemandKw},${p.powerFactor},${p.phaseA_Kw},${p.phaseB_Kw},${p.phaseC_Kw},${p.reactiveKvar},SIMULATED`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voltix_energy_analytics_${granularity}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${granularity} synthetic energy analytics CSV`, 'download', 'success');
  };

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              TELEMETRY ENGINE // HIGH RESOLUTION
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-tertiary font-mono px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              SIMULATED HISTORICAL DATASET
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            Energy Consumption & Power Quality Analytics
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl mt-1">
            Multi-tier analytical evaluation of active consumption profiles, maximum demand intervals, phase loading balance, and reactive power compensation envelopes.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Granularity Switcher */}
          <div className="inline-flex p-1 bg-surface-container-low rounded-lg border border-white/5 font-mono text-label-sm text-label-sm">
            {(['24h', '7d', '30d'] as Granularity[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`px-3 py-1.5 rounded transition-colors uppercase ${
                  granularity === g
                    ? 'bg-primary text-on-primary font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {g === '24h' ? 'Today (24H)' : g === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm font-mono shadow-sm border border-white/5"
          >
            <span className="material-symbols-outlined text-sm text-primary">download</span>
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Analytical KPI Strip (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Metric 1: Total Energy */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span>CUMULATIVE ENERGY (SIM)</span>
            <span className="material-symbols-outlined text-primary text-lg">bolt</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface">
                {totalEnergy.toFixed(1)}
              </span>
              <span className="text-primary font-headline-md text-headline-md">kWh</span>
            </div>
            <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm font-mono mt-0.5">
              <span className="material-symbols-outlined text-xs">trending_down</span>
              <span>-3.8% vs prior {granularity}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 text-outline font-label-sm text-label-sm font-mono flex justify-between">
            <span>Modeled Baseline:</span>
            <span className="text-on-surface font-semibold">{(totalEnergy * 1.04).toFixed(1)} kWh</span>
          </div>
        </div>

        {/* Metric 2: Peak Demand */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span>MAX PEAK DEMAND</span>
            <span className="material-symbols-outlined text-tertiary text-lg">electric_meter</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="font-headline-xl text-headline-xl font-bold text-tertiary">
                {maxDemand.toFixed(2)}
              </span>
              <span className="text-tertiary font-headline-md text-headline-md">kW</span>
            </div>
            <div className="text-on-surface-variant font-label-sm text-label-sm font-mono mt-0.5">
              Peak window: <strong className="text-on-surface">18:00 - 20:00 TOU</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 text-outline font-label-sm text-label-sm font-mono flex justify-between">
            <span>Load Factor (LF):</span>
            <span className="text-secondary font-semibold">
              {(totalEnergy / (maxDemand * (granularity === '24h' ? 24 : granularity === '7d' ? 168 : 720))).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metric 3: Power Factor */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span>AVERAGE POWER FACTOR</span>
            <span className="material-symbols-outlined text-secondary text-lg">speed</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="font-headline-xl text-headline-xl font-bold text-secondary">
                {avgPf}
              </span>
              <span className="text-on-surface-variant font-label-sm text-label-sm">cos φ</span>
            </div>
            <div className="flex items-center gap-1 text-secondary font-label-sm text-label-sm font-mono mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              <span>OPTIMAL (&gt;0.90 Regulatory Target)</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 text-outline font-label-sm text-label-sm font-mono flex justify-between">
            <span>VAR Penalty Risk:</span>
            <span className="text-secondary font-semibold">₹ 0.00 (Exempt)</span>
          </div>
        </div>

        {/* Metric 4: Phase Imbalance */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span>PHASE LOAD IMBALANCE</span>
            <span className="material-symbols-outlined text-outline text-lg">balance</span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface">
                {phaseUnbalancePercent}%
              </span>
              <span className="text-outline font-label-sm text-label-sm">ΔI/Iavg</span>
            </div>
            <div className="text-secondary font-label-sm text-label-sm font-mono mt-0.5">
              Nominal (&lt;10% IEC Threshold)
            </div>
          </div>
          <div className="pt-2 border-t border-white/5 text-outline font-label-sm text-label-sm font-mono flex justify-between">
            <span>Neutral Return Current:</span>
            <span className="text-primary font-semibold font-mono">0.18 A RMS</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart Module & Tabbed Telemetry Views */}
      <div className="rounded-xl bg-surface-container-low p-space-lg shadow-md border border-white/5 space-y-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-white/5 pb-space-sm">
          {/* Chart View Tabs */}
          <div className="inline-flex p-1 bg-surface-container-lowest rounded-lg border border-white/5 font-mono text-label-sm text-label-sm">
            <button
              type="button"
              onClick={() => setActiveTab('consumption')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'consumption'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">show_chart</span>
              <span>Demand & Consumption</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('power_factor')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'power_factor'
                  ? 'bg-secondary text-on-secondary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Power Factor & Reactive Q</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('phase_balance')}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 ${
                activeTab === 'phase_balance'
                  ? 'bg-tertiary text-on-tertiary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">pie_chart</span>
              <span>3-Phase Allocation</span>
            </button>
          </div>

          {/* Phase Filter (for consumption tab) */}
          <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span>Phase Scope:</span>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
              className="bg-surface-container px-2.5 py-1 rounded text-on-surface border border-white/10 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Phases (Aggregated)</option>
              <option value="phase_a">Phase A (Primary Feeder)</option>
              <option value="phase_b">Phase B (Server Cluster)</option>
              <option value="phase_c">Phase C (HVAC Chiller)</option>
            </select>
          </div>
        </div>

        {/* Vector SVG Telemetry Time Series Canvas */}
        <div className="relative w-full h-72 sm:h-80 bg-surface-container-lowest/60 rounded-xl p-space-md border border-white/5 flex flex-col justify-between overflow-hidden">
          {/* Background Grid & TOU Peak Shade */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 opacity-15">
            <div className="border-b border-white/20 w-full h-0"></div>
            <div className="border-b border-white/20 w-full h-0"></div>
            <div className="border-b border-white/20 w-full h-0"></div>
            <div className="border-b border-white/20 w-full h-0"></div>
          </div>

          {/* Canvas SVG */}
          <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 220">
            <defs>
              <linearGradient id="analyticsCyanGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="analyticsGreenGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#4edea3" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="analyticsAmberGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#ffb95f" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#ffb95f" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* View 1: Demand & Consumption */}
            {activeTab === 'consumption' && (
              <>
                <polygon
                  fill="url(#analyticsCyanGlow)"
                  points="20,180 90,160 160,170 230,140 300,110 370,95 440,70 510,65 580,120 650,140 720,130 780,110 780,210 20,210"
                />
                <path
                  d="M 20 180 Q 55 170 90 160 T 160 170 T 230 140 T 300 110 T 370 95 T 440 70 T 510 65 T 580 120 T 650 140 T 720 130 T 780 110"
                  fill="none"
                  stroke="#4cd7f6"
                  strokeWidth="2.5"
                />
                {/* Dots */}
                <circle cx="510" cy="65" fill="#4cd7f6" r="4.5" stroke="#0b1326" strokeWidth="2" />
                <text fill="#4cd7f6" fontFamily="JetBrains Mono" fontSize="10" x="518" y="60">
                  PEAK: {maxDemand.toFixed(2)} kW
                </text>
              </>
            )}

            {/* View 2: Power Factor & Reactive Q */}
            {activeTab === 'power_factor' && (
              <>
                {/* 0.90 Regulatory Threshold Line */}
                <line stroke="#ffb95f" strokeDasharray="4 4" strokeWidth="1" x1="20" x2="780" y1="120" y2="120" />
                <text fill="#ffb95f" fontFamily="JetBrains Mono" fontSize="9" x="30" y="115">
                  REGULATORY LIMIT (0.90 lag)
                </text>

                <polygon
                  fill="url(#analyticsGreenGlow)"
                  points="20,80 90,75 160,70 230,65 300,75 370,68 440,65 510,60 580,70 650,75 720,70 780,68 780,210 20,210"
                />
                <path
                  d="M 20 80 Q 55 77 90 75 T 160 70 T 230 65 T 300 75 T 370 68 T 440 65 T 510 60 T 580 70 T 650 75 T 720 70 T 780 68"
                  fill="none"
                  stroke="#4edea3"
                  strokeWidth="2.5"
                />
                <circle cx="510" cy="60" fill="#4edea3" r="4" />
                <text fill="#4edea3" fontFamily="JetBrains Mono" fontSize="10" x="518" y="55">
                  PF: 0.96 lag
                </text>
              </>
            )}

            {/* View 3: 3-Phase Multi-Line Allocation */}
            {activeTab === 'phase_balance' && (
              <>
                {/* Phase A - Cyan */}
                <path
                  d="M 20 120 Q 90 110 160 115 T 300 90 T 440 70 T 580 85 T 720 95 T 780 90"
                  fill="none"
                  stroke="#4cd7f6"
                  strokeWidth="2"
                />
                {/* Phase B - Emerald */}
                <path
                  d="M 20 145 Q 90 135 160 140 T 300 115 T 440 100 T 580 110 T 720 125 T 780 115"
                  fill="none"
                  stroke="#4edea3"
                  strokeWidth="2"
                />
                {/* Phase C - Amber */}
                <path
                  d="M 20 165 Q 90 160 160 162 T 300 140 T 440 130 T 580 140 T 720 150 T 780 145"
                  fill="none"
                  stroke="#ffb95f"
                  strokeWidth="2"
                />
              </>
            )}
          </svg>

          {/* Time Labels */}
          <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm font-mono pt-2 border-t border-white/5">
            {timeSeriesData.map((p, i) => (
              <span key={i} className={i % 2 === 0 ? 'text-on-surface' : 'hidden sm:inline'}>
                {p.timeLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono pt-2 border-t border-white/5 gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-primary rounded"></span>
              <span className="text-on-surface">Phase A Load (42%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-secondary rounded"></span>
              <span className="text-on-surface">Phase B Load (33%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-tertiary rounded"></span>
              <span className="text-on-surface">Phase C Load (25%)</span>
            </div>
          </div>
          <span className="text-tertiary font-semibold">
            All readings generated via synthetic physics model
          </span>
        </div>
      </div>

      {/* 4. Phase-Wise Detailed Telemetry Breakdown Table */}
      <div className="rounded-xl bg-surface-container-low shadow-md overflow-hidden border border-white/5">
        <div className="p-space-md bg-surface-container flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">account_tree</span>
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Multi-Phase Electrical Balance Matrix
            </h3>
          </div>
          <span className="font-label-sm text-label-sm font-mono text-secondary px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20">
            NOMINAL 3-PHASE DELTA
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono font-label-sm text-label-sm">
            <thead className="bg-surface-container-lowest text-outline border-b border-white/5 uppercase">
              <tr>
                <th className="py-3 px-4">PHASE FEED</th>
                <th className="py-3 px-4">VOLTAGE (V RMS)</th>
                <th className="py-3 px-4">CURRENT (A RMS)</th>
                <th className="py-3 px-4">ACTIVE POWER (W)</th>
                <th className="py-3 px-4">APPARENT (VA)</th>
                <th className="py-3 px-4">POWER FACTOR</th>
                <th className="py-3 px-4">THD HARMONIC</th>
                <th className="py-3 px-4 text-right">BALANCE STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-primary flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  Phase A (Incomer Primary)
                </td>
                <td className="py-3 px-4 text-on-surface">{reading.voltage.toFixed(1)} V</td>
                <td className="py-3 px-4 text-on-surface">{(reading.current * 0.42).toFixed(2)} A</td>
                <td className="py-3 px-4 text-primary font-bold">{(reading.power * 0.42).toFixed(0)} W</td>
                <td className="py-3 px-4 text-on-surface-variant">{(reading.apparentPower * 0.42).toFixed(0)} VA</td>
                <td className="py-3 px-4 text-secondary font-semibold">0.96 lag</td>
                <td className="py-3 px-4 text-on-surface-variant">2.1% THD</td>
                <td className="py-3 px-4 text-right text-secondary">BALANCED</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-secondary flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-secondary"></span>
                  Phase B (IT & Server Room)
                </td>
                <td className="py-3 px-4 text-on-surface">{(reading.voltage - 0.7).toFixed(1)} V</td>
                <td className="py-3 px-4 text-on-surface">{(reading.current * 0.33).toFixed(2)} A</td>
                <td className="py-3 px-4 text-secondary font-bold">{(reading.power * 0.33).toFixed(0)} W</td>
                <td className="py-3 px-4 text-on-surface-variant">{(reading.apparentPower * 0.33).toFixed(0)} VA</td>
                <td className="py-3 px-4 text-secondary font-semibold">0.95 lag</td>
                <td className="py-3 px-4 text-on-surface-variant">2.6% THD</td>
                <td className="py-3 px-4 text-right text-secondary">BALANCED</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors">
                <td className="py-3 px-4 font-semibold text-tertiary flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-tertiary"></span>
                  Phase C (HVAC Chiller Bay)
                </td>
                <td className="py-3 px-4 text-on-surface">{(reading.voltage + 1.2).toFixed(1)} V</td>
                <td className="py-3 px-4 text-on-surface">{(reading.current * 0.25).toFixed(2)} A</td>
                <td className="py-3 px-4 text-tertiary font-bold">{(reading.power * 0.25).toFixed(0)} W</td>
                <td className="py-3 px-4 text-on-surface-variant">{(reading.apparentPower * 0.25).toFixed(0)} VA</td>
                <td className="py-3 px-4 text-tertiary font-semibold">0.92 lag</td>
                <td className="py-3 px-4 text-on-surface-variant">3.4% THD</td>
                <td className="py-3 px-4 text-right text-tertiary">INDUCTIVE</td>
              </tr>
              <tr className="hover:bg-surface-container/50 transition-colors bg-surface-container-lowest/50">
                <td className="py-3 px-4 font-semibold text-outline flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-outline"></span>
                  Neutral Conductor (N)
                </td>
                <td className="py-3 px-4 text-outline">1.2 V (Earth Ref)</td>
                <td className="py-3 px-4 text-primary font-semibold">0.18 A</td>
                <td className="py-3 px-4 text-outline">0.2 W</td>
                <td className="py-3 px-4 text-outline">—</td>
                <td className="py-3 px-4 text-outline">—</td>
                <td className="py-3 px-4 text-outline">—</td>
                <td className="py-3 px-4 text-right text-secondary">SAFE &lt; 2A</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Technical Verification & Integrity Footer */}
      <div className="rounded-lg bg-surface-container-low px-space-md py-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-xs text-outline font-label-sm text-label-sm font-mono border border-white/5">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-sm text-tertiary">info</span>
          <span>DATA INTEGRITY: 100% MATHEMATICALLY SIMULATED • PENDING PHYSICAL PT/CT INTEGRATION</span>
        </div>
        <div className="text-on-surface-variant">VOLTIX ANALYTICS ENGINE v2.4</div>
      </div>
    </div>
  );
};
