import { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { OverviewPage } from './pages/OverviewPage';
import { LiveInspectionPage } from './pages/LiveInspectionPage';
import { EvidencePage } from './pages/EvidencePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { FailureTestsPage } from './pages/FailureTestsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ArchitecturePage } from './pages/ArchitecturePage';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#07111F] text-slate-100 flex flex-row w-full max-w-full overflow-x-hidden font-sans">
      
      {/* Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Right View Panel */}
      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-x-hidden">
        
        {/* Top Header */}
        <Header onToggleMobileMenu={() => setIsOpenMobile(true)} />

        {/* Real-time Alert Toast Notification */}
        <Toast />

        {/* Active Page Component */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-12 w-full max-w-full">
          {activeTab === 'overview' && <OverviewPage />}
          {activeTab === 'live' && <LiveInspectionPage />}
          {activeTab === 'evidence' && <EvidencePage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'health' && <SystemHealthPage />}
          {activeTab === 'failure-tests' && <FailureTestsPage />}
          {activeTab === 'settings' && <SettingsPage />}
          {activeTab === 'architecture' && <ArchitecturePage />}
        </main>
      </div>

    </div>
  );
}

export function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}

export default App;
