import React, { useState } from 'react';
import { 
  FolderArchive, 
  Search, 
  Eye, 
  Download, 
  X, 
  Box, 
  FileCheck
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import type { ParcelRecord } from '../types/spdi';
import { InspectionVisualizer } from '../components/InspectionVisualizer';

export const EvidencePage: React.FC = () => {
  const { parcels, showToast } = useSimulation();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedParcel, setSelectedParcel] = useState<ParcelRecord | null>(null);

  const filteredParcels = parcels.filter((p) => {
    const matchesSearch = p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || p.damageType === filterType;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDownloadEvidence = (trackingNumber: string) => {
    showToast('Evidence Downloaded', `QA Package evidence for ${trackingNumber} exported as PDF/JSON report.`, 'success');
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <FolderArchive className="w-6 h-6 text-sky-400" />
            <span>Evidence Management & Claim QA Portal</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Search, verify, and export computer vision evidence for claims & customer support
          </p>
        </div>

        <div className="text-xs font-mono text-[#94A3B8] bg-[#172235] px-3 py-1.5 rounded-lg border border-[#26344A]">
          Total Evidence Records: <span className="text-sky-400 font-bold">{parcels.length}</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Tracking Search Input */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Search Tracking Number (e.g. THA-20260930-001248)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#07111F] border border-[#26344A] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Damage Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-[#07111F] border border-[#26344A] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Damage Classes</option>
              <option value="NORMAL">NORMAL</option>
              <option value="DENT">DENT</option>
              <option value="TEAR">TEAR</option>
              <option value="WATER_STAIN">WATER STAIN</option>
              <option value="WEIGHT_ANOMALY">WEIGHT ANOMALY</option>
            </select>
          </div>

          {/* Decision Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#07111F] border border-[#26344A] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Decision Statuses</option>
              <option value="PASS">PASS</option>
              <option value="REJECT">REJECT</option>
            </select>
          </div>

        </div>
      </div>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParcels.map((p) => {
          const isRej = p.status === 'REJECT';
          return (
            <div
              key={p.id}
              className="bg-[#101A2B] border border-[#26344A] p-4 rounded-xl shadow-md space-y-3 hover:border-sky-500/50 transition-all font-mono text-xs"
            >
              <div className="flex items-center justify-between border-b border-[#26344A] pb-2">
                <span className="font-bold text-sky-400 text-sm">{p.trackingNumber}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isRej ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {p.status}
                </span>
              </div>

              {/* Mini visual thumbnail */}
              <div className="h-32 bg-[#07111F] rounded-lg border border-[#26344A] overflow-hidden relative flex items-center justify-center">
                <Box className={`w-8 h-8 ${isRej ? 'text-red-400' : 'text-emerald-400'}`} />
                <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-400 bg-black/60 backdrop-blur px-2 py-0.5 rounded flex justify-between">
                  <span>Class: <strong className="text-white">{p.damageType}</strong></span>
                  <span>Conf: <strong className="text-sky-400">{p.aiConfidence}%</strong></span>
                </div>
              </div>

              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Scan Time:</span>
                  <span>{p.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Weight:</span>
                  <span>{p.weight} kg (Diff: {p.weightDifference}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94A3B8]">Station:</span>
                  <span>{p.stationId}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#26344A]">
                <button
                  onClick={() => setSelectedParcel(p)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Evidence</span>
                </button>

                <button
                  onClick={() => handleDownloadEvidence(p.trackingNumber)}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#172235]"
                  title="Download Evidence Tag"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EVIDENCE DETAIL DRAWER / MODAL */}
      {selectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-[#101A2B] border border-[#26344A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#26344A] bg-[#07111F] flex items-center justify-between">
              <div className="flex items-center space-x-3 font-mono">
                <FileCheck className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Evidence Record: {selectedParcel.trackingNumber}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    QA Evidence Audit Trail • Timestamp: {selectedParcel.timestamp}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedParcel(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#172235]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Dual Camera Visualizer in Modal */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider block">
                  Machine Vision Dual Camera Evidentiary Capture
                </span>
                <InspectionVisualizer parcel={selectedParcel} />
              </div>

              {/* Evidence Metrics Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
                
                {/* Left metrics */}
                <div className="bg-[#172235] p-4 rounded-xl border border-[#26344A] space-y-2">
                  <h4 className="font-bold text-white border-b border-[#26344A] pb-1 uppercase">
                    AI Defect & Weight Analysis
                  </h4>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">Class Result:</span>
                    <span className={`font-bold ${selectedParcel.status === 'REJECT' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedParcel.damageType}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">AI Confidence:</span>
                    <span className="text-sky-400 font-bold">{selectedParcel.aiConfidence}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">Measured Weight:</span>
                    <span className="text-white font-bold">{selectedParcel.weight} kg</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">Expected Weight:</span>
                    <span className="text-slate-300">{selectedParcel.expectedWeight} kg</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#94A3B8]">Weight Diff:</span>
                    <span className="text-emerald-400 font-bold">{selectedParcel.weightDifference}%</span>
                  </div>
                </div>

                {/* Right sensor status */}
                <div className="bg-[#172235] p-4 rounded-xl border border-[#26344A] space-y-2">
                  <h4 className="font-bold text-white border-b border-[#26344A] pb-1 uppercase">
                    Hardware & Actuator Audit
                  </h4>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">Station ID:</span>
                    <span className="text-white font-bold">{selectedParcel.stationId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">IR Sensor Trigger:</span>
                    <span className="text-emerald-400 font-bold">VERIFIED</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#26344A]">
                    <span className="text-[#94A3B8]">Pneumatic Reject Action:</span>
                    <span className={`font-bold ${selectedParcel.actuatorTriggered ? 'text-red-400' : 'text-emerald-400'}`}>
                      {selectedParcel.actuatorTriggered ? 'TRIGGERED (QUARANTINED)' : 'PASSED'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#94A3B8]">Cloud Sync Status:</span>
                    <span className="text-sky-400 font-bold">
                      {selectedParcel.syncedToCloud ? 'SYNCHRONIZED' : 'QUEUED IN LOCAL DB'}
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#26344A] bg-[#07111F] flex items-center justify-between">
              <button
                onClick={() => setSelectedParcel(null)}
                className="px-4 py-2 bg-[#172235] hover:bg-[#26344A] text-slate-300 rounded-lg text-xs font-mono font-bold transition-all"
              >
                Close Window
              </button>

              <button
                onClick={() => handleDownloadEvidence(selectedParcel.trackingNumber)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-2 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Certified Evidence Tag</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
