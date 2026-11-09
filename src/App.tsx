import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { TelemetryProvider } from './contexts/TelemetryContext';
import { AppLayout } from './components/layout/AppLayout';

import { OverviewDashboardPage } from './pages/OverviewDashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { DeviceManagementPage } from './pages/DeviceManagementPage';
import { AiPredictionsPage } from './pages/AiPredictionsPage';
import { EnergyAnalyticsPage } from './pages/EnergyAnalyticsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SmartRecommendationsPage } from './pages/SmartRecommendationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertsNotificationsPage } from './pages/AlertsNotificationsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <TelemetryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<OverviewDashboardPage />} />
              <Route path="live-monitoring" element={<LiveMonitoringPage />} />
              <Route path="monitoring" element={<LiveMonitoringPage />} />
              <Route path="device-management" element={<DeviceManagementPage />} />
              <Route path="devices" element={<DeviceManagementPage />} />
              <Route path="ai-predictions" element={<AiPredictionsPage />} />
              <Route path="predictions" element={<AiPredictionsPage />} />
              <Route path="energy-analytics" element={<EnergyAnalyticsPage />} />
              <Route path="analytics" element={<EnergyAnalyticsPage />} />
              <Route path="alerts" element={<AlertsNotificationsPage />} />
              <Route path="recommendations" element={<SmartRecommendationsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </TelemetryProvider>
    </ToastProvider>
  );
};

export default App;
