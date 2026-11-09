import React from 'react';
import { SubPanelDistribution } from '../../types/telemetry';

interface CircuitDistributionProps {
  distribution: SubPanelDistribution[];
  totalKw?: string;
  variant?: 'donut' | 'bars';
}

export const CircuitDistribution: React.FC<CircuitDistributionProps> = ({
  distribution,
  totalKw = '3.42',
  variant = 'donut',
}) => {
  if (variant === 'bars') {
    return (
      <div className="space-y-space-md">
        {distribution.map((item) => (
          <div key={item.id} className="p-3 rounded-lg bg-surface-container border border-white/5">
            <div className="flex items-center justify-between text-on-surface font-body-sm text-body-sm mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                ></span>
                {item.name}
              </span>
              <span className="font-mono font-semibold" style={{ color: item.color }}>
                {item.percentage}% ({item.watts}W)
              </span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-outline font-label-sm text-label-sm font-mono mt-1">
              <span>Allocated Load</span>
              <span className="text-secondary font-medium">Nominal Operating Range</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Donut view (from Overview Dashboard)
  return (
    <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-space-md py-2">
      {/* Donut Visual SVG */}
      <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* Background track */}
          <circle cx="18" cy="18" fill="none" r="15.915" stroke="#222a3d" strokeWidth="4" />
          {/* HVAC: 42% (Cyan) */}
          <circle
            cx="18"
            cy="18"
            fill="none"
            r="15.915"
            stroke="#4cd7f6"
            strokeDasharray="42 58"
            strokeDashoffset="0"
            strokeWidth="4.2"
          />
          {/* Server Lab: 28% (Emerald) */}
          <circle
            cx="18"
            cy="18"
            fill="none"
            r="15.915"
            stroke="#4edea3"
            strokeDasharray="28 72"
            strokeDashoffset="-42"
            strokeWidth="4.2"
          />
          {/* Lighting: 18% (Amber) */}
          <circle
            cx="18"
            cy="18"
            fill="none"
            r="15.915"
            stroke="#ffb95f"
            strokeDasharray="18 82"
            strokeDashoffset="-70"
            strokeWidth="4.2"
          />
          {/* Ancillary: 12% (Muted) */}
          <circle
            cx="18"
            cy="18"
            fill="none"
            r="15.915"
            stroke="#869397"
            strokeDasharray="12 88"
            strokeDashoffset="-88"
            strokeWidth="4.2"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-label-lg text-label-lg font-mono font-bold text-on-surface">
            {totalKw}
          </span>
          <span className="font-label-sm text-label-sm font-mono text-outline">kW TOT</span>
        </div>
      </div>

      {/* Legends & Circuit Readings */}
      <div className="w-full flex-1 space-y-2">
        {distribution.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-1.5 rounded bg-surface-container/50 border border-white/5"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className="font-body-sm text-body-sm text-on-surface">{item.name}</span>
            </div>
            <div className="font-label-sm text-label-sm font-mono text-right">
              <span className="text-on-surface font-semibold">{item.watts.toLocaleString()} W</span>
              <span className="text-outline-variant ml-1">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
