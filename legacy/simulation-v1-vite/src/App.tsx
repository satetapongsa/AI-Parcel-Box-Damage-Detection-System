import { useState, useEffect } from 'react';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw,
  Play,
  Pause,
  Clock,
  Layers,
  BarChart3,
  Activity
} from 'lucide-react';
import { useSimulation, SimulationProvider } from './context/SimulationContext';
import { ConveyorTopDownSimulation } from './components/ConveyorTopDownSimulation';
import { StatisticsMonitoringView } from './components/StatisticsMonitoringView';

export function Dashboard() {
  const {
    parcels,
    latestParcel,
    dbRecords,
    isLoadingDb,
    refreshDbRecords,
    demoModeActive,
    toggleDemoMode
  } = useSimulation();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'REJECT'>('ALL');
  const [activeTab, setActiveTab] = useState<'monitor' | 'stats'>('monitor');

  // Initial fetch of records from Neon DB
  useEffect(() => {
    refreshDbRecords();
  }, [refreshDbRecords]);

  // Aggregate statistics directly from inspection stream
  const totalInspected = parcels.length;
  const passCount = parcels.filter(p => p.status === 'PASS').length;
  const rejectCount = parcels.filter(p => p.status === 'REJECT').length;
  const passRate = totalInspected > 0 ? ((passCount / totalInspected) * 100).toFixed(1) : '100.0';

  // Filter records by search & status
  const displayedRecords = dbRecords.length > 0 ? dbRecords : parcels.map((p, idx) => ({
    id: idx + 1,
    tracking_no: p.trackingNumber,
    station_id: 'SORT-01',
    status: p.status,
    damage_type: p.damageType,
    confidence: p.aiConfidence,
    weight_kg: p.weight,
    expected_weight_kg: p.expectedWeight,
    reject_reason: p.rejectReason || null,
    handled: false,
    handled_reason: null,
    handled_at: null,
    created_at: p.timestamp || new Date().toISOString()
  }));

  const filteredRecords = displayedRecords.filter(r => {
    const matchesSearch = 
      r.tracking_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.damage_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reject_reason && r.reject_reason.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#060D17] text-slate-100 font-sans antialiased flex flex-col">
      {/* 1. Clean, Minimalist Header */}
      <header className="bg-[#0B1526] border-b border-slate-800/80 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Parcel Damage Inspection Hub</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                STATION SORT-01
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Live automated conveyor inspection, defect diversion logs & database audit
            </p>
          </div>
        </div>

        {/* Navigation Mode Switcher: Monitor vs Statistics */}
        <div className="flex items-center bg-[#070E1A] p-1 rounded-xl border border-slate-700/80 font-mono text-xs shadow-inner">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-2 ${
              activeTab === 'monitor'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Conveyor Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center space-x-2 ${
              activeTab === 'stats'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistics & Graphs</span>
          </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => refreshDbRecords()}
            disabled={isLoadingDb}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-medium transition flex items-center space-x-1.5 shadow"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Sync DB</span>
          </button>

          <button
            onClick={toggleDemoMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 shadow ${
              demoModeActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {demoModeActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{demoModeActive ? 'Pause Belt' : 'Resume Belt'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Area: Single Streamlined Page */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* 3. Essential Counters (Only the key data requested) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Passed Through */}
          <div className="bg-[#0B1526] border border-slate-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium tracking-wider block mb-1">
                Boxes Passed Through
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-white font-mono">{totalInspected}</span>
                <span className="text-xs text-slate-400">total units</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Layers className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Passed */}
          <div className="bg-[#0B1526] border border-slate-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium tracking-wider block mb-1">
                Valid Deliverable Packages (End Sensor)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">{passCount}</span>
                <span className="text-xs text-emerald-500/80 font-mono">({passRate}%)</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {/* Ejected / Failed */}
          <div className="bg-[#0B1526] border border-slate-800/80 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium tracking-wider block mb-1">
                Damaged Packages (Diverted Sensor)
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-red-400 font-mono">{rejectCount}</span>
                <span className="text-xs text-slate-400">ejected by pusher</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        {/* 4. Conditional Content: Conveyor Monitor vs Statistics & Graphs */}
        {activeTab === 'monitor' ? (
          <>
            {/* Top-Down Conveyor & Pneumatic Cylinder Divert Simulation */}
            <ConveyorTopDownSimulation 
              isRunning={demoModeActive}
              onToggleRunning={toggleDemoMode}
              latestParcel={latestParcel}
            />

            {/* Active Inspection Banner (Immediate feedback on latest box) */}
            <div className={`p-4 sm:p-5 rounded-xl border transition-all shadow-md ${
              latestParcel.status === 'REJECT'
                ? 'bg-red-950/30 border-red-500/40'
                : 'bg-[#0B1526] border-slate-800'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3.5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    latestParcel.status === 'REJECT'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {latestParcel.status === 'REJECT' ? (
                      <XCircle className="w-5 h-5 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Latest Box Scanned:</span>
                      <span className="font-mono text-sm sm:text-base font-bold text-white">
                        {latestParcel.trackingNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        latestParcel.status === 'REJECT'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {latestParcel.status === 'REJECT' ? 'EJECTED / FAILED' : 'PASSED'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-sans">
                      {latestParcel.status === 'REJECT' 
                        ? `Reason: ${latestParcel.rejectReason || latestParcel.damageType} (AI Confidence: ${latestParcel.aiConfidence}%) • Weight: ${latestParcel.weight} kg`
                        : `Parcel passed optical defect inspection & weight tolerance • Weight: ${latestParcel.weight} kg`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 self-end sm:self-center">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Timestamp: <strong className="text-slate-200">{latestParcel.time}</strong></span>
                </div>
              </div>
            </div>

            {/* Clean Inspection Records Table */}
            <div className="bg-[#0B1526] border border-slate-800/80 rounded-xl shadow-xl overflow-hidden flex flex-col">
              {/* Table Header & Search Filter */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Inspection & Ejection Records</span>
                    <span className="text-xs font-mono font-normal text-slate-400">
                      ({filteredRecords.length} records)
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exact timestamps, ejection reasons, and pass/fail audit data saved to database
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status Filter Tabs */}
                  <div className="flex bg-[#070E1A] p-1 rounded-lg border border-slate-700/60 font-mono text-xs">
                    {(['ALL', 'PASS', 'REJECT'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                          statusFilter === f 
                            ? 'bg-slate-700 text-white shadow' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f === 'ALL' ? 'All' : f === 'PASS' ? 'Passed' : 'Ejected'}
                      </button>
                    ))}
                  </div>

                  {/* Search Box */}
                  <div className="relative w-44 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tracking / reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#070E1A] border border-slate-700 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Table Data */}
              <div className="overflow-x-auto max-h-[560px] overflow-y-auto font-mono text-xs">
                {filteredRecords.length === 0 ? (
                  <div className="py-16 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>No inspection records matching query.</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#070E1A] border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider z-10">
                      <tr>
                        <th className="p-3.5 pl-5">Status</th>
                        <th className="p-3.5">Tracking Number</th>
                        <th className="p-3.5">Timestamp (Ejection / Scan)</th>
                        <th className="p-3.5">Defect / Inspection Detail</th>
                        <th className="p-3.5">Confidence</th>
                        <th className="p-3.5">Weight</th>
                        <th className="p-3.5 pr-5 text-right">Database Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRecords.map((r, i) => {
                        const isReject = r.status === 'REJECT';
                        const timeFormatted = r.created_at ? new Date(r.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) : '-';

                        return (
                          <tr 
                            key={`${r.tracking_no}-${i}`}
                            className={`transition hover:bg-slate-800/40 ${
                              isReject ? 'bg-red-950/10' : ''
                            }`}
                          >
                            <td className="p-3.5 pl-5">
                              <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isReject 
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isReject ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                <span>{isReject ? 'EJECTED' : 'PASSED'}</span>
                              </span>
                            </td>

                            <td className="p-3.5 font-bold text-white">
                              {r.tracking_no}
                            </td>

                            <td className="p-3.5 text-slate-300">
                              <span className="flex items-center space-x-1.5">
                                <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>{timeFormatted}</span>
                              </span>
                            </td>

                            <td className="p-3.5">
                              {isReject ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-red-300">
                                    {r.damage_type}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-sans">
                                    {r.reject_reason || 'Diverted to quarantine bin'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Normal / Passed</span>
                              )}
                            </td>

                            <td className="p-3.5 text-cyan-400 font-semibold">
                              {Number(r.confidence).toFixed(1)}%
                            </td>

                            <td className="p-3.5 text-slate-300">
                              {Number(r.weight_kg).toFixed(2)} kg
                            </td>

                            <td className="p-3.5 pr-5 text-right text-slate-400 text-[11px]">
                              {r.handled ? (
                                <span className="text-emerald-400 font-medium">
                                  Resolved: {r.handled_reason || 'Cleared'}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  Logged in DB
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Statistics & Graphs Tab View */
          <StatisticsMonitoringView 
            dbRecords={dbRecords}
            liveParcels={parcels}
            totalInspected={totalInspected}
            passCount={passCount}
            rejectCount={rejectCount}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-3 bg-[#0B1526] text-center text-xs text-slate-500 font-mono">
        SPDI Real-Time Inspection • Clean Operations Stream
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <Dashboard />
    </SimulationProvider>
  );
}
