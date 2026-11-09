import React from 'react';
import { DeviceNode } from '../../types/device';

interface DeviceInspectorProps {
  node: DeviceNode;
}

export const DeviceInspector: React.FC<DeviceInspectorProps> = ({ node }) => {
  return (
    <div className="rounded-xl bg-surface-container-low shadow-md p-space-md space-y-space-sm border border-white/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">pulse_alert</span>
          <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
            Emulated Node Probe: {node.id}
          </h3>
        </div>
        <span className="font-label-sm text-label-sm font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
          SIMULATED STREAM
        </span>
      </div>

      {/* Sparkline Canvas Area */}
      <div className="h-28 w-full bg-surface-container-lowest rounded-lg p-2 flex flex-col justify-between overflow-hidden relative border border-white/5">
        <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono z-10">
          <span>SYNTHETIC SAMPLES (LAST 60s)</span>
          <span className="text-primary font-bold">{node.powerWatts.toFixed(1)} W</span>
        </div>

        {/* Vector SVG Sparkline */}
        <svg
          className="w-full h-16 text-primary mt-1"
          preserveAspectRatio="none"
          viewBox="0 0 300 60"
        >
          <defs>
            <linearGradient id="sparklineDrawerGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d="M0,45 Q15,40 30,42 T60,35 T90,38 T120,25 T150,28 T180,20 T210,30 T240,22 T270,18 T300,24 L300,60 L0,60 Z"
            fill="url(#sparklineDrawerGrad)"
          />
          <path
            d="M0,45 Q15,40 30,42 T60,35 T90,38 T120,25 T150,28 T180,20 T210,30 T240,22 T270,18 T300,24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Inspector Specs Grid */}
      <div className="grid grid-cols-2 gap-2 text-on-surface-variant font-mono font-label-sm text-label-sm">
        <div className="p-2 bg-surface-container rounded border border-white/5">
          <div className="text-outline">AC VOLTAGE</div>
          <div className="text-on-surface font-semibold text-body-md">{node.voltageV.toFixed(1)} V RMS</div>
        </div>
        <div className="p-2 bg-surface-container rounded border border-white/5">
          <div className="text-outline">LINE CURRENT</div>
          <div className="text-on-surface font-semibold text-body-md">{node.currentA.toFixed(2)} A</div>
        </div>
        <div className="p-2 bg-surface-container rounded border border-white/5">
          <div className="text-outline">POWER FACTOR</div>
          <div className="text-on-surface font-semibold text-body-md">{node.powerFactor.toFixed(2)} LAG</div>
        </div>
        <div className="p-2 bg-surface-container rounded border border-white/5">
          <div className="text-outline">CT RATIO CAL</div>
          <div className="text-secondary font-semibold text-body-md">1.000 (Nominal)</div>
        </div>
      </div>
    </div>
  );
};
