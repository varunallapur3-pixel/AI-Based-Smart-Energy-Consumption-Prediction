import React from 'react';
import { useTelemetry } from '../../contexts/TelemetryContext';

interface TelemetryModeIndicatorProps {
  className?: string;
  showToggle?: boolean;
}

export const TelemetryModeIndicator: React.FC<TelemetryModeIndicatorProps> = ({
  className = '',
  showToggle = true,
}) => {
  const { streamMode, setStreamMode } = useTelemetry();
  const isLive = streamMode === 'LIVE';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showToggle ? (
        <div className="flex items-center bg-surface-container-lowest p-1 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => setStreamMode('LIVE')}
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm font-mono transition-all flex items-center gap-1.5 ${
              isLive
                ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-secondary' : 'bg-outline'}`}></span>
            </span>
            <span>LIVE HARDWARE</span>
          </button>
          <button
            type="button"
            onClick={() => setStreamMode('SIMULATION')}
            className={`px-3 py-1.5 rounded font-label-sm text-label-sm font-mono transition-all flex items-center gap-1.5 ${
              !isLive
                ? 'bg-tertiary-container text-on-tertiary-container font-semibold shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>SIMULATION</span>
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono font-label-sm text-label-sm border ${
            isLive
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-tertiary/10 text-tertiary border-tertiary/20'
          }`}
        >
          <span className="material-symbols-outlined text-sm">{isLive ? 'bolt' : 'tune'}</span>
          <span>{isLive ? 'LIVE HARDWARE (ESP32-GW)' : 'SYNTHETIC SIMULATION'}</span>
        </div>
      )}
    </div>
  );
};
