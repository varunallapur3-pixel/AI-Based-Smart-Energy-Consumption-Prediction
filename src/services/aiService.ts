import { AnomalyIncident, AiRecommendation, ForecastPoint } from '../types/ai';

export const INITIAL_INCIDENTS: AnomalyIncident[] = [
  {
    id: 'inc_01',
    severity: 'critical',
    badgeLabel: 'CRITICAL SURGE',
    title: 'Sudden 1.8kW Surge Detected (Simulated Event)',
    circuitTag: 'Circuit #2 HVAC (Synthetic)',
    timestamp: '02:45 AM',
    description: 'Measured: 2,340W vs Expected Baseline: 420W. Root Cause: Compressor locked into defrost override cycle during low ambient night window.',
    measuredWatts: 2340,
    baselineWatts: 420,
    autoActionText: 'Simulated Rule: Virtual safety threshold flagged event. Physical relay unactuated (Simulation Mode).',
    actionButtonLabel: 'RESET BREAKER',
    actionButtonType: 'error',
    acknowledged: false,
  },
  {
    id: 'inc_02',
    severity: 'warning',
    badgeLabel: 'POWER FACTOR DEGRADATION',
    title: 'Abnormal Low Power Factor (0.71 cos φ)',
    circuitTag: 'Server Room Phase B (Synthetic)',
    timestamp: '08:12 AM',
    description: 'Highly reactive harmonic distortion modeled on UPS secondary winding. Incurring reactive kVAh penalty tariff from distribution grid.',
    powerFactor: 0.71,
    autoActionText: 'Simulated Rule: APFC capacitor bank switching step recommended to restore > 0.95.',
    actionButtonLabel: 'ENGAGE APFC',
    actionButtonType: 'warning',
    acknowledged: false,
  },
  {
    id: 'inc_03',
    severity: 'info',
    badgeLabel: 'STANDBY CREEP',
    title: 'Off-Hours Standby Load Creep (+120W Baseline)',
    circuitTag: 'Main Incomer (Synthetic)',
    timestamp: '04:15 AM',
    description: 'Auxiliary peripherals and inactive workstation monitors modeled without entering low-power sleep state. Projected idle cost: ₹18.50 per night cycle.',
    baselineWatts: 120,
    autoActionText: 'Simulated Rule: Flagged for schedule-based sleep actuation rule.',
    actionButtonLabel: 'ACKNOWLEDGE',
    actionButtonType: 'ghost',
    acknowledged: false,
  },
];

export const INITIAL_RECOMMENDATIONS: AiRecommendation[] = [
  {
    id: 'rec_01',
    category: 'TARIFF ARBITRATION',
    priority: 'PRIORITY HIGH',
    title: 'Shift Water Chiller Pre-Cooling',
    description: 'Pre-chill thermal reservoirs 90 minutes earlier (at 16:30) before the Peak Utility Surcharge kicks in at 18:00. Reduces peak kw draw during high-tariff band.',
    monthlyRupeeSavings: 480,
    energyShiftKwhText: '~64 kWh shifted',
    actionLabel: 'AUTOMATE SCHEDULER',
    icon: 'schedule_send',
    isApplied: false,
  },
  {
    id: 'rec_02',
    category: 'GRID STABILITY',
    priority: 'PRIORITY MED',
    title: 'Rebalance Phase-B Circuit Load',
    description: 'Transfer 420W of server ancillary cooling to Phase A to equalize three-phase imbalance. Suppresses excessive neutral conductor heating and eliminate I²R losses.',
    monthlyRupeeSavings: 210,
    energyShiftKwhText: 'Loss reduction 28 kWh',
    actionLabel: 'EXECUTE BUS TRANSFER',
    icon: 'balance',
    isApplied: false,
  },
  {
    id: 'rec_03',
    category: 'IDLE PARASITICS',
    priority: 'PRIORITY AUTO',
    title: 'Deploy Lab Smart Socket Auto-Sleep',
    description: 'Activate automated deep-sleep protocol on idle peripheral test benches and RF analyzers between 20:00 and 06:30. Zero human interference required.',
    monthlyRupeeSavings: 165,
    energyShiftKwhText: '~22 kWh prevented',
    actionLabel: 'ENABLE SMART RULE',
    icon: 'power_settings_new',
    isApplied: false,
  },
];

export function getForecastData(timeframe: '24h' | '7d' | '30d'): ForecastPoint[] {
  if (timeframe === '7d') {
    return [
      { timeLabel: 'Day -3', actualKwh: 15.2, predictedKwh: 15.0, upperConfidence: 15.8, lowerConfidence: 14.2 },
      { timeLabel: 'Day -2', actualKwh: 17.8, predictedKwh: 17.5, upperConfidence: 18.4, lowerConfidence: 16.6 },
      { timeLabel: 'Day -1', actualKwh: 18.4, predictedKwh: 18.0, upperConfidence: 18.9, lowerConfidence: 17.1 },
      { timeLabel: 'Today (T-0)', actualKwh: 14.85, predictedKwh: 14.85, upperConfidence: 15.6, lowerConfidence: 14.1 },
      { timeLabel: 'Day +1', predictedKwh: 16.2, upperConfidence: 17.1, lowerConfidence: 15.3 },
      { timeLabel: 'Day +2', predictedKwh: 17.8, upperConfidence: 18.9, lowerConfidence: 16.7, isTariffPeak: true },
      { timeLabel: 'Day +3', predictedKwh: 16.5, upperConfidence: 17.5, lowerConfidence: 15.5 },
    ];
  }

  if (timeframe === '30d') {
    return [
      { timeLabel: 'Wk 1', actualKwh: 110.2, predictedKwh: 112.0, upperConfidence: 118, lowerConfidence: 106 },
      { timeLabel: 'Wk 2', actualKwh: 124.5, predictedKwh: 122.0, upperConfidence: 129, lowerConfidence: 115 },
      { timeLabel: 'Wk 3', actualKwh: 118.0, predictedKwh: 119.0, upperConfidence: 125, lowerConfidence: 113 },
      { timeLabel: 'Wk 4 (Proj)', predictedKwh: 124.6, upperConfidence: 132, lowerConfidence: 117, isTariffPeak: true },
    ];
  }

  // 24h default
  return [
    { timeLabel: '-24h', actualKwh: 0.42, predictedKwh: 0.40, upperConfidence: 0.44, lowerConfidence: 0.38 },
    { timeLabel: '-20h', actualKwh: 0.38, predictedKwh: 0.39, upperConfidence: 0.42, lowerConfidence: 0.36 },
    { timeLabel: '-16h', actualKwh: 0.52, predictedKwh: 0.50, upperConfidence: 0.55, lowerConfidence: 0.47 },
    { timeLabel: '-12h', actualKwh: 0.65, predictedKwh: 0.62, upperConfidence: 0.68, lowerConfidence: 0.58 },
    { timeLabel: '-8h', actualKwh: 0.88, predictedKwh: 0.85, upperConfidence: 0.92, lowerConfidence: 0.80 },
    { timeLabel: '-4h', actualKwh: 0.72, predictedKwh: 0.74, upperConfidence: 0.80, lowerConfidence: 0.68 },
    { timeLabel: 'T-0 (NOW)', actualKwh: 0.575, predictedKwh: 0.575, upperConfidence: 0.62, lowerConfidence: 0.53 },
    { timeLabel: '+4h', predictedKwh: 0.92, upperConfidence: 1.01, lowerConfidence: 0.84 },
    { timeLabel: '+8h (Peak)', predictedKwh: 2.80, upperConfidence: 3.02, lowerConfidence: 2.58, isTariffPeak: true },
    { timeLabel: '+12h', predictedKwh: 1.45, upperConfidence: 1.58, lowerConfidence: 1.32, isTariffPeak: true },
    { timeLabel: '+16h', predictedKwh: 0.64, upperConfidence: 0.71, lowerConfidence: 0.58 },
    { timeLabel: '+20h', predictedKwh: 0.48, upperConfidence: 0.54, lowerConfidence: 0.42 },
    { timeLabel: '+24h', predictedKwh: 0.55, upperConfidence: 0.61, lowerConfidence: 0.49 },
  ];
}
