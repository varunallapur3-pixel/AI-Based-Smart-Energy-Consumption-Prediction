import React from 'react';
import { useTelemetry } from '../../contexts/TelemetryContext';

interface OscilloscopeProps {
  onExportJson?: () => void;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({ onExportJson }) => {
  const {
    oscilloscopeBuffer,
    isStreaming,
    toggleStreaming,
    clearBuffer,
    reading,
  } = useTelemetry();

  const svgWidth = 800;
  const svgHeight = 240;

  // Power scale: 300W to 900W
  const minP = 300;
  const maxP = 900;
  const pToY = (val: number) => {
    const clamped = Math.max(minP, Math.min(maxP, val));
    return svgHeight - ((clamped - minP) / (maxP - minP)) * svgHeight;
  };

  // Voltage scale: 220V to 240V
  const minV = 220;
  const maxV = 240;
  const vToY = (val: number) => {
    const clamped = Math.max(minV, Math.min(maxV, val));
    return svgHeight - ((clamped - minV) / (maxV - minV)) * svgHeight;
  };

  const stepX = svgWidth / Math.max(1, oscilloscopeBuffer.length - 1);

  const pPoints: string[] = [];
  const vPoints: string[] = [];

  oscilloscopeBuffer.forEach((pt, i) => {
    const x = (i * stepX).toFixed(1);
    const yP = pToY(pt.power).toFixed(1);
    const yV = vToY(pt.voltage).toFixed(1);
    pPoints.push(`${x},${yP}`);
    vPoints.push(`${x},${yV}`);
  });

  const pD = pPoints.length ? `M ${pPoints.join(' L ')}` : '';
  const vD = vPoints.length ? `M ${vPoints.join(' L ')}` : '';
  const pPolygon = pPoints.length ? `0,${svgHeight} ${pPoints.join(' ')} ${svgWidth},${svgHeight}` : '';
  const vPolygon = vPoints.length ? `0,${svgHeight} ${vPoints.join(' ')} ${svgWidth},${svgHeight}` : '';

  const lastPoint = oscilloscopeBuffer[oscilloscopeBuffer.length - 1] || { power: 575.4, voltage: 230.1 };
  const lastP_Y = pToY(lastPoint.power);
  const lastV_Y = vToY(lastPoint.voltage);

  return (
    <div className="bg-surface-container-low/95 p-space-md rounded-xl shadow-md flex flex-col gap-space-md border border-white/5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">insights</span>
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tracking-tight">
              Real-Time Waveform & Load Dynamics
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Dual-trace telemetry buffer (Active Power [W] & Voltage RMS [V]) sampled via ESP32 WebSocket feed.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container-highest font-mono font-label-sm text-label-sm text-on-surface">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span>BUFFER: 60s / 1000ms</span>
          </div>
          <button
            type="button"
            onClick={toggleStreaming}
            className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-primary">
              {isStreaming ? 'pause' : 'play_arrow'}
            </span>
            <span>{isStreaming ? 'Pause Buffer' : 'Resume Stream'}</span>
          </button>
          <button
            type="button"
            onClick={clearBuffer}
            className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-outline">delete_sweep</span>
            <span>Clear</span>
          </button>
          {onExportJson && (
            <button
              type="button"
              onClick={onExportJson}
              className="px-3 py-1.5 rounded bg-primary-container hover:bg-primary text-on-primary-container font-label-sm text-label-sm font-mono font-semibold flex items-center gap-1 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Export Raw JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Scope Screen Legend */}
      <div className="flex items-center justify-between font-mono font-label-sm text-label-sm px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-primary rounded-sm inline-block"></span>
            <span className="text-primary font-semibold">Active Power (300W - 900W scale)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 bg-secondary rounded-sm inline-block"></span>
            <span className="text-secondary font-semibold">Voltage RMS (220V - 240V scale)</span>
          </div>
        </div>
        <div className="text-outline hidden sm:block">Grid: 100W / Div • T-Scale: 5s / Div</div>
      </div>

      {/* Canvas Scope Backdrop & Waves */}
      <div className="relative w-full h-72 sm:h-80 bg-surface-container-lowest rounded-lg overflow-hidden flex flex-col justify-between p-3 border border-white/5">
        {/* SVG Grid Lines Pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="scopeGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-outline-variant" />
              <circle cx="20" cy="20" r="0.75" fill="currentColor" className="text-outline" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#scopeGridPattern)" />
        </svg>

        {/* Dynamic Live SVG Waveform Curves */}
        <svg
          className="absolute inset-0 w-full h-full p-2"
          preserveAspectRatio="none"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          <defs>
            <linearGradient id="powerGradScope" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="voltGradScope" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Voltage Area & Stroke */}
          <polygon fill="url(#voltGradScope)" points={vPolygon} />
          <path
            d={vD}
            fill="none"
            stroke="#4edea3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Power Area & Stroke */}
          <polygon fill="url(#powerGradScope)" points={pPolygon} />
          <path
            d={pD}
            fill="none"
            stroke="#4cd7f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Tracking Pin Markers */}
          <circle cx={svgWidth} cy={lastP_Y} r="4.5" fill="#4cd7f6" className="animate-pulse" />
          <circle cx={svgWidth} cy={lastV_Y} r="4" fill="#4edea3" />
        </svg>

        {/* Live Annotations */}
        <div className="relative z-10 flex justify-between items-start pointer-events-none">
          <div className="px-2 py-1 rounded bg-surface-container-high/80 backdrop-blur font-mono font-label-sm text-label-sm text-primary flex items-center gap-1.5 border border-primary/20">
            <span className="material-symbols-outlined text-xs">analytics</span>
            <span>
              LIVE CH1: P(W) = <span className="font-bold">{reading.power.toFixed(1)} W</span>
            </span>
          </div>
          <div className="px-2 py-1 rounded bg-surface-container-high/80 backdrop-blur font-mono font-label-sm text-label-sm text-secondary flex items-center gap-1.5 border border-secondary/20">
            <span className="material-symbols-outlined text-xs">offline_bolt</span>
            <span>
              LIVE CH2: V(RMS) = <span className="font-bold">{reading.voltage.toFixed(1)} V</span>
            </span>
          </div>
        </div>

        {/* X-Axis Time Ticks */}
        <div className="relative z-10 flex justify-between items-end pointer-events-none font-mono font-label-sm text-label-sm text-outline">
          <span>-60s T_OFFSET</span>
          <span>-45s</span>
          <span>-30s</span>
          <span>-15s</span>
          <span className="text-secondary font-bold">0s (NOW)</span>
        </div>
      </div>
    </div>
  );
};
