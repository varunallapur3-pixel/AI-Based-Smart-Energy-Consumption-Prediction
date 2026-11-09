import React, { useState } from 'react';
import { getForecastData } from '../../services/aiService';

export const ForecastChart: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const points = getForecastData(timeframe);

  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg shadow-md flex flex-col justify-between border border-white/5">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm mb-space-md">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                Consumption Forecast: Actual vs. Predictive Trajectory
              </h3>
              <span className="px-2 py-0.5 rounded bg-tertiary/15 text-tertiary font-label-sm text-label-sm font-mono border border-tertiary/25">
                SYNTHETIC HEURISTIC REGRESSION (DEMO PROFILE)
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant font-mono mt-0.5">
              Simulated dual-stream telemetry: Continuous synthetic readings alongside mathematical extrapolation envelope (not a trained ML model)
            </p>
          </div>

          {/* Timeframe Filters */}
          <div className="inline-flex p-1 rounded-lg bg-surface-container-high shrink-0 font-label-sm text-label-sm font-mono border border-white/5">
            <button
              type="button"
              onClick={() => setTimeframe('24h')}
              className={`px-3 py-1 rounded transition-all ${
                timeframe === '24h'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Next 24H
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 rounded transition-all ${
                timeframe === '7d'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              7-Day Outlook
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 rounded transition-all ${
                timeframe === '30d'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              30-Day Cycle
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant font-label-sm text-label-sm font-mono pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-secondary rounded"></span>
            <span className="text-on-surface">Measured Actual (Past {timeframe === '24h' ? '24h' : 'Period'})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-primary"></span>
            <span className="text-primary font-semibold">Model Forecast (Forward Projection)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-2 bg-primary/15 rounded"></span>
            <span>Confidence Band (±5% Interval)</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="h-2 w-2 rounded-full bg-error"></span>
            <span className="text-error font-mono">TOU Tariff Peak (18:00 - 22:00)</span>
          </div>
        </div>

        {/* Vector Embedded Chart */}
        <div className="relative w-full h-72 sm:h-80 my-2 bg-surface-container-lowest/70 rounded-lg p-space-sm overflow-hidden flex flex-col justify-end border border-white/5">
          {/* Peak Tariff Shade */}
          <div className="absolute right-[22%] top-0 bottom-8 w-[16%] bg-error/10 pointer-events-none rounded border border-error/20">
            <div className="text-center font-label-sm text-label-sm text-error/80 pt-2 font-mono font-semibold">
              PEAK TARIFF
            </div>
          </div>

          <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 240">
            <defs>
              <linearGradient id="primaryForecastGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="actualForecastGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line stroke="#2d3449" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="40" y2="40" />
            <line stroke="#2d3449" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="90" y2="90" />
            <line stroke="#2d3449" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="140" y2="140" />
            <line stroke="#2d3449" strokeDasharray="3 3" strokeWidth="1" x1="0" x2="800" y1="190" y2="190" />

            {/* NOW Vertical Divider Line */}
            <line stroke="#dae2fd" strokeDasharray="4 4" strokeOpacity="0.3" strokeWidth="1.5" x1="360" x2="360" y1="10" y2="210" />
            <text fill="#dae2fd" fontFamily="JetBrains Mono" fontSize="10" opacity="0.8" x="365" y="24">
              T-ZERO (NOW)
            </text>

            {/* Confidence Band Polygon */}
            <polygon
              fill="url(#primaryForecastGlow)"
              points="360,118 420,95 480,70 540,55 600,100 660,110 720,80 780,120 780,170 720,130 660,155 600,145 540,115 480,125 420,145 360,118"
            />

            {/* Actual Past Line & Fill */}
            <polygon
              fill="url(#actualForecastGlow)"
              points="20,180 80,165 140,150 200,175 260,125 320,135 360,118 360,220 20,220"
            />
            <path
              d="M 20 180 Q 50 170 80 165 T 140 150 T 200 175 T 260 125 T 320 135 T 360 118"
              fill="none"
              stroke="#4edea3"
              strokeWidth="2.5"
            />

            {/* Actual Data Dots */}
            <circle cx="80" cy="165" fill="#4edea3" r="3.5" />
            <circle cx="140" cy="150" fill="#4edea3" r="3.5" />
            <circle cx="200" cy="175" fill="#4edea3" r="3.5" />
            <circle cx="260" cy="125" fill="#4edea3" r="3.5" />
            <circle cx="320" cy="135" fill="#4edea3" r="3.5" />
            <circle cx="360" cy="118" fill="#4cd7f6" r="5" stroke="#0b1326" strokeWidth="2" />

            {/* Predicted Forecast Line */}
            <path
              d="M 360 118 Q 390 105 420 120 T 480 98 T 540 85 T 600 122 T 660 132 T 720 105 T 780 145"
              fill="none"
              stroke="#4cd7f6"
              strokeDasharray="5 4"
              strokeWidth="2.5"
            />

            {/* Predicted Peak Highlight */}
            <circle cx="540" cy="85" fill="#ffb4ab" r="4.5" stroke="#690005" strokeWidth="2" />
            <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="10" fontWeight="600" x="548" y="80">
              PREDICTED PEAK: 2.8kW
            </text>
          </svg>

          {/* X-Axis Labels */}
          <div className="flex justify-between text-on-surface-variant font-label-sm text-label-sm font-mono pt-1">
            {points.map((pt) => (
              <span
                key={pt.timeLabel}
                className={pt.timeLabel.includes('NOW') ? 'text-primary font-semibold' : ''}
              >
                {pt.timeLabel}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Model Stats Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-space-sm font-mono text-on-surface-variant font-label-sm text-label-sm border-t border-surface-container-high/40">
        <div className="p-2 rounded bg-surface-container border border-white/5">
          <span className="text-outline block">Mean Abs Error (MAE)</span>
          <span className="text-on-surface font-semibold text-body-sm">0.082 kWh</span>
        </div>
        <div className="p-2 rounded bg-surface-container border border-white/5">
          <span className="text-outline block">Root MSE (RMSE)</span>
          <span className="text-on-surface font-semibold text-body-sm">0.114 kWh</span>
        </div>
        <div className="p-2 rounded bg-surface-container border border-white/5">
          <span className="text-outline block">Weather Normalization</span>
          <span className="text-secondary font-semibold text-body-sm">Active (+32°C Base)</span>
        </div>
        <div className="p-2 rounded bg-surface-container border border-white/5">
          <span className="text-outline block">Telemetry Ingest Rate</span>
          <span className="text-primary font-semibold text-body-sm">1.2k pts / sec (Sim Loop)</span>
        </div>
      </div>
    </div>
  );
};
