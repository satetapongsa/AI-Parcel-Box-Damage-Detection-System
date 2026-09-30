import React, { useState } from 'react';
import { 
  Search, 
  Eye, 
  Download, 
  Box, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import type { ParcelInspection } from '../types/inspection';

interface InspectionHistoryPageProps {
  parcels: ParcelInspection[];
  onSelectParcel: (parcelId: string) => void;
}

export const InspectionHistoryPage: React.FC<InspectionHistoryPageProps> = ({
  parcels,
  onSelectParcel
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtering logic
  const filteredParcels = parcels.filter((p) => {
    const matchesSearch = p.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.damageType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResult = selectedResult === 'ALL' || p.result === selectedResult;
    const matchesSeverity = selectedSeverity === 'ALL' || p.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;

    return matchesSearch && matchesResult && matchesSeverity && matchesStatus;
  });

  const totalPages = Math.ceil(filteredParcels.length / itemsPerPage) || 1;
  const paginatedParcels = filteredParcels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedResult('ALL');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setCurrentPage(1);
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'NORMAL':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'DAMAGED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'WET':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'OPEN':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'HOLD':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'MANUAL INSPECTION':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Inspection History
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Search, filter, and audit past parcel AI condition scans and quarantine decisions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert('Exporting CSV report for current query...')}
            className="flex items-center space-x-2 bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-200 font-mono text-xs px-3.5 py-2 rounded-lg transition-all"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-navy-900 border border-navy-700 p-4 rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Search Parcel ID (e.g. PX20260930001)..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Result Filter */}
          <div>
            <select
              value={selectedResult}
              onChange={(e) => { setSelectedResult(e.target.value); setCurrentPage(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Results</option>
              <option value="NORMAL">NORMAL</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="WET">WET</option>
              <option value="OPEN">OPEN</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => { setSelectedSeverity(e.target.value); setCurrentPage(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="NONE">NONE</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASS">PASS</option>
              <option value="HOLD">HOLD</option>
              <option value="MANUAL INSPECTION">MANUAL INSPECTION</option>
            </select>
          </div>

        </div>

        {/* Filter Summary Strip */}
        <div className="flex items-center justify-between pt-2 border-t border-navy-800 text-xs font-mono text-slate-400">
          <div>
            Found <span className="text-blue-400 font-bold">{filteredParcels.length}</span> matching parcels
          </div>

          {(searchTerm || selectedResult !== 'ALL' || selectedSeverity !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={resetFilters}
              className="text-blue-400 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-navy-900 border border-navy-700 rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-navy-950 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-navy-700">
              <tr>
                <th className="px-4 py-3.5">Parcel ID</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Thumbnail</th>
                <th className="px-4 py-3.5">Result</th>
                <th className="px-4 py-3.5">Damage Type</th>
                <th className="px-4 py-3.5">Confidence</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Decision Status</th>
                <th className="px-4 py-3.5">Inspector</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 font-mono">
              {paginatedParcels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500">
                    No parcels match the current query criteria.
                  </td>
                </tr>
              ) : (
                paginatedParcels.map((p) => (
                  <tr key={p.id} className="hover:bg-navy-800/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">
                      {p.parcelId}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {p.timestamp}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="w-12 h-8 rounded bg-navy-950 border border-navy-700 flex items-center justify-center relative overflow-hidden">
                        <Box className={`w-4 h-4 ${p.result === 'NORMAL' ? 'text-emerald-400' : 'text-red-400'}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getResultBadge(p.result)}`}>
                        {p.result}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-200">
                      {p.damageType}
                    </td>
                    <td className="px-4 py-3.5 text-blue-400 font-bold">
                      {p.confidence}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${
                        p.severity === 'HIGH' || p.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 font-bold'
                          : p.severity === 'MEDIUM'
                          ? 'bg-orange-500/20 text-orange-400 font-bold'
                          : 'text-slate-400'
                      }`}>
                        {p.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${getStatusBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                      {p.inspector || 'AI Autonomous'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => onSelectParcel(p.parcelId)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold transition-all inline-flex items-center space-x-1 shadow"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-navy-950 border-t border-navy-700 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Showing Page <span className="text-white font-bold">{currentPage}</span> of{' '}
            <span className="text-white font-bold">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-750"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-slate-300">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded bg-navy-800 border border-navy-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy-750"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
