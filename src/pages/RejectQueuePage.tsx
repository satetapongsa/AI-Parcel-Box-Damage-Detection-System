import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  Layers
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';

export const RejectQueuePage: React.FC = () => {
  const { rejectQueue, markRejectHandled } = useSimulation();
  const [selectedReason, setSelectedReason] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQueue = rejectQueue.filter((p) =>
    p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.damageType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = (id: string, defaultReason: string) => {
    const reason = selectedReason[id] || defaultReason || 'Manual Quarantine / Repacked';
    markRejectHandled(id, reason);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      {/* Enterprise Page Header */}
      <PageHeader
        title="Reject Queue & Quarantine Bin Management"
        description="รายการพัสดุชำรุดที่ถูกปัดออกสำหรับ Hub Operator ทำการตรวจซ้ำ ระบุเหตุผล และจัดการ"
        badge="OPERATOR CONSOLE"
        badgeType="amber"
      />

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
        <div className="bg-[#0B1528] border border-amber-900/60 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Awaiting Action</span>
            <span className="text-2xl font-bold text-amber-400">{rejectQueue.length} Boxes</span>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-400/60" />
        </div>

        <div className="bg-[#0B1528] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Quarantine Bin Status</span>
            <span className="text-sm font-bold text-emerald-400">Pneumatic Diverter Ready</span>
          </div>
          <Layers className="w-8 h-8 text-cyan-400/60" />
        </div>

        <div className="bg-[#0B1528] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Operator On Duty</span>
            <span className="text-sm font-bold text-slate-200">Hub Operator (Shift A)</span>
          </div>
          <Clock className="w-8 h-8 text-slate-500" />
        </div>
      </div>

      {/* Filter and Table Card */}
      <SectionCard 
        title="Quarantine Parcels Waiting for Physical Resolution" 
        icon={AlertTriangle}
        headerActions={
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Tracking / Defect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#070D1B] border border-slate-700 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        }
      >
        {filteredQueue.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500/50" />
            No parcels currently awaiting quarantine handling. All reject bins clear!
          </div>
        ) : (
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#070D1B] text-[#94A3B8] border-b border-[#26354A] text-[10px] uppercase">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Tracking Number</th>
                  <th className="p-3">Classified Defect</th>
                  <th className="p-3">AI Confidence</th>
                  <th className="p-3">Weight (Expected)</th>
                  <th className="p-3">Action Note</th>
                  <th className="p-3 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26354A]">
                {filteredQueue.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-400">{p.time}</td>
                    <td className="p-3 font-bold text-white">{p.trackingNumber}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                        {p.damageType}
                      </span>
                    </td>
                    <td className="p-3 text-cyan-300 font-bold">{p.aiConfidence}%</td>
                    <td className="p-3 text-slate-300">
                      {p.weight} kg <span className="text-slate-500">({p.expectedWeight} kg)</span>
                    </td>
                    <td className="p-3">
                      <select
                        value={selectedReason[p.id] || 'Repacked & Returned to Sender'}
                        onChange={(e) => setSelectedReason({ ...selectedReason, [p.id]: e.target.value })}
                        className="bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Repacked & Returned to Sender">Repacked & Returned to Sender</option>
                        <option value="Re-taped Flap / Normal Seam">Re-taped Flap / Re-weighed (Pass)</option>
                        <option value="Quarantined for Claim Evidence">Quarantined for Claim Evidence</option>
                        <option value="Discarded / Damaged Content">Discarded / Damaged Content</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleAction(p.id, selectedReason[p.id] || 'Repacked & Returned to Sender')}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition"
                      >
                        จัดการแล้ว (Resolved)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
