import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useTelemetry } from '../../contexts/TelemetryContext';
import { MOCK_DISCOVERED_NODES } from '../../services/deviceService';

interface SubnetScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubnetScanModal: React.FC<SubnetScanModalProps> = ({ isOpen, onClose }) => {
  const { claimDiscoveredNode } = useTelemetry();
  const [progress, setProgress] = useState(30);

  useEffect(() => {
    if (isOpen) {
      setProgress(30);
      const timer = setInterval(() => {
        setProgress((p) => (p >= 100 ? 100 : p + 15));
      }, 400);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const handleClaim = () => {
    claimDiscoveredNode(MOCK_DISCOVERED_NODES[0]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subnet Simulation Sweep"
      icon="radar"
      maxWidth="max-w-lg"
    >
      <div className="space-y-space-md">
        <div className="p-2.5 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center gap-2 text-tertiary font-label-sm text-label-sm font-mono">
          <span className="material-symbols-outlined text-base">model_training</span>
          <span>
            {progress >= 100
              ? 'SIMULATION SWEEP COMPLETE — Virtual Node Profiles Available'
              : 'SIMULATION MODE: Sweeping virtual registers and synthetic buses'}
          </span>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          Executing synthetic bus sweep across virtual node registers. No physical mDNS, UDP, or ARP packets are broadcast in simulation mode.
        </p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between font-label-sm text-label-sm font-mono">
            <span className={progress >= 100 ? 'text-secondary font-semibold' : 'text-outline'}>
              {progress >= 100 ? 'SIMULATION SWEEP COMPLETE' : 'SWEEPING VIRTUAL BUS...'}
            </span>
            <span className="text-primary font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progress >= 100
                  ? 'bg-secondary shadow-[0_0_10px_rgba(78,222,163,0.6)]'
                  : 'bg-primary shadow-[0_0_8px_rgba(76,215,246,0.5)]'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Discovered Virtual Hosts List */}
        <div className="bg-surface-container-lowest p-3 rounded-lg space-y-2 max-h-48 overflow-y-auto font-mono font-label-sm text-label-sm border border-white/5">
          {MOCK_DISCOVERED_NODES.map((node, i) => (
            <div
              key={node.mac}
              className={`flex justify-between items-center py-2 px-2 rounded border-b border-white/5 last:border-0 ${
                i === 0 ? 'bg-secondary/5 text-secondary font-semibold border-secondary/20' : 'text-outline'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    i === 0 ? 'bg-secondary animate-pulse' : 'bg-outline'
                  }`}
                ></span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-on-surface">VIRTUAL NODE:</span>
                    <span>{node.model}</span>
                  </div>
                  <span className="text-xs text-outline font-normal">
                    ID: {node.mac} • Interface: {node.sensorType}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-primary font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-container">
                  {node.ip}
                </span>
                <span className="text-[10px] text-tertiary mt-0.5">{node.hostType}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-space-sm pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm font-mono hover:bg-surface-bright transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            disabled={progress < 100}
            onClick={handleClaim}
            className={`px-4 py-2 rounded-lg font-label-sm text-label-sm font-mono font-semibold transition-all shadow-sm flex items-center gap-1.5 ${
              progress >= 100
                ? 'bg-secondary hover:bg-secondary-fixed text-on-secondary shadow-[0_0_12px_rgba(78,222,163,0.3)] cursor-pointer'
                : 'bg-surface-container text-outline opacity-50 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>+ Add Virtual Node (VIRT_NODE_05)</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
