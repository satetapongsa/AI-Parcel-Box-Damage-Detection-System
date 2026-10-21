import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Play, 
  CheckCircle2,
  XCircle,
  Download,
  WifiOff,
  EyeOff,
  Clock
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';

export const FailureTestsPage: React.FC = () => {
  const { 
    faults, 
    setFault, 
    runTestSuite, 
    testSuiteResult 
  } = useSimulation();

  const [isRunningSuite, setIsRunningSuite] = useState(false);

  const handleRunAll = async () => {
    setIsRunningSuite(true);
    await runTestSuite();
    setIsRunningSuite(false);
  };

  const handleDownloadCsv = () => {
    if (!testSuiteResult) return;
    const headers = ['Test Name', 'Category', 'Status', 'Metric', 'Threshold', 'Timestamp'];
    const rows = testSuiteResult.results.map((r) => [
      `"${r.name}"`,
      `"${r.category}"`,
      r.status,
      `"${r.metric}"`,
      `"${r.threshold}"`,
      r.timestamp
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SPDI_Test_Suite_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      {/* Enterprise Page Header */}
      <PageHeader
        title="Failure Mode Test & Validation Lab"
        description="ชุดทดสอบความล้มเหลว 5 รายการตามสไลด์ 12 พร้อมระบบ Fault Injection แบบเรียลไทม์"
        badge="SIMULATION BENCHMARK"
        badgeType="amber"
        actions={
          <div className="flex items-center space-x-2">
            {testSuiteResult && (
              <button
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold transition flex items-center space-x-1.5 border border-slate-700 shadow"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Download CSV</span>
              </button>
            )}

            <button
              onClick={handleRunAll}
              disabled={isRunningSuite}
              className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition flex items-center space-x-2 shadow ${
                isRunningSuite ? 'bg-amber-600/50 text-slate-300 cursor-wait' : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>{isRunningSuite ? 'Executing Test Suite...' : 'Run Slide-12 Test Suite'}</span>
            </button>
          </div>
        }
      />

      {/* Manual Fault Injection Panel (Section 6.4) */}
      <SectionCard title="Real-Time Fault Injection Triggers (Section 6.4)" icon={AlertOctagon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Fault 1: Cut Internet */}
          <div className={`p-3.5 rounded-lg border transition ${
            faults.wanDisconnected ? 'bg-amber-950/60 border-amber-500/80' : 'bg-[#0F172A] border-[#26354A]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 flex items-center">
                <WifiOff className="w-4 h-4 mr-1 text-amber-400" />
                ตัดอินเทอร์เน็ต (Case 2)
              </span>
              <input
                type="checkbox"
                checked={faults.wanDisconnected}
                onChange={(e) => setFault('wanDisconnected', e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Edge ยังปัดต่อ ไฟเหลือง ข้อมูลเข้าคิว Local SQLite ต่อ LAN กลับแล้ว Sync
            </p>
          </div>

          {/* Fault 2: Vision Fault */}
          <div className={`p-3.5 rounded-lg border transition ${
            faults.visionFaultDark ? 'bg-amber-950/60 border-amber-500/80' : 'bg-[#0F172A] border-[#26354A]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 flex items-center">
                <EyeOff className="w-4 h-4 mr-1 text-amber-400" />
                Vision Fault (ภาพมืด)
              </span>
              <input
                type="checkbox"
                checked={faults.visionFaultDark}
                onChange={(e) => setFault('visionFaultDark', e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              ภาพมืดกว่า Min Brightness เตือนไฟเหลือง ลดระดับความมั่นใจโมเดล
            </p>
          </div>

          {/* Fault 3: Belt Jam */}
          <div className={`p-3.5 rounded-lg border transition ${
            faults.beltJam ? 'bg-red-950/60 border-red-500/80' : 'bg-[#0F172A] border-[#26354A]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-200 flex items-center">
                <Clock className="w-4 h-4 mr-1 text-red-400" />
                Belt Jam (IR Timeout)
              </span>
              <input
                type="checkbox"
                checked={faults.beltJam}
                onChange={(e) => setFault('beltJam', e.target.checked)}
                className="w-4 h-4 accent-red-500 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              IR ถูกบังค้างเกิน timeout หยุดสายพานทันที ไฟแดง+บัซเซอร์
            </p>
          </div>

          {/* Fault 4: Cloud Response Code */}
          <div className="p-3.5 rounded-lg border bg-[#0F172A] border-[#26354A]">
            <span className="font-bold text-slate-200 block mb-1">Cloud HTTP Status Code:</span>
            <select
              value={faults.cloudResponseFault}
              onChange={(e) => setFault('cloudResponseFault', e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              <option value="NONE">201 Created (Success)</option>
              <option value="AUTH_401">401 Unauthorized (Keep queue)</option>
              <option value="MALFORMED_422">422 Malformed (Drop item)</option>
              <option value="SERVER_500">500 Server Down (Retry)</option>
              <option value="RATE_LIMIT_429">429 Rate Limited (Retry)</option>
            </select>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              ทดสอบพฤติกรรม bridge.py ในการเก็บ/ทิ้งคิวตามรหัสตอบกลับ
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Test Suite Summary Banner & Results Table */}
      {testSuiteResult && (
        <div className="space-y-4">
          <div className="bg-[#0B1528] border border-cyan-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white uppercase">Test Suite Verification Summary</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded">
                  เกณฑ์ผ่าน &ge; 90% (ข้อเสนอทีม)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                ตัวเลขทั้งหมดมาจากการจำลองสถานการณ์ ห้ามนำไปอ้างอิงเป็นความแม่นยำของ AI จริง
              </p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">TOTAL</span>
                <span className="text-lg font-bold text-white">{testSuiteResult.totalTests}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-emerald-400 block">PASSED</span>
                <span className="text-lg font-bold text-emerald-400">{testSuiteResult.passedTests}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-red-400 block">FAILED</span>
                <span className="text-lg font-bold text-red-400">{testSuiteResult.failedTests}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-cyan-400 block">PASS RATE</span>
                <span className={`text-xl font-bold ${
                  testSuiteResult.passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {testSuiteResult.passRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-[#0B1528] border border-[#26354A] rounded-xl overflow-hidden font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#070D1B] text-[#94A3B8] border-b border-[#26354A] text-[10px] uppercase">
                  <th className="p-3">Scenario Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Result Status</th>
                  <th className="p-3">Observed Metric</th>
                  <th className="p-3">Validation Threshold</th>
                  <th className="p-3">Execution Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26354A]">
                {testSuiteResult.results.map((res, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-slate-200">{res.name}</td>
                    <td className="p-3 text-slate-400">{res.category}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {res.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{res.status}</span>
                      </span>
                    </td>
                    <td className="p-3 text-cyan-300 font-semibold">{res.metric}</td>
                    <td className="p-3 text-slate-400">{res.threshold}</td>
                    <td className="p-3 text-slate-500">{res.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
