import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { SubnetScanModal } from '../devices/SubnetScanModal';
import { OfflineBanner, ErrorAlert } from '../common/StateViews';
import { SimulatedDataBanner } from '../common/SimulatedDataBanner';
import { useTelemetry } from '../../contexts/TelemetryContext';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const { isOffline, setIsOffline, errorState, setErrorState } = useTelemetry();

  return (
    <div className="bg-background min-h-screen text-on-surface antialiased flex flex-col">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <TopHeader
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          onOpenScanModal={() => setScanModalOpen(true)}
        />

        {/* Content Outlet */}
        <main className="w-full bg-surface min-h-[calc(100vh-64px)] flex flex-col flex-1">
          {/* Status & Persistent Simulated Data Banners */}
          <div className="px-space-md lg:px-margin-desktop pt-4 pb-2 space-y-2">
            <SimulatedDataBanner />
            {isOffline && <OfflineBanner onReconnect={() => setIsOffline(false)} />}
            {errorState && <ErrorAlert message={errorState} onDismiss={() => setErrorState(null)} />}
          </div>

          <div className="flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Subnet Scan Modal */}
      <SubnetScanModal isOpen={scanModalOpen} onClose={() => setScanModalOpen(false)} />
    </div>
  );
};
