import React, { useState } from 'react';
import { INITIAL_RECOMMENDATIONS } from '../../services/aiService';
import { AiRecommendation } from '../../types/ai';
import { useToast } from '../../contexts/ToastContext';

export const RecommendationList: React.FC = () => {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>(INITIAL_RECOMMENDATIONS);
  const { showToast } = useToast();

  const handleApply = (rec: AiRecommendation) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, isApplied: true } : r))
    );
    showToast(`Applied optimization: ${rec.title}. Savings logged to telemetry model.`, 'check_circle', 'success');
  };

  const totalSavings = recommendations.reduce((sum, r) => sum + r.monthlyRupeeSavings, 0);

  return (
    <div className="rounded-xl bg-surface-container-low p-space-lg shadow-md space-y-space-md border border-white/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs pb-space-sm border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">insights</span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Prescriptive AI Energy Optimization & Savings
            </h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Quantified tariff arbitration and algorithmic adjustments generated from load profile cross-referencing.
          </p>
        </div>

        <div className="font-label-sm text-label-sm font-mono text-secondary px-3 py-1.5 rounded bg-secondary/10 border border-secondary/20 flex items-center gap-1.5 shrink-0">
          <span className="material-symbols-outlined text-base">savings</span>
          <span>TOTAL POTENTIAL SAVINGS: ₹{totalSavings} / MONTH</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="rounded-lg bg-surface-container p-space-md flex flex-col justify-between space-y-space-sm hover:bg-surface-container-high transition-all border border-white/5"
          >
            <div className="space-y-space-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-label-sm text-label-sm font-mono font-semibold border border-secondary/20">
                  {rec.category}
                </span>
                <span className="font-label-sm text-label-sm font-mono text-outline">
                  {rec.priority}
                </span>
              </div>
              <h4 className="font-headline-md text-headline-md text-on-surface font-semibold pt-1">
                {rec.title}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {rec.description}
              </p>
            </div>

            <div className="pt-2 border-t-0 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="font-label-sm text-label-sm text-outline">Est. Monthly Impact</span>
                <div className="text-right">
                  <span className="font-body-md text-body-md text-secondary font-bold">
                    ₹ {rec.monthlyRupeeSavings}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline block">
                    {rec.energyShiftKwhText}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApply(rec)}
                disabled={rec.isApplied}
                className={`w-full py-2 rounded font-label-sm text-label-sm font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  rec.isApplied
                    ? 'bg-secondary/15 text-secondary border border-secondary/30 cursor-default'
                    : 'bg-primary text-on-primary hover:bg-primary-fixed shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {rec.isApplied ? 'check' : rec.icon}
                </span>
                <span>{rec.isApplied ? 'RULE APPLIED & ACTIVE' : rec.actionLabel}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
