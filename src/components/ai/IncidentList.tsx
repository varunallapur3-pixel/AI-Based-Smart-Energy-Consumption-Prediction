import React, { useState } from 'react';
import { INITIAL_INCIDENTS } from '../../services/aiService';
import { AnomalyIncident, IncidentSeverity } from '../../types/ai';
import { useToast } from '../../contexts/ToastContext';

export const IncidentList: React.FC = () => {
  const [incidents, setIncidents] = useState<AnomalyIncident[]>(INITIAL_INCIDENTS);
  const [severityFilter, setSeverityFilter] = useState<'all' | IncidentSeverity>('all');
  const { showToast } = useToast();

  const handleAction = (incident: AnomalyIncident) => {
    if (incident.id === 'inc_01') {
      showToast('Emergency breaker reset command dispatched via ESP32 GPIO relay', 'restart_alt', 'success');
    } else if (incident.id === 'inc_02') {
      showToast('APFC capacitor bank stage 2 engaged. Target PF > 0.95', 'tune', 'success');
    } else {
      showToast('Incident acknowledged and archived to maintenance log', 'check_circle', 'info');
    }

    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incident.id ? { ...inc, acknowledged: true } : inc))
    );
  };

  const filteredIncidents = incidents.filter(
    (inc) => severityFilter === 'all' || inc.severity === severityFilter
  );

  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg shadow-md space-y-space-md border border-white/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pb-space-sm border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-2xl">warning</span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Real-Time Anomaly Detection & Fault Timeline
            </h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Automated threshold violations identified via residual z-score deviation from expected LSTM output.
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg font-label-sm text-label-sm font-mono border border-white/5">
          <button
            type="button"
            onClick={() => setSeverityFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              severityFilter === 'all'
                ? 'bg-surface-container-highest text-on-surface font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ALL ({incidents.length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('critical')}
            className={`px-2.5 py-1 rounded transition-colors ${
              severityFilter === 'critical'
                ? 'bg-surface-container-highest text-error font-semibold shadow-sm'
                : 'text-error hover:bg-surface-container-highest'
            }`}
          >
            CRITICAL ({incidents.filter((i) => i.severity === 'critical').length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('warning')}
            className={`px-2.5 py-1 rounded transition-colors ${
              severityFilter === 'warning'
                ? 'bg-surface-container-highest text-tertiary font-semibold shadow-sm'
                : 'text-tertiary hover:bg-surface-container-highest'
            }`}
          >
            WARNING ({incidents.filter((i) => i.severity === 'warning').length})
          </button>
          <button
            type="button"
            onClick={() => setSeverityFilter('info')}
            className={`px-2.5 py-1 rounded transition-colors ${
              severityFilter === 'info'
                ? 'bg-surface-container-highest text-primary font-semibold shadow-sm'
                : 'text-primary hover:bg-surface-container-highest'
            }`}
          >
            INFO ({incidents.filter((i) => i.severity === 'info').length})
          </button>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-space-sm">
        {filteredIncidents.length === 0 ? (
          <div className="py-8 text-center text-outline font-mono">
            No incidents found for current filter.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isCrit = incident.severity === 'critical';
            const isWarn = incident.severity === 'warning';

            return (
              <div
                key={incident.id}
                className="rounded-lg bg-surface-container p-space-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md transition-all hover:bg-surface-container-high border border-white/5"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded shrink-0 mt-0.5 ${
                      isCrit
                        ? 'bg-error-container text-error'
                        : isWarn
                        ? 'bg-tertiary-container/30 text-tertiary'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isCrit ? 'bolt' : isWarn ? 'speed' : 'nightlight'}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-mono font-semibold border ${
                          isCrit
                            ? 'bg-error/15 text-error border-error/20'
                            : isWarn
                            ? 'bg-tertiary/15 text-tertiary border-tertiary/20'
                            : 'bg-primary/15 text-primary border-primary/20'
                        }`}
                      >
                        {incident.badgeLabel}
                      </span>
                      <span className="font-body-md text-body-md font-semibold text-on-surface">
                        {incident.title}
                      </span>
                      <span className="text-outline font-label-sm text-label-sm font-mono">
                        • {incident.circuitTag}
                      </span>
                      <span className="text-outline font-label-sm text-label-sm font-mono">
                        • {incident.timestamp}
                      </span>
                    </div>

                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {incident.description}
                    </p>

                    {incident.autoActionText && (
                      <div
                        className={`flex items-center gap-2 mt-2 font-label-sm text-label-sm font-mono ${
                          isCrit ? 'text-secondary' : isWarn ? 'text-tertiary' : 'text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isCrit ? 'security_update_good' : isWarn ? 'tune' : 'schedule'}
                        </span>
                        <span>{incident.autoActionText}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => showToast(`Opening high-res telemetry buffer for ${incident.circuitTag}`, 'monitoring', 'info')}
                    className="px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm font-mono transition-colors border border-white/5"
                  >
                    INSPECT TRACE
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(incident)}
                    disabled={incident.acknowledged}
                    className={`px-3 py-1.5 rounded font-label-sm text-label-sm font-mono font-semibold transition-opacity ${
                      incident.acknowledged
                        ? 'bg-surface-container-high text-outline cursor-not-allowed'
                        : isCrit
                        ? 'bg-error text-on-error hover:opacity-90'
                        : isWarn
                        ? 'bg-tertiary text-on-tertiary hover:opacity-90'
                        : 'bg-surface-container-highest text-on-surface hover:bg-surface-bright'
                    }`}
                  >
                    {incident.acknowledged ? 'RESOLVED' : incident.actionButtonLabel}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
