import React, { useState } from 'react';
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  Database,
  RefreshCw,
  Search,
  Scale
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { MetricCard } from '../components/common/MetricCard';
import { SectionCard } from '../components/common/SectionCard';

export const OverviewPage: React.FC = () => {
  const { 
    parcels,
    latestParcel, 
    dbRecords,
    isLoadingDb,
    refreshDbRecords,
    rejectQueue
  } = useSimulation();

  const [dbSearch, setDbSearch] = useState('');

  // Calculate live statistics
  const totalCount = parcels.length;
  const rejectCount = parcels.filter((p) => p.status === 'REJECT').length;
  const passCount = totalCount - rejectCount;
  const rejectRate = totalCount > 0 ? ((rejectCount / totalCount) * 100).toFixed(1) : '0.0';
  const passRate = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) : '100.0';

  const dentCount = parcels.filter((p) => p.damageType === 'DENT').length;
  const tearCount = parcels.filter((p) => p.damageType === 'TEAR').length;
  const wetCount = parcels.filter((p) => p.damageType === 'WATER_STAIN').length;
  const weightCount = parcels.filter((p) => p.damageType === 'WEIGHT_ANOMALY').length;

  const filteredDbRecords = dbRecords.filter((r) => 
    r.tracking_no.toLowerCase().includes(dbSearch.toLowerCase()) ||
    r.damage_type.toLowerCase().includes(dbSearch.toLowerCase()) ||
    r.status.toLowerCase().includes(dbSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* 1. Page Header for Operators */}
      <PageHeader
        title="แดชบอร์ดตรวจสอบและมอนิเตอร์สายพานพัสดุ (Live Operations Hub)"
        description="หน้าจอสรุปข้อมูลสำหรับคนงานคัดแยกและตรวจสอบสถานะพัสดุ เชื่อมต่อฐานข้อมูล Neon PostgreSQL แบบเรียลไทม์"
        badge="ONLINE DISPATCH"
        badgeType="green"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refreshDbRecords()}
              disabled={isLoadingDb}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition flex items-center space-x-1.5 shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>ดึงข้อมูล Neon DB</span>
            </button>
          </div>
        }
      />

      {/* 2. Key Operational Metrics for Workers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="จำนวนพัสดุที่ตรวจแล้ว"
          value={String(totalCount)}
          trend="รอบการทำงานปัจจุบัน"
          color="sky"
          icon={Package}
        />
        <MetricCard
          title="ผ่านเกณฑ์ (PASS)"
          value={`${passCount} กล่อง`}
          trend={`อัตราผ่าน ${passRate}%`}
          color="emerald"
          icon={CheckCircle2}
        />
        <MetricCard
          title="ชำรุด / ปัดออก (REJECT)"
          value={`${rejectCount} กล่อง`}
          trend={`อัตราชำรุด ${rejectRate}%`}
          color="red"
          icon={XCircle}
        />
        <MetricCard
          title="กล่องรอคนงานจัดการ"
          value={`${rejectQueue.length} กล่อง`}
          trend="ในราง Quarantine Bin"
          color="amber"
          icon={Scale}
        />
      </div>

      {/* 3. Defect Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="bg-[#0B1424] border border-slate-800 p-3 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-[10px] block">รอยบุบ (DENT)</span>
            <span className="text-lg font-bold text-amber-400">{dentCount} กล่อง</span>
          </div>
        </div>
        <div className="bg-[#0B1424] border border-slate-800 p-3 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-[10px] block">รอยฉีกขาด (TEAR)</span>
            <span className="text-lg font-bold text-red-400">{tearCount} กล่อง</span>
          </div>
        </div>
        <div className="bg-[#0B1424] border border-slate-800 p-3 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-[10px] block">เปียกน้ำ (WET)</span>
            <span className="text-lg font-bold text-cyan-400">{wetCount} กล่อง</span>
          </div>
        </div>
        <div className="bg-[#0B1424] border border-slate-800 p-3 rounded-xl flex justify-between items-center">
          <div>
            <span className="text-slate-400 text-[10px] block">น้ำหนักผิดปกติ</span>
            <span className="text-lg font-bold text-purple-400">{weightCount} กล่อง</span>
          </div>
        </div>
      </div>

      {/* 4. Live Inspection Status & Latest Box Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Latest Parcel Inspection Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <SectionCard title="พัสดุล่าสุด ณ จุดตรวจ (Active Box)" icon={Package}>
            <div className={`p-4 rounded-xl border mb-3 ${
              latestParcel.status === 'REJECT'
                ? 'bg-red-950/40 border-red-500/80 text-red-400'
                : 'bg-emerald-950/40 border-emerald-500/80 text-emerald-400'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider">
                  ผลการตัดสินใจ: {latestParcel.status}
                </span>
                <span className="text-xs font-mono text-slate-300">{latestParcel.time}</span>
              </div>
              <h2 className="text-xl font-bold font-mono text-white tracking-tight">
                {latestParcel.trackingNumber}
              </h2>
              <p className="text-xs text-slate-300 font-sans mt-2">
                {latestParcel.status === 'REJECT'
                  ? `สาเหตุ: ${latestParcel.rejectReason || latestParcel.damageType} (ปัดออกอัตโนมัติ)`
                  : 'ผ่านการตรวจสอบ กล่องสภาพสมบูรณ์ พร้อมส่งต่อไปยังสายพานหลัก'}
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">ชนิดความเสียหาย:</span>
                <span className="font-bold text-white">{latestParcel.damageType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">ความมั่นใจ AI:</span>
                <span className="font-bold text-cyan-400">{latestParcel.aiConfidence}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">น้ำหนักจริง:</span>
                <span className="font-bold text-white">{latestParcel.weight} kg (เกณฑ์ {latestParcel.expectedWeight} kg)</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-400">สถานะตัวปัด:</span>
                <span className={latestParcel.actuatorTriggered ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {latestParcel.actuatorTriggered ? 'ตัวปัดทำงาน (ดันลงรางคัดแยก)' : 'ไม่ทำงาน (ผ่านฉลุย)'}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Neon PostgreSQL Live Records Table (7 Cols) */}
        <div className="lg:col-span-7">
          <SectionCard 
            title="ตารางบันทึกฐานข้อมูลจริง Neon PostgreSQL (Real-Time DB Records)" 
            icon={Database}
            headerActions={
              <div className="flex items-center space-x-2">
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ค้นหาใน DB..."
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    className="w-full bg-[#070D1B] border border-slate-700 text-xs text-white rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            }
          >
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto font-mono text-xs">
              {filteredDbRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {isLoadingDb ? 'กำลังโหลดข้อมูลจาก Neon DB...' : 'ยังไม่มีข้อมูลบันทึก หรือไม่พบคำค้นหา'}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#070D1B] z-10">
                    <tr className="text-[#94A3B8] border-b border-[#26354A] text-[10px] uppercase">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Tracking No.</th>
                      <th className="p-2.5">สถานะ</th>
                      <th className="p-2.5">ชนิด</th>
                      <th className="p-2.5">น้ำหนัก</th>
                      <th className="p-2.5">สาเหตุ</th>
                      <th className="p-2.5 text-right">เวลาบันทึก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26354A]">
                    {filteredDbRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/50">
                        <td className="p-2.5 text-slate-500">#{r.id}</td>
                        <td className="p-2.5 font-bold text-white">{r.tracking_no}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">{r.damage_type}</td>
                        <td className="p-2.5 text-slate-300">{Number(r.weight_kg).toFixed(2)} kg</td>
                        <td className="p-2.5 text-slate-400 truncate max-w-[150px]">
                          {r.reject_reason || '-'}
                        </td>
                        <td className="p-2.5 text-slate-500 text-right text-[10px]">
                          {new Date(r.created_at).toLocaleTimeString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

    </div>
  );
};
