import React, { useState, useMemo } from 'react';
import { useTelemetry } from '../contexts/TelemetryContext';
import { useToast } from '../contexts/ToastContext';

type DateRangeOption = 'today' | '7d' | '30d' | 'custom';

interface ReportRow {
  date: string;
  nodeId: string;
  nodeName: string;
  energyKwh: number;
  peakDemandKw: number;
  avgPowerFactor: number;
  reactiveKvarh: number;
  costInr: number;
}

export const ReportsPage: React.FC = () => {
  const { devices } = useTelemetry();
  const { showToast } = useToast();

  const [dateRange, setDateRange] = useState<DateRangeOption>('7d');
  const [selectedNode, setSelectedNode] = useState<string>('all');
  const [baseTariffInr, setBaseTariffInr] = useState<number>(7.5);
  const [peakMultiplier, setPeakMultiplier] = useState<number>(1.4);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Column toggles
  const [includeEnergy, setIncludeEnergy] = useState<boolean>(true);
  const [includePeak, setIncludePeak] = useState<boolean>(true);
  const [includePf, setIncludePf] = useState<boolean>(true);
  const [includeReactive, setIncludeReactive] = useState<boolean>(true);
  const [includeCost, setIncludeCost] = useState<boolean>(true);

  // Generate synthetic report dataset based on filters
  const reportRows: ReportRow[] = useMemo(() => {
    const daysCount = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;
    const rows: ReportRow[] = [];

    const nodesToInclude =
      selectedNode === 'all'
        ? devices
        : devices.filter((d) => d.id === selectedNode);

    for (let dayOffset = daysCount - 1; dayOffset >= 0; dayOffset--) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      nodesToInclude.forEach((node, nodeIdx) => {
        // Base energy for node
        const baseFactor = (node.powerWatts / 1000) * 12; // 12h run estimate
        const dayNoise = Math.sin(dayOffset + nodeIdx) * 1.5;
        const energyKwh = +(Math.max(4.2, baseFactor + dayNoise)).toFixed(2);
        const peakKw = +((energyKwh / 10) * 1.35 + 0.4).toFixed(2);
        const avgPf = +(0.93 + ((dayOffset + nodeIdx) % 3) * 0.02).toFixed(2);
        const reactiveKvarh = +(energyKwh * 0.3).toFixed(2);
        const costInr = +(energyKwh * baseTariffInr * (nodeIdx === 2 ? peakMultiplier : 1.0)).toFixed(2);

        rows.push({
          date: dateStr,
          nodeId: node.id,
          nodeName: node.name,
          energyKwh,
          peakDemandKw: peakKw,
          avgPowerFactor: avgPf,
          reactiveKvarh,
          costInr,
        });
      });
    }

    return rows;
  }, [dateRange, selectedNode, devices, baseTariffInr, peakMultiplier]);

  // Aggregate Metrics for summary strip
  const totalReportKwh = useMemo(() => reportRows.reduce((a, r) => a + r.energyKwh, 0), [reportRows]);
  const maxReportPeakKw = useMemo(() => Math.max(...reportRows.map((r) => r.peakDemandKw), 0), [reportRows]);
  const totalReportCostInr = useMemo(() => reportRows.reduce((a, r) => a + r.costInr, 0), [reportRows]);
  const overallAvgPf = useMemo(
    () => (reportRows.length ? +(reportRows.reduce((a, r) => a + r.avgPowerFactor, 0) / reportRows.length).toFixed(3) : 0.95),
    [reportRows]
  );

  // CSV Generation and Download Handler
  const handleDownloadCsv = () => {
    setIsExporting(true);

    setTimeout(() => {
      // Build RFC 4180 headers
      const headers = ['Date', 'Node_ID', 'Node_Name'];
      if (includeEnergy) headers.push('Energy_kWh');
      if (includePeak) headers.push('Peak_Demand_kW');
      if (includePf) headers.push('Avg_Power_Factor');
      if (includeReactive) headers.push('Reactive_kVARh');
      if (includeCost) headers.push('Cost_INR');
      headers.push('Data_Type');

      // Build data rows
      const lines = [headers.join(',')];
      reportRows.forEach((r) => {
        const row = [r.date, r.nodeId, `"${r.nodeName}"`];
        if (includeEnergy) row.push(r.energyKwh.toFixed(2));
        if (includePeak) row.push(r.peakDemandKw.toFixed(2));
        if (includePf) row.push(r.avgPowerFactor.toFixed(2));
        if (includeReactive) row.push(r.reactiveKvarh.toFixed(2));
        if (includeCost) row.push(r.costInr.toFixed(2));
        row.push('SIMULATED_INTERNAL_LOG');
        lines.push(row.join(','));
      });

      const csvContent = lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `voltix_energy_report_${dateRange}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      showToast(`Exported CSV report with ${reportRows.length} records`, 'file_download', 'success');
    }, 600);
  };

  // JSON Raw Dump
  const handleDownloadJson = () => {
    const reportData = {
      report_title: 'VOLTIX Energy Telemetry Operational Dossier',
      generated_at: new Date().toISOString(),
      disclaimer: 'SIMULATED DATASET FOR INTERNAL PLANNING. NOT AN ACCREDITED ISO 50001 CERTIFICATION.',
      date_range: dateRange,
      selected_node: selectedNode,
      base_tariff_inr: baseTariffInr,
      total_energy_kwh: totalReportKwh,
      peak_demand_kw: maxReportPeakKw,
      total_cost_inr: totalReportCostInr,
      average_power_factor: overallAvgPf,
      records: reportRows,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voltix_report_data_${dateRange}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported raw JSON telemetry manifest', 'data_object', 'info');
  };

  return (
    <div className="p-space-md lg:p-margin-desktop space-y-space-lg">
      {/* 1. Header & Navigation Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-mono">
              AUDIT & TELEMETRY EXPORT // DOSSIER
            </span>
            <span className="text-outline-variant font-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-tertiary font-mono px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/20">
              OPERATIONAL LOG (NOT ISO CERTIFIED)
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            Energy Utilization Reports & Audit Exports
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-3xl mt-1">
            Generate and export CSV telemetry records, peak demand logs, and tariff cost projections. Note: Reports are compiled from synthetic simulation feeds for operational planning.
          </p>
        </div>

        {/* Global Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm font-mono shadow-sm border border-white/5"
          >
            <span className="material-symbols-outlined text-sm text-primary">data_object</span>
            <span>JSON MANIFEST</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-label-sm text-label-sm font-semibold transition-all shadow-[0_0_16px_rgba(76,215,246,0.3)]"
          >
            <span className={`material-symbols-outlined text-sm ${isExporting ? 'animate-spin' : ''}`}>
              {isExporting ? 'sync' : 'download'}
            </span>
            <span>{isExporting ? 'EXPORTING...' : 'DOWNLOAD CSV REPORT'}</span>
          </button>
        </div>
      </div>

      {/* Client-Side Persistence & Generation Disclosure */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container border border-primary/20 text-on-surface">
        <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">dataset</span>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-primary font-mono uppercase tracking-wider">
            REPORT ENGINE ARCHITECTURE: BROWSER IN-MEMORY COMPILATION
          </p>
          <p className="text-on-surface-variant font-mono leading-relaxed">
            All audit tables, CSV files, and JSON telemetry manifests are compiled dynamically inside the browser runtime. No backend PostgreSQL or TimescaleDB query is executed. Raw JSON export downloads the complete structured operational dossier with parameter headers directly to your device.
          </p>
        </div>
      </div>

      {/* 2. Interactive Filter & Configuration Box */}
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-md border border-white/5 space-y-space-md">
        <div className="flex items-center justify-between border-b border-white/5 pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">tune</span>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Report Parameters & Scope
            </h2>
          </div>
          <span className="font-label-sm text-label-sm text-outline font-mono">
            {reportRows.length} RECORDS IN QUERY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Date Range Selection */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Time Range Window
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              className="w-full bg-surface-container text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="today">Today (24H Hourly)</option>
              <option value="7d">Past 7 Days (Daily Totals)</option>
              <option value="30d">Current Billing Cycle (30 Days)</option>
              <option value="custom">Custom Simulation Window</option>
            </select>
          </div>

          {/* Node Scope Selection */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Node Fleet Filter
            </label>
            <select
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              className="w-full bg-surface-container text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="all">All Virtual Nodes (Aggregated Fleet)</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} — {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Base Tariff Input */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Base Tariff (₹ / kWh)
            </label>
            <input
              type="number"
              step="0.1"
              value={baseTariffInr}
              onChange={(e) => setBaseTariffInr(+e.target.value || 0)}
              className="w-full bg-surface-container text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Peak Multiplier */}
          <div className="space-y-1">
            <label className="font-label-sm text-label-sm font-mono text-outline uppercase block">
              Peak Tariff Multiplier
            </label>
            <input
              type="number"
              step="0.05"
              value={peakMultiplier}
              onChange={(e) => setPeakMultiplier(+e.target.value || 1.0)}
              className="w-full bg-surface-container text-on-surface font-mono text-xs px-3 py-2 rounded-lg border border-white/10 focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Column Selectors */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-4 text-outline font-mono font-label-sm text-label-sm">
          <span className="text-on-surface font-semibold">Include Columns:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeEnergy}
              onChange={(e) => setIncludeEnergy(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-on-surface-variant">Energy (kWh)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includePeak}
              onChange={(e) => setIncludePeak(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-on-surface-variant">Peak Demand (kW)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includePf}
              onChange={(e) => setIncludePf(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-on-surface-variant">Avg PF</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReactive}
              onChange={(e) => setIncludeReactive(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-on-surface-variant">Reactive (kVARh)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeCost}
              onChange={(e) => setIncludeCost(e.target.checked)}
              className="rounded bg-surface-container border-white/20 text-primary focus:ring-primary"
            />
            <span className="text-on-surface-variant">Estimated Cost (₹)</span>
          </label>
        </div>
      </div>

      {/* 3. Summary Aggregates Strip (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5">
          <div className="font-label-sm text-label-sm font-mono text-outline uppercase">
            Total Billed Energy (Sim)
          </div>
          <div className="font-headline-lg text-headline-lg font-bold font-mono text-primary mt-1">
            {totalReportKwh.toFixed(1)}{' '}
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">kWh</span>
          </div>
          <div className="text-xs text-outline font-mono mt-1">Sum of selected interval</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5">
          <div className="font-label-sm text-label-sm font-mono text-outline uppercase">
            Max Peak Demand
          </div>
          <div className="font-headline-lg text-headline-lg font-bold font-mono text-tertiary mt-1">
            {maxReportPeakKw.toFixed(2)}{' '}
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">kW</span>
          </div>
          <div className="text-xs text-secondary font-mono mt-1">Peak Demand Penalty: None</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5">
          <div className="font-label-sm text-label-sm font-mono text-outline uppercase">
            Projected Utility Cost
          </div>
          <div className="font-headline-lg text-headline-lg font-bold font-mono text-on-surface mt-1">
            ₹ {totalReportCostInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-secondary font-mono mt-1">Based on ₹{baseTariffInr}/kWh</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm border border-white/5">
          <div className="font-label-sm text-label-sm font-mono text-outline uppercase">
            Weighted Power Factor
          </div>
          <div className="font-headline-lg text-headline-lg font-bold font-mono text-secondary mt-1">
            {overallAvgPf}{' '}
            <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">cos φ</span>
          </div>
          <div className="text-xs text-secondary font-mono mt-1">Compliant (&gt; 0.90 lag)</div>
        </div>
      </div>

      {/* 4. Live Report Preview Table */}
      <div className="rounded-xl bg-surface-container-low shadow-md overflow-hidden border border-white/5">
        <div className="p-space-md bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">table_view</span>
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Report Data Preview (First {Math.min(10, reportRows.length)} Records)
            </h3>
          </div>
          <span className="font-label-sm text-label-sm font-mono text-outline">
            RFC 4180 Format Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono font-label-sm text-label-sm">
            <thead className="bg-surface-container-lowest text-outline border-b border-white/5 uppercase">
              <tr>
                <th className="py-2.5 px-4">DATE</th>
                <th className="py-2.5 px-4">NODE IDENTIFIER</th>
                <th className="py-2.5 px-4">NAME</th>
                {includeEnergy && <th className="py-2.5 px-4">ENERGY (kWh)</th>}
                {includePeak && <th className="py-2.5 px-4">PEAK kW</th>}
                {includePf && <th className="py-2.5 px-4">AVG PF</th>}
                {includeReactive && <th className="py-2.5 px-4">REACTIVE (kVARh)</th>}
                {includeCost && <th className="py-2.5 px-4 text-right">COST (₹)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reportRows.slice(0, 10).map((row, i) => (
                <tr key={`${row.date}_${row.nodeId}_${i}`} className="hover:bg-surface-container/50 transition-colors">
                  <td className="py-2.5 px-4 text-on-surface font-semibold">{row.date}</td>
                  <td className="py-2.5 px-4 text-primary">{row.nodeId}</td>
                  <td className="py-2.5 px-4 text-on-surface-variant truncate max-w-[180px]">{row.nodeName}</td>
                  {includeEnergy && <td className="py-2.5 px-4 text-secondary font-semibold">{row.energyKwh.toFixed(2)}</td>}
                  {includePeak && <td className="py-2.5 px-4 text-tertiary">{row.peakDemandKw.toFixed(2)}</td>}
                  {includePf && <td className="py-2.5 px-4 text-on-surface">{row.avgPowerFactor.toFixed(2)}</td>}
                  {includeReactive && <td className="py-2.5 px-4 text-outline">{row.reactiveKvarh.toFixed(2)}</td>}
                  {includeCost && <td className="py-2.5 px-4 text-right text-primary font-semibold">₹ {row.costInr.toFixed(2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-space-sm bg-surface-container-lowest/80 px-space-md flex flex-wrap items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono border-t border-white/5">
          <span>
            Displaying {Math.min(10, reportRows.length)} of {reportRows.length} compiled records
          </span>
          <span className="text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>CSV Download contains all {reportRows.length} records</span>
          </span>
        </div>
      </div>

      {/* 5. Honest Compliance Disclaimer */}
      <div className="rounded-lg bg-surface-container-low p-space-md border border-white/5 space-y-1">
        <div className="flex items-center gap-2 text-tertiary font-label-sm text-label-sm font-mono font-semibold">
          <span className="material-symbols-outlined text-base">verified_user</span>
          <span>COMPLIANCE & AUDIT INTEGRITY NOTICE</span>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          This dossier is an operational internal log compiled from mathematical synthetic models and simulated energy telemetry. It does NOT constitute accredited ISO 50001, IEEE 519, or official utility revenue certification without physical installation of verified PT/CT metering hardware, third-party calibration seals, and external auditor verification.
        </p>
      </div>
    </div>
  );
};
