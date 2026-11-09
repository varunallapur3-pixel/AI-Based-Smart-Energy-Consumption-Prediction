import React, { useState } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';

interface SmartRule {
  id: string;
  ruleCode: string;
  name: string;
  category: 'POWER_FACTOR' | 'PEAK_DEMAND' | 'PHASE_BALANCE' | 'STANDBY_LOAD';
  thresholdText: string;
  measuredState: string;
  isBreached: boolean;
  recommendationTitle: string;
  actionText: string;
  reason: string;
  projectedSavings: string;
  applied: boolean;
}

export const SmartRecommendationsPage: React.FC = () => {
  const { reading } = useTelemetry();
  const { showToast } = useToast();

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'POWER_FACTOR' | 'PEAK_DEMAND' | 'PHASE_BALANCE' | 'STANDBY_LOAD'>('ALL');

  const [rules, setRules] = useState<SmartRule[]>([
    {
      id: 'rule_1',
      ruleCode: 'RULE R-PF01',
      name: 'Inductive Low Power Factor Compensation',
      category: 'POWER_FACTOR',
      thresholdText: 'cos φ < 0.90 for >= 15 continuous minutes',
      measuredState: `Current System PF: ${(reading.powerFactor - 0.05).toFixed(2)} lag (Sub-optimal)`,
      isBreached: true,
      recommendationTitle: 'Engage Virtual APFC Capacitor Bank Stage 1',
      actionText: 'Simulate Capacitor Compensation Profile',
      reason:
        'Inductive loads on HVAC motor drives cause phase angle displacement, lowering effective cos φ below utility penalty limits (0.90 lag). Incurring estimated ₹420/month reactive tariff surcharges.',
      projectedSavings: 'Est. ₹ 420 / month • +0.06 PF improvement',
      applied: false,
    },
    {
      id: 'rule_2',
      ruleCode: 'RULE R-PEAK02',
      name: 'Time-of-Use (TOU) Peak Demand Arbitrage',
      category: 'PEAK_DEMAND',
      thresholdText: 'Active Draw > 2.5 kW between 18:00 - 22:00 TOU peak',
      measuredState: 'Projected Peak: 3.42 kW during 18:00 - 20:00 band',
      isBreached: true,
      recommendationTitle: 'Pre-Cool Thermal Reservoirs 90m Prior to Peak',
      actionText: 'Simulate Pre-Cooling Shift Schedule',
      reason:
        'Utility grid enforces 1.4x surcharge multiplier on active energy between 18:00 and 22:00. Pre-chilling thermal buffer reservoirs during the 15:30 - 17:00 standard tariff window trims 480W from the peak window.',
      projectedSavings: 'Est. ₹ 580 / month • 64 kWh shifted',
      applied: false,
    },
    {
      id: 'rule_3',
      ruleCode: 'RULE R-IMB03',
      name: 'Three-Phase Current Imbalance Suppression',
      category: 'PHASE_BALANCE',
      thresholdText: 'Current delta between phases > 8% of nominal average',
      measuredState: 'Phase A: 42% | Phase B: 33% | Phase C: 25% (Δ = 17%)',
      isBreached: true,
      recommendationTitle: 'Rebalance Lab Server Feeds to Phase C',
      actionText: 'Simulate Phase Reallocation Balancing',
      reason:
        'Heavy single-phase server loads on Phase A create a neutral return current of 0.18A, inducing I²R thermal dissipation in substation busbar connections. Reallocating loads equalizes phase vectors.',
      projectedSavings: 'Est. ₹ 210 / month • Neutral current reduced to <0.04A',
      applied: false,
    },
    {
      id: 'rule_4',
      ruleCode: 'RULE R-IDLE04',
      name: 'Vampire Standby Parasitic Suppressor',
      category: 'STANDBY_LOAD',
      thresholdText: 'Standby baseline > 180W between 01:00 - 05:00 off-shift',
      measuredState: 'Night Baseline: 240W continuous idle load',
      isBreached: true,
      recommendationTitle: 'Schedule Automated Lab Smart Socket Sleep',
      actionText: 'Simulate Deep-Sleep Socket Schedule',
      reason:
        'RF spectrum analyzers, test bench monitors, and passive power bricks remain energized overnight without active testing workflows, accumulating ₹18.50 in unutilized power per night cycle.',
      projectedSavings: 'Est. ₹ 165 / month • 22 kWh avoided',
      applied: false,
    },
  ]);

  const handleApplySimulated = (ruleId: string, ruleName: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, applied: !r.applied } : r))
    );

    const isNowApplied = !rules.find((r) => r.id === ruleId)?.applied;
    if (isNowApplied) {
      showToast(
        `[SIMULATION] Applied recommendation: ${ruleName}. Virtual model updated. Physical hardware unaffected.`,
        'tune',
        'success'
      );
    } else {
      showToast(`[SIMULATION] Reverted recommendation profile for ${ruleName}`, 'undo', 'info');
    }
  };

  const filteredRules = rules.filter(
    (r) => categoryFilter === 'ALL' || r.category === categoryFilter
  );

  const appliedCount = rules.filter((r) => r.applied).length;

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* 1. Header & Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              PREDICTIVE HEURISTICS // LOAD OPTIMIZER
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-tertiary font-mono px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              SIMULATED ACTIONS ONLY (NO HW ACTUATION)
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            Autonomous Smart Recommendations & Load Optimization
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl mt-1">
            Deterministic rule-based heuristics evaluating continuous simulated telemetry to identify power factor degradation, time-of-use tariff arbitrage, and phase imbalance losses.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3 bg-surface-container-low p-2 rounded-xl border border-white/5 font-mono text-label-sm text-label-sm">
          <div className="flex flex-col text-left">
            <span className="text-outline uppercase text-[10px]">Applied Profiles</span>
            <span className="text-secondary font-bold font-mono">
              {appliedCount} / {rules.length} SIMULATED
            </span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex flex-col text-left">
            <span className="text-outline uppercase text-[10px]">Potential Savings</span>
            <span className="text-primary font-bold font-mono">₹ 1,375 / mo</span>
          </div>
        </div>
      </div>

      {/* 2. Rule Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-label-sm text-label-sm">
        {(
          [
            { id: 'ALL', label: 'All Heuristic Rules' },
            { id: 'POWER_FACTOR', label: 'Power Factor Correction' },
            { id: 'PEAK_DEMAND', label: 'TOU Peak Shaving' },
            { id: 'PHASE_BALANCE', label: '3-Phase Balancing' },
            { id: 'STANDBY_LOAD', label: 'Standby Vampire Draw' },
          ] as const
        ).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategoryFilter(cat.id)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              categoryFilter === cat.id
                ? 'bg-primary text-on-primary border-primary font-semibold shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant border-white/5 hover:bg-surface-container'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Transparent Heuristic Rules & Recommendation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className={`rounded-xl p-space-md shadow-md border transition-all flex flex-col justify-between space-y-space-md ${
              rule.applied
                ? 'bg-secondary/5 border-secondary/30'
                : 'bg-surface-container-low border-white/5'
            }`}
          >
            <div>
              {/* Header Badge Strip */}
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-primary font-semibold text-xs border border-white/10">
                    {rule.ruleCode}
                  </span>
                  <span className="text-xs font-mono text-outline uppercase">{rule.category}</span>
                </div>
                {rule.applied ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary/15 text-secondary font-mono text-xs font-semibold flex items-center gap-1 border border-secondary/30">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>APPLIED IN SIMULATION</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary font-mono text-xs font-semibold flex items-center gap-1 border border-tertiary/30">
                    <span className="material-symbols-outlined text-xs">priority_high</span>
                    <span>ACTION RECOMMENDED</span>
                  </span>
                )}
              </div>

              {/* Title & Heuristic Rule Condition */}
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                {rule.recommendationTitle}
              </h3>

              {/* Threshold & Measured State Block */}
              <div className="my-3 p-3 rounded-lg bg-surface-container border border-white/5 space-y-1.5 font-mono text-label-sm text-label-sm">
                <div className="flex items-center justify-between text-outline">
                  <span>DETERMINISTIC THRESHOLD:</span>
                  <span className="text-on-surface">{rule.thresholdText}</span>
                </div>
                <div className="flex items-center justify-between text-outline">
                  <span>TELEMETRY TRIGGER:</span>
                  <span className="text-tertiary font-semibold">{rule.measuredState}</span>
                </div>
              </div>

              {/* Reason Explanation */}
              <div className="space-y-1">
                <span className="font-mono text-xs font-semibold uppercase text-outline block">
                  Root Cause & Economic Rationale:
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {rule.reason}
                </p>
              </div>
            </div>

            {/* Bottom Actions & Economic Impact */}
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-outline uppercase block">Projected Impact</span>
                <span className="text-secondary font-mono font-semibold text-body-md">
                  {rule.projectedSavings}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleApplySimulated(rule.id, rule.name)}
                className={`px-4 py-2 rounded-lg font-mono text-label-sm text-label-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  rule.applied
                    ? 'bg-surface-container text-outline hover:bg-surface-bright hover:text-on-surface border border-white/10'
                    : 'bg-primary hover:bg-primary-fixed text-on-primary shadow-[0_0_12px_rgba(76,215,246,0.3)]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {rule.applied ? 'undo' : 'tune'}
                </span>
                <span>{rule.applied ? 'Revert Simulated Profile' : rule.actionText}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Safety & Actuation Disclosure */}
      <div className="rounded-lg bg-surface-container-low p-space-md border border-white/5 space-y-1 text-on-surface-variant font-mono text-label-sm text-label-sm">
        <div className="flex items-center gap-2 text-tertiary font-semibold">
          <span className="material-symbols-outlined text-base">shield</span>
          <span>SAFETY ISOLATION & PHYSICAL COMMAND POLICY</span>
        </div>
        <p className="font-body-sm text-body-sm">
          Recommendation execution is strictly bound to frontend mathematical model simulation. Physical hardware relays, Modbus motor inverters, and switchgear will never be actuated without explicit physical safety keys and real hardware handshake confirmation.
        </p>
      </div>
    </div>
  );
};
