import React, { useState } from 'react';
import { AnomalyIncident, IncidentSeverity } from '../types/ai';
import { INITIAL_INCIDENTS } from '../services/aiService';
import { useToast } from '../contexts/ToastContext';
import { useTelemetry } from '../contexts/TelemetryContext';

export const AlertsNotificationsPage: React.FC = () => {
  const { showToast } = useToast();
  const { reading } = useTelemetry();

  const [incidents, setIncidents] = useState<AnomalyIncident[]>(INITIAL_INCIDENTS);
  const [severityFilter, setSeverityFilter] = useState<'all' | IncidentSeverity>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAcknowledge = (id: string, title: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, acknowledged: true } : inc))
    );
    showToast(`Acknowledged incident: ${title}`, 'check_circle', 'info');
  };

  const handleResolveAction = (id: string, actionName: string) => {
    setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    showToast(`[SIMULATION] Executed simulated action '${actionName}'. Incident resolved.`, 'verified', 'success');
  };

  const handleSimulateSurge = () => {
    const newInc: AnomalyIncident = {
      id: `inc_sim_${Date.now()}`,
      severity: 'critical',
      badgeLabel: 'SIMULATED OVERVOLTAGE SPIKE',
      title: 'Transient 264.2V Line Surge Simulated',
      circuitTag: 'Phase A Feeder (Simulated)',
      timestamp: new Date().toLocaleTimeString(),
      description: `Simulated transient voltage excursion: 264.2V RMS detected on Phase A (Grid standard limit: 253V). Virtual fast-clamp arrestor triggered.`,
      measuredWatts: +(reading.power * 1.5).toFixed(0),
      baselineWatts: +(reading.power).toFixed(0),
      autoActionText: 'Simulated protection trigger: Virtual Opto-Relay notified.',
      actionButtonLabel: 'RESET SURGE CLAMP',
      actionButtonType: 'error',
      acknowledged: false,
    };

    setIncidents((prev) => [newInc, ...prev]);
    showToast('Injected simulated transient surge incident into alert stream!', 'warning', 'warning');
  };

  const filtered = incidents.filter((inc) => {
    const matchesSev = severityFilter === 'all' || inc.severity === severityFilter;
    const matchesSearch =
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.circuitTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSev && matchesSearch;
  });

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const warningCount = incidents.filter((i) => i.severity === 'warning').length;
  const infoCount = incidents.filter((i) => i.severity === 'info').length;

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* 1. Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              SAFETY SUBSYSTEM // REAL-TIME DISPATCH
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-tertiary font-mono px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              SIMULATED FAULT DETECTOR ACTIVE
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            Alerts & Real-Time Incident Notifications
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl mt-1">
            Real-time and historical telemetry incident stream: overvoltage spikes, virtual breaker trips, power factor degradations, and radio link RF dropouts.
          </p>
        </div>

        {/* Global Action Cluster */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={handleSimulateSurge}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-tertiary font-mono text-label-sm text-label-sm border border-tertiary/30 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">flash_on</span>
            <span>SIMULATE TEST SURGE</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIncidents((prev) => prev.map((i) => ({ ...i, acknowledged: true })));
              showToast('Acknowledged all active incidents in simulation log', 'done_all', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-mono text-label-sm text-label-sm border border-white/5 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-sm text-primary">done_all</span>
            <span>ACKNOWLEDGE ALL</span>
          </button>
        </div>
      </div>

      {/* 2. Incident Summary Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5 flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              TOTAL ALARMS
            </span>
            <span className="font-headline-lg text-headline-lg font-bold font-mono text-on-surface mt-1 block">
              {incidents.length}
            </span>
          </div>
          <span className="material-symbols-outlined text-2xl text-outline">notifications</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5 flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm font-mono text-error uppercase block">
              CRITICAL SPIKES
            </span>
            <span className="font-headline-lg text-headline-lg font-bold font-mono text-error mt-1 block">
              {criticalCount}
            </span>
          </div>
          <span className="material-symbols-outlined text-2xl text-error">dangerous</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5 flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm font-mono text-tertiary uppercase block">
              WARNING FAULTS
            </span>
            <span className="font-headline-lg text-headline-lg font-bold font-mono text-tertiary mt-1 block">
              {warningCount}
            </span>
          </div>
          <span className="material-symbols-outlined text-2xl text-tertiary">warning</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5 flex items-center justify-between">
          <div>
            <span className="font-label-sm text-label-sm font-mono text-primary uppercase block">
              SYSTEM INFORMATIONAL
            </span>
            <span className="font-headline-lg text-headline-lg font-bold font-mono text-primary mt-1 block">
              {infoCount}
            </span>
          </div>
          <span className="material-symbols-outlined text-2xl text-primary">info</span>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm">
        {/* Severity Tabs */}
        <div className="inline-flex p-1 bg-surface-container-lowest rounded-lg border border-white/5 font-mono text-label-sm text-label-sm">
          {(
            [
              { id: 'all', label: `All (${incidents.length})` },
              { id: 'critical', label: `Critical (${criticalCount})` },
              { id: 'warning', label: `Warnings (${warningCount})` },
              { id: 'info', label: `Info (${infoCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSeverityFilter(tab.id)}
              className={`px-3 py-1.5 rounded transition-all uppercase ${
                severityFilter === tab.id
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search incident, circuit, message..."
            className="w-full sm:w-64 bg-surface-container-lowest text-on-surface placeholder:text-outline font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
          />
          <span className="material-symbols-outlined absolute right-2.5 top-2 text-sm text-outline">
            search
          </span>
        </div>
      </div>

      {/* 4. Incident Cards Stream */}
      <div className="space-y-space-md">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low p-12 text-center border border-white/5 space-y-2">
            <span className="material-symbols-outlined text-4xl text-outline">check_circle</span>
            <div className="font-headline-md text-headline-md font-semibold text-on-surface">
              No Active Alerts Found
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto font-mono">
              All simulated circuits are operating within nominal electrical envelopes. Click "Simulate Test Surge" above to inject a transient event.
            </p>
          </div>
        ) : (
          filtered.map((inc) => (
            <div
              key={inc.id}
              className={`rounded-xl p-space-md shadow-md border transition-all flex flex-col md:flex-row md:items-start justify-between gap-space-md ${
                inc.severity === 'critical'
                  ? 'bg-error-container/10 border-error/30'
                  : inc.severity === 'warning'
                  ? 'bg-tertiary-container/10 border-tertiary/30'
                  : 'bg-surface-container-low border-white/5'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                      inc.severity === 'critical'
                        ? 'bg-error/20 text-error border border-error/30'
                        : inc.severity === 'warning'
                        ? 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                    }`}
                  >
                    {inc.badgeLabel}
                  </span>
                  <span className="text-on-surface font-semibold text-xs font-mono">{inc.circuitTag}</span>
                  <span className="text-outline text-xs font-mono">•</span>
                  <span className="text-outline text-xs font-mono">{inc.timestamp}</span>
                  {inc.acknowledged && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono text-[10px] font-semibold flex items-center gap-1 border border-secondary/20">
                      <span className="material-symbols-outlined text-xs">done</span>
                      <span>ACKNOWLEDGED</span>
                    </span>
                  )}
                </div>

                <h3 className="font-headline-md text-headline-md font-semibold text-on-surface tracking-tight">
                  {inc.title}
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-4xl">
                  {inc.description}
                </p>

                {inc.autoActionText && (
                  <div className="p-2.5 rounded bg-surface-container-lowest/80 text-outline font-mono text-xs border border-white/5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-secondary">smart_toy</span>
                    <span>{inc.autoActionText}</span>
                  </div>
                )}
              </div>

              {/* Action Cluster */}
              <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                {!inc.acknowledged && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(inc.id, inc.title)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs transition-colors border border-white/10"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleResolveAction(inc.id, inc.actionButtonLabel)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all shadow-sm flex items-center gap-1 ${
                    inc.severity === 'critical'
                      ? 'bg-error hover:bg-error-container text-on-error'
                      : inc.severity === 'warning'
                      ? 'bg-tertiary hover:bg-tertiary-container text-on-tertiary'
                      : 'bg-primary hover:bg-primary-fixed text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">bolt</span>
                  <span>{inc.actionButtonLabel}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. Subsystem Disclosure */}
      <div className="rounded-lg bg-surface-container-low px-space-md py-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-xs text-outline font-label-sm text-label-sm font-mono border border-white/5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-tertiary">tune</span>
          <span>SAFETY SUBSYSTEM: Automated simulated triggers with zero physical hardware actuation</span>
        </div>
        <div className="text-on-surface-variant">VOLTIX SAFETY MATRIX v2.4</div>
      </div>
    </div>
  );
};
