import React, { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { ForecastChart } from '../components/ai/ForecastChart';
import { IncidentList } from '../components/ai/IncidentList';
import { RecommendationList } from '../components/ai/RecommendationList';

export const AiPredictionsPage: React.FC = () => {
  const { showToast } = useToast();
  const [isInferencing, setIsInferencing] = useState(false);
  const [modelConfidence, setModelConfidence] = useState(94.8);

  const handleForceInference = () => {
    setIsInferencing(true);
    showToast('Recalculating synthetic regression projection envelope...', 'sync', 'info');
    setTimeout(() => {
      setIsInferencing(false);
      setModelConfidence(95.4);
      showToast('Synthetic forecast curve refreshed (simulated profile baseline).', 'check_circle', 'success');
    }, 1200);
  };

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* 1. TOP SECTION: ML ENGINE TELEMETRY STATUS BANNER */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-md border border-white/5">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-space-md">
          <div className="space-y-space-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-tertiary/15 text-tertiary font-label-sm text-label-sm font-mono tracking-wider border border-tertiary/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
                </span>
                SIMULATED FORECAST: SYNTHETIC MODEL
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-mono border border-primary/20">
                Synthetic Waveform Extrapolator (Demo Baseline)
              </span>
              <span className="text-outline font-label-sm text-label-sm font-mono">
                Heuristic Curve Fit
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Predictive Intelligence & Synthetic Forecasting Suite
            </h2>

            <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl">
              Statistical heuristic extrapolation simulating multi-hour circuit dynamics, ambient temperatures, and utility tariff matrices. <strong className="text-tertiary">Important:</strong> All predictions and confidence envelopes are generated from synthetic baseline profiles. They do NOT represent a trained production machine learning model or physical hardware telemetry.
            </p>
          </div>

          {/* Model Stats Gauge Pill */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-sm bg-surface-container/60 backdrop-blur-md p-space-sm rounded-lg shrink-0 w-full xl:w-auto border border-white/5">
            <div className="flex items-center gap-3 px-space-sm py-1">
              <div className="relative flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle
                    className="text-surface-container-high"
                    cx="24"
                    cy="24"
                    fill="transparent"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <circle
                    className="text-primary transition-all duration-700"
                    cx="24"
                    cy="24"
                    fill="transparent"
                    r="20"
                    stroke="currentColor"
                    strokeDasharray="125.6"
                    strokeDashoffset={125.6 - (125.6 * modelConfidence) / 100}
                    strokeWidth="3"
                  />
                </svg>
                <span className="absolute font-label-md text-label-md font-mono text-on-surface font-semibold">
                  {modelConfidence}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Curve Fit Quality
                </span>
                <span className="font-body-sm text-body-sm text-secondary font-mono font-medium">
                  Synthetic (±0.42σ)
                </span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-surface-container-highest"></div>

            <div className="flex flex-col px-space-sm py-1 font-mono">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Profile Sync
              </span>
              <span className="font-body-sm text-body-sm text-on-surface font-semibold">
                Sim Loop
              </span>
              <span className="font-label-sm text-label-sm text-primary">Virtual Baseline</span>
            </div>

            <button
              type="button"
              onClick={handleForceInference}
              disabled={isInferencing}
              className="ml-auto xl:ml-2 px-3 py-2 rounded bg-primary text-on-primary font-label-sm text-label-sm font-mono font-semibold hover:bg-primary-fixed transition-all flex items-center gap-1 shadow-sm border border-primary/30"
            >
              <span
                className={`material-symbols-outlined text-base ${
                  isInferencing ? 'animate-spin' : ''
                }`}
              >
                {isInferencing ? 'refresh' : 'sync'}
              </span>
              <span>{isInferencing ? 'CALCULATING...' : 'REFRESH FORECAST'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PREDICTIVE KPI METRICS ROW (4 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* KPI 1 */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all border border-white/5">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono mb-2">
            <span>NEXT-DAY DEMAND FORECAST</span>
            <span className="material-symbols-outlined text-primary text-lg">auto_graph</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold font-mono">
              18.4
            </span>
            <span className="font-headline-md text-headline-md text-primary font-mono">kWh</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span className="text-secondary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">trending_down</span>
              -4.1% vs weekday
            </span>
            <span className="text-on-surface-variant/80">±0.8 kWh bound</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '68%' }}></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all border border-white/5">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono mb-2">
            <span>7-DAY CUMULATIVE OUTLOOK</span>
            <span className="material-symbols-outlined text-secondary text-lg">date_range</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold font-mono">
              124.6
            </span>
            <span className="font-headline-md text-headline-md text-secondary font-mono">kWh</span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span className="text-on-surface font-semibold">₹ 934.50</span>
            <span className="text-outline">Est. base tariff</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-secondary h-full rounded-full" style={{ width: '52%' }}></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all border border-white/5">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono mb-2">
            <span>PROJECTED MONTH-END BILL</span>
            <span className="material-symbols-outlined text-tertiary text-lg">payments</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-xl text-headline-xl text-tertiary tracking-tight font-bold font-mono">
              ₹ 2,110
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span className="text-secondary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-sm">savings</span>
              -₹240 saved
            </span>
            <span className="text-outline">vs ₹2,350 prior</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-tertiary h-full rounded-full" style={{ width: '78%' }}></div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden group hover:bg-surface-container transition-all border border-white/5">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono mb-2">
            <span>PEAK DEMAND WINDOW</span>
            <span className="material-symbols-outlined text-error text-lg">electric_meter</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold font-mono">
              14:00 - 16:30
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 text-on-surface-variant font-label-sm text-label-sm font-mono">
            <span className="text-error font-medium">Spike: ~2.8 kW</span>
            <span className="text-outline truncate">HVAC cycle load</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-error h-full rounded-full" style={{ width: '86%' }}></div>
          </div>
        </div>
      </div>

      {/* 3. MAIN DUAL-CHART FORECAST & SUB-CIRCUIT LOAD DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* 8 COLUMNS: ACTUAL VS PREDICTED TIME SERIES FORECAST */}
        <div className="lg:col-span-8">
          <ForecastChart />
        </div>

        {/* 4 COLUMNS: SUB-CIRCUIT LOAD SPLIT */}
        <div className="lg:col-span-4 rounded-xl bg-surface-container-low p-space-lg shadow-md flex flex-col justify-between space-y-space-md border border-white/5">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Sub-Circuit Load Split
              </h3>
              <span className="material-symbols-outlined text-outline text-xl">device_hub</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Real-time measured share vs ML predicted allocations for current diurnal quadrant.
            </p>

            <div className="space-y-space-md mt-space-md">
              {/* Circuit 1 */}
              <div className="p-3 rounded-lg bg-surface-container border border-white/5">
                <div className="flex items-center justify-between text-on-surface font-body-sm text-body-sm mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
                    HVAC & Chiller Circuit #2
                  </span>
                  <span className="font-mono text-primary font-semibold">46% (1,076W)</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '46%' }}></div>
                </div>
                <div className="flex justify-between items-center text-outline font-label-sm text-label-sm font-mono mt-1">
                  <span>Pred. drift: +18%</span>
                  <span className="text-error font-medium">Anomaly alert active</span>
                </div>
              </div>

              {/* Circuit 2 */}
              <div className="p-3 rounded-lg bg-surface-container border border-white/5">
                <div className="flex items-center justify-between text-on-surface font-body-sm text-body-sm mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
                    Server Room / Phase B
                  </span>
                  <span className="font-mono text-secondary font-semibold">28% (655W)</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '28%' }}></div>
                </div>
                <div className="flex justify-between items-center text-outline font-label-sm text-label-sm font-mono mt-1">
                  <span>Pred. drift: -2%</span>
                  <span className="text-tertiary">Cos φ = 0.71 lag</span>
                </div>
              </div>

              {/* Circuit 3 */}
              <div className="p-3 rounded-lg bg-surface-container border border-white/5">
                <div className="flex items-center justify-between text-on-surface font-body-sm text-body-sm mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-tertiary"></span>
                    Lighting & Lab Workstations
                  </span>
                  <span className="font-mono text-tertiary font-semibold">18% (421W)</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-tertiary h-full rounded-full" style={{ width: '18%' }}></div>
                </div>
                <div className="flex justify-between items-center text-outline font-label-sm text-label-sm font-mono mt-1">
                  <span>Pred. drift: ±0%</span>
                  <span className="text-secondary">Optimal schedule</span>
                </div>
              </div>

              {/* Circuit 4 */}
              <div className="p-3 rounded-lg bg-surface-container border border-white/5">
                <div className="flex items-center justify-between text-on-surface font-body-sm text-body-sm mb-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-outline"></span>
                    Auxiliary & Passive Phantom
                  </span>
                  <span className="font-mono text-outline font-semibold">8% (187W)</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                  <div className="bg-outline h-full rounded-full" style={{ width: '8%' }}></div>
                </div>
                <div className="flex justify-between items-center text-outline font-label-sm text-label-sm font-mono mt-1">
                  <span>Pred. drift: +4%</span>
                  <span className="text-on-surface-variant">Standby creep</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-surface-container-high/60 p-3 font-mono text-label-sm text-label-sm flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm text-primary">router</span>
              <span>ESP32-S3 Nodes Modeled: 4/4 (Emulated)</span>
            </div>
            <span className="text-tertiary font-semibold">SIMULATED NOMINAL</span>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME ANOMALY DETECTION & FAULT TIMELINE */}
      <IncidentList />

      {/* 5. PRESCRIPTIVE AI RECOMMENDATIONS */}
      <RecommendationList />

      {/* 6. TECHNICAL INFRASTRUCTURE AUDIT BAR */}
      <div className="rounded-lg bg-surface-container-low px-space-md py-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-xs text-outline font-label-sm text-label-sm font-mono border border-white/5">
        <div className="flex items-center gap-4 flex-wrap">
          <span>INFERENCE RUNTIME: Synthetic LSTM Micro Baseline</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">QUANTIZATION: Emulated INT8 Weights</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">MQTT TOPIC: voltix/sim/telemetry/forecast</span>
        </div>
        <div className="text-on-surface-variant">
          VOLTIX SIM ENGINE v2.4 (PHYSICAL HW PENDING)
        </div>
      </div>
    </div>
  );
};
