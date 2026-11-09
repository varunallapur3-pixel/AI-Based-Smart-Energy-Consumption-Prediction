export type IncidentSeverity = 'critical' | 'warning' | 'info';

export interface AnomalyIncident {
  id: string;
  severity: IncidentSeverity;
  badgeLabel: string;
  title: string;
  circuitTag: string;
  timestamp: string;
  description: string;
  measuredWatts?: number;
  baselineWatts?: number;
  powerFactor?: number;
  autoActionText?: string;
  actionButtonLabel: string;
  actionButtonType?: 'error' | 'warning' | 'primary' | 'ghost';
  acknowledged?: boolean;
}

export interface AiRecommendation {
  id: string;
  category: 'TARIFF ARBITRATION' | 'GRID STABILITY' | 'IDLE PARASITICS';
  priority: 'PRIORITY HIGH' | 'PRIORITY MED' | 'PRIORITY AUTO';
  title: string;
  description: string;
  monthlyRupeeSavings: number;
  energyShiftKwhText: string;
  actionLabel: string;
  icon: string;
  isApplied?: boolean;
}

export interface ForecastPoint {
  timeLabel: string;
  actualKwh?: number;
  predictedKwh: number;
  upperConfidence: number; // +5% bound
  lowerConfidence: number; // -5% bound
  isTariffPeak?: boolean;
}
