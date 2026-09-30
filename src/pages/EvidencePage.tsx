import React, { useState } from 'react';
import { 
  FolderArchive, 
  Search, 
  Eye, 
  Download, 
  Box, 
  FileCheck
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import type { ParcelRecord } from '../types/spdi';
import { InspectionVisualizer } from '../components/InspectionVisualizer';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

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
    showToast('Evidence Exported', `QA Package for ${trackingNumber} exported as JSON/PDF report.`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Evidence Management Portal"
        description="Search, audit, and export machine vision inspection evidence for claims & QA compliance"
        badge={`${parcels.length} RECORDS`}
        badgeType="sky"
      />

      {/* Search & Filter Bar */}
      <SectionCard title="Filter & Search Records" icon={FolderArchive}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Search Tracking Number (e.g. THA-20260930-001248)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Damage Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Damage Classes</option>
              <option value="NORMAL">NORMAL</option>
              <option value="DENT">DENT</option>
              <option value="TEAR">TEAR</option>
              <option value="WATER_STAIN">WATER STAIN</option>
              <option value="WEIGHT_ANOMALY">WEIGHT ANOMALY</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Decision Statuses</option>
              <option value="PASS">PASS</option>
              <option value="REJECT">REJECT</option>
            </select>
          </div>

        </div>
      </SectionCard>

      {/* Evidence Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParcels.map((p) => {
          const isRej = p.status === 'REJECT';
          return (
            <div
              key={p.id}
              className="bg-[#162235] border border-[#26354A] p-4 rounded-xl shadow-md space-y-3 hover:border-sky-500/50 transition-all font-mono text-xs flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#26354A] pb-2">
                  <span className="font-bold text-sky-400 text-sm truncate pr-2">{p.trackingNumber}</span>
                  <StatusBadge status={p.status} size="sm" />
                </div>

                {/* Mini visual thumbnail */}
                <div className="h-28 bg-[#0F172A] rounded-lg border border-[#26354A] overflow-hidden relative flex items-center justify-center">
                  <Box className={`w-8 h-8 ${isRej ? 'text-red-400' : 'text-emerald-400'}`} />
                  <div className="absolute bottom-2 left-2 right-2 text-[10px] text-slate-400 bg-black/70 backdrop-blur px-2 py-1 rounded flex justify-between">
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
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#26354A]">
                <button
                  onClick={() => setSelectedParcel(p)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Evidence</span>
                </button>

                <button
                  onClick={() => handleDownloadEvidence(p.trackingNumber)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0F172A]"
                  title="Download Evidence Package"
                >
                  <Download className="w-4 h-4 text-sky-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* EVIDENCE DETAIL MODAL */}
      {selectedParcel && (
        <Modal
          isOpen={!!selectedParcel}
          onClose={() => setSelectedParcel(null)}
          title={`Evidence Audit: ${selectedParcel.trackingNumber}`}
          subtitle={`QA Inspection Audit Trail • Station: ${selectedParcel.stationId}`}
          maxWidth="4xl"
          footerActions={
            <>
              <button
                onClick={() => setSelectedParcel(null)}
                className="px-4 py-2 bg-[#162235] hover:bg-[#26354A] text-slate-300 rounded-lg text-xs font-mono font-bold transition-all"
              >
                Close Window
              </button>
              <button
                onClick={() => handleDownloadEvidence(selectedParcel.trackingNumber)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-2 shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export Certified Package</span>
              </button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider block">
                Machine Vision Dual Camera Evidentiary Capture
              </span>
              <InspectionVisualizer parcel={selectedParcel} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-[#162235] p-4 rounded-xl border border-[#26354A] space-y-2">
                <h4 className="font-bold text-white border-b border-[#26354A] pb-1 uppercase flex items-center justify-between">
                  <span>AI Defect & Weight Analysis</span>
                  <StatusBadge status={selectedParcel.status} size="sm" />
                </h4>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">Class Result:</span>
                  <span className={`font-bold ${selectedParcel.status === 'REJECT' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {selectedParcel.damageType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">AI Confidence:</span>
                  <span className="text-sky-400 font-bold">{selectedParcel.aiConfidence}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">Measured Weight:</span>
                  <span className="text-white font-bold">{selectedParcel.weight} kg</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">Expected Weight:</span>
                  <span className="text-slate-300">{selectedParcel.expectedWeight} kg</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#94A3B8]">Weight Difference:</span>
                  <span className="text-emerald-400 font-bold">{selectedParcel.weightDifference}%</span>
                </div>
              </div>

              <div className="bg-[#162235] p-4 rounded-xl border border-[#26354A] space-y-2">
                <h4 className="font-bold text-white border-b border-[#26354A] pb-1 uppercase flex items-center space-x-1.5">
                  <FileCheck className="w-4 h-4 text-sky-400" />
                  <span>Hardware & Actuator Audit</span>
                </h4>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">Station ID:</span>
                  <span className="text-white font-bold">{selectedParcel.stationId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
                  <span className="text-[#94A3B8]">IR Sensor Trigger:</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#26354A]">
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
        </Modal>
      )}

    </div>
  );
};

