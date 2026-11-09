import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTelemetry } from '../../contexts/TelemetryContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { reading, selectedDevice, toggleDeviceRelay, devices } = useTelemetry();

  const navItems = [
    { to: '/', label: 'Overview', icon: 'grid_view' },
    {
      to: '/live-monitoring',
      label: 'Live Monitoring',
      icon: 'pulse_alert',
      badge: 'SIM',
      badgeClass: 'bg-tertiary/15 text-tertiary animate-pulse border border-tertiary/20',
    },
    { to: '/energy-analytics', label: 'Energy Analytics', icon: 'bar_chart' },
    {
      to: '/ai-predictions',
      label: 'AI Predictions',
      icon: 'psychology',
      badge: 'SIM-ML',
      badgeClass: 'bg-primary/10 text-primary border border-primary/20',
    },
    {
      to: '/device-management',
      label: 'Device Management',
      icon: 'memory',
      badge: String(devices.length),
      badgeClass: 'bg-surface-container-high text-on-surface-variant',
    },
    {
      to: '/alerts',
      label: 'Alerts & Notifications',
      icon: 'warning',
      badge: '3',
      badgeClass: 'bg-tertiary-container text-tertiary',
    },
    { to: '/recommendations', label: 'Smart Recommendations', icon: 'lightbulb' },
    { to: '/reports', label: 'Reports', icon: 'description' },
    { to: '/settings', label: 'Settings', icon: 'tune' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.4)] transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-[calc(100vh-130px)]">
          {/* Brand Header */}
          <div className="h-16 px-space-md flex items-center justify-between shrink-0 bg-surface-container-lowest/50 border-b border-white/5">
            <div className="flex items-center gap-space-sm">
              <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold text-lg shadow-[0_0_12px_rgba(76,215,246,0.3)]">
                ⚡
              </div>
              <span className="font-headline-md text-headline-md font-semibold tracking-tight text-primary">
                VOLTIX
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded bg-surface-container-high text-tertiary font-mono border border-tertiary/20">
                SIM v2.4
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="lg:hidden p-1 text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-space-sm py-space-sm space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded font-mono ${item.badgeClass}`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Active Emulated Hardware Widget */}
        <div className="p-space-sm shrink-0 bg-surface-container-lowest/80 border-t border-white/5">
          <div className="p-space-sm rounded-lg bg-surface-container border border-white/5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    selectedDevice.relayClosed ? 'bg-tertiary' : 'bg-outline'
                  }`}
                ></span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                  {selectedDevice.id} (EMULATED)
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-tertiary font-mono">
                {selectedDevice.relayClosed ? 'SIM ACTIVE' : 'SIM IDLE'}
              </span>
            </div>
            <div className="font-label-sm text-label-sm text-on-surface-variant font-mono leading-tight">
              {reading.voltage.toFixed(0)}V • {reading.power.toFixed(0)}W • PF {reading.powerFactor.toFixed(2)}
            </div>
            <div className="flex items-center justify-between pt-1 mt-1 bg-surface-container-high/40 px-2 py-1 rounded">
              <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm font-mono">
                <span className="material-symbols-outlined text-sm text-tertiary">tune</span>
                <span>Virtual Model</span>
              </div>
              <button
                type="button"
                onClick={() => toggleDeviceRelay(selectedDevice.id)}
                className="font-label-sm text-label-sm text-primary hover:text-primary-fixed underline transition-colors"
              >
                TOGGLE
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
