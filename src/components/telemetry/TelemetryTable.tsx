import React from 'react';
import { useTelemetry } from '../../contexts/TelemetryContext';

interface TelemetryTableProps {
  onOpenInspector: () => void;
}

export const TelemetryTable: React.FC<TelemetryTableProps> = ({ onOpenInspector }) => {
  const { packets } = useTelemetry();

  return (
    <div className="bg-surface-container-low p-space-md rounded-xl shadow-md flex flex-col justify-between border border-white/5">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">dataset</span>
            <div>
              <span className="font-headline-md text-headline-md font-semibold text-on-surface">
                Recent Telemetry Frames
              </span>
              <span className="font-label-sm text-label-sm text-outline font-mono block">
                FIFO Transceiver Buffer • Last 8 Packets
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInspector}
            className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm font-mono flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-primary/20"
          >
            <span className="material-symbols-outlined text-sm">code</span>
            <span>Inspect JSON Payload</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto mt-space-sm">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="bg-surface-container text-outline font-label-sm text-label-sm border-b border-surface-container-high/60">
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">SOURCE</th>
                <th className="py-2.5 px-3">VOLTAGE (V)</th>
                <th className="py-2.5 px-3">CURRENT (A)</th>
                <th className="py-2.5 px-3">POWER (W)</th>
                <th className="py-2.5 px-3">PF</th>
                <th className="py-2.5 px-3">FREQ (Hz)</th>
                <th className="py-2.5 px-3 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="font-label-sm text-label-sm divide-y divide-surface-container-high/20">
              {packets.map((pkt) => (
                <tr key={pkt.id} className="hover:bg-surface-container/60 transition-colors">
                  <td className="py-2.5 px-3 text-on-surface font-semibold">{pkt.timestamp}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
                        pkt.source === 'HARDWARE'
                          ? 'bg-secondary/15 text-secondary border border-secondary/30'
                          : 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                      }`}
                    >
                      {pkt.source}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-secondary">{pkt.voltage.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-tertiary">{pkt.current.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-primary font-bold">{pkt.power.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-on-surface">{pkt.pf.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-on-surface-variant">{pkt.freq.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded font-mono ${
                        pkt.status === 'VALID'
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-error/15 text-error font-semibold'
                      }`}
                    >
                      {pkt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-space-sm mt-space-sm flex flex-col sm:flex-row items-start sm:items-center justify-between text-outline font-mono font-label-sm text-label-sm gap-2 border-t border-surface-container-high/40">
        <span>Transport: WebSocket Binary Framing (ws/wss)</span>
        <span className="text-secondary flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-secondary"></span>
          <span>Rx Throughput: 1,024 bytes/sec (Nominal)</span>
        </span>
      </div>
    </div>
  );
};
