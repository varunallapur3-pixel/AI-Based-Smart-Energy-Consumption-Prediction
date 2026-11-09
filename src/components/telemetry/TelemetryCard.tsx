import React from 'react';

interface TelemetryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  iconColorClass?: string;
  valueColorClass?: string;
  badgeText?: string;
  badgeColorClass?: string;
  badgeIcon?: string;
  footerLabel?: string;
  footerValue?: string;
  footerValueClass?: string;
  progressPercent?: number;
  progressBarClass?: string;
  customFooter?: React.ReactNode;
  className?: string;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  title,
  value,
  unit,
  icon,
  iconColorClass = 'bg-primary/10 text-primary',
  valueColorClass = 'text-on-surface',
  badgeText,
  badgeColorClass = 'text-secondary',
  badgeIcon,
  footerLabel,
  footerValue,
  footerValueClass = 'text-on-surface',
  progressPercent,
  progressBarClass = 'bg-primary',
  customFooter,
  className = '',
}) => {
  return (
    <div
      className={`relative bg-surface-container-low p-space-md rounded-xl shadow-sm hover:shadow-cyan-900/10 transition-all flex flex-col justify-between overflow-hidden border border-white/[0.03] group ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          {title}
        </span>
        <span className={`p-1 rounded ${iconColorClass}`}>
          <span className="material-symbols-outlined text-base">{icon}</span>
        </span>
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-headline-lg text-headline-lg font-mono font-bold tracking-tight ${valueColorClass}`}
          >
            {value}
          </span>
          {unit && (
            <span className="font-label-lg text-label-lg font-mono text-on-surface-variant">
              {unit}
            </span>
          )}
        </div>

        {badgeText && (
          <div className={`flex items-center gap-1 font-label-sm text-label-sm font-mono mt-0.5 ${badgeColorClass}`}>
            {badgeIcon && <span className="material-symbols-outlined text-xs">{badgeIcon}</span>}
            <span>{badgeText}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {customFooter ? (
        <div className="pt-2">{customFooter}</div>
      ) : (
        <div className="pt-2">
          {(footerLabel || footerValue) && (
            <div className="flex justify-between items-center text-outline-variant font-label-sm text-label-sm font-mono mb-1">
              <span>{footerLabel}</span>
              <span className={footerValueClass}>{footerValue}</span>
            </div>
          )}
          {typeof progressPercent === 'number' && (
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
