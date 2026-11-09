import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = 'Synchronizing real-time telemetry feed from RS485/Modbus bridge...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-xl bg-surface-container-low/50 border border-white/5">
      <div className="relative flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">cyclone</span>
      </div>
      <div className="space-y-1">
        <div className="font-headline-md text-headline-md text-on-surface font-semibold">
          Ingesting Sensor Telemetry
        </div>
        <p className="font-mono text-label-sm text-label-sm text-on-surface-variant max-w-md">
          {message}
        </p>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title = 'No Data Available',
  description = 'No sensor telemetry records matched the current filter criteria.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 rounded-xl bg-surface-container-low/50 border border-dashed border-outline-variant/60">
      <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline">
        <span className="material-symbols-outlined text-3xl">inbox</span>
      </div>
      <div className="space-y-1">
        <div className="font-headline-md text-headline-md text-on-surface font-semibold">{title}</div>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:bg-primary-fixed transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const OfflineBanner: React.FC<{ onReconnect?: () => void }> = ({ onReconnect }) => {
  return (
    <div className="p-space-md rounded-xl bg-error-container/20 border border-error/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-error/20 flex items-center justify-center text-error shrink-0">
          <span className="material-symbols-outlined text-2xl">wifi_off</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm font-mono font-semibold text-error uppercase">
              HARDWARE TELEMETRY LINK OFFLINE
            </span>
            <span className="h-2 w-2 rounded-full bg-error"></span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            WebSocket connection to <code className="font-mono text-primary">ws://internal.voltix:8080/pzem</code> timed out. Displaying cached telemetry state.
          </p>
        </div>
      </div>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="px-3.5 py-1.5 rounded-lg bg-error text-on-error font-label-sm text-label-sm font-mono font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          RETRY LINK
        </button>
      )}
    </div>
  );
};

export const ErrorAlert: React.FC<{ message: string; onDismiss?: () => void }> = ({
  message,
  onDismiss,
}) => {
  return (
    <div className="p-space-md rounded-xl bg-error-container/20 border border-error/40 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">report_problem</span>
        <div>
          <span className="font-label-sm text-label-sm font-mono text-error font-semibold uppercase">
            System Fault Detected
          </span>
          <p className="font-body-sm text-body-sm text-on-surface mt-0.5">{message}</p>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-on-surface-variant hover:text-on-surface p-1"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      )}
    </div>
  );
};
