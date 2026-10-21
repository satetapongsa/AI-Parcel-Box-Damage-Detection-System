import React, { useState } from 'react';
import { Save, RotateCcw, Cpu, Gauge, Sliders, AlertCircle } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { calculateRequiredActuatorDistance } from '../lib/sim/rules';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSimulation();

  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(settings.aiConfidenceThreshold);
  const [weightTolerancePct, setWeightTolerancePct] = useState(settings.weightTolerancePct);
  const [conveyorSpeedMs, setConveyorSpeedMs] = useState(settings.conveyorSpeedMs);
  const [aiInferenceSec, setAiInferenceSec] = useState(settings.aiInferenceSec);
  const [actuatorDelayMs, setActuatorDelayMs] = useState(settings.actuatorDelayMs);
  const [actuatorType, setActuatorType] = useState<'PNEUMATIC' | 'SERVO'>(settings.actuatorType);
  const [actuatorDistanceInstalledM, setActuatorDistanceInstalledM] = useState(settings.actuatorDistanceInstalledM);
  const [irTimeoutSec, setIrTimeoutSec] = useState(settings.irTimeoutSec);
  const [minBrightness, setMinBrightness] = useState(settings.minBrightness);
  const [offlineQueueLimit, setOfflineQueueLimit] = useState(settings.offlineQueueLimit);
  const [reviewStateEnabled, setReviewStateEnabled] = useState(settings.reviewStateEnabled);

  // Real-time calculation: Required Distance = Speed * (AI Time + Delay)
  const requiredDistanceM = calculateRequiredActuatorDistance(
    conveyorSpeedMs,
    aiInferenceSec,
    actuatorDelayMs
  );
  const isTimingSufficient = actuatorDistanceInstalledM >= requiredDistanceM;

  const handleSave = () => {
    updateSettings({
      aiConfidenceThreshold,
      weightTolerancePct,
      conveyorSpeedMs,
      aiInferenceSec,
      actuatorDelayMs,
      actuatorType,
      actuatorDistanceInstalledM,
      irTimeoutSec,
      minBrightness,
      offlineQueueLimit,
      reviewStateEnabled
    });
  };

  const handleReset = () => {
    resetSettings();
    setAiConfidenceThreshold(85);
    setWeightTolerancePct(5);
    setConveyorSpeedMs(0.75);
    setAiInferenceSec(0.20);
    setActuatorDelayMs(180);
    setActuatorType('PNEUMATIC');
    setActuatorDistanceInstalledM(0.35);
    setIrTimeoutSec(3.0);
    setMinBrightness(120);
    setOfflineQueueLimit(500);
    setReviewStateEnabled(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      {/* Enterprise Page Header */}
      <PageHeader
        title="Engineering System Parameters & Control Config"
        description="พารามิเตอร์ทั้งหมดในตารางข้อ 6.2 พร้อมการคำนวณระยะตัวปัดเรียลไทม์ (Case 3 Delay Tuning)"
        badge="SIMULATION CONFIG"
        badgeType="sky"
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#162235] text-slate-300 font-mono text-xs font-bold transition flex items-center space-x-1.5 border border-[#26354A]"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition flex items-center space-x-2 shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Parameters</span>
            </button>
          </div>
        }
      />

      {/* Real-time Calculation Banner: Required vs Installed Distance */}
      <div className={`p-4 rounded-xl border font-mono text-xs flex flex-col md:flex-row items-center justify-between gap-3 ${
        isTimingSufficient ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-red-950/60 border-red-500 text-red-300 animate-pulse'
      }`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold">Real-time Timing Calculation (Case 3 Delay Tuning):</span>
            <span className="ml-2 font-normal text-slate-300">
              ระยะต้องการ = {conveyorSpeedMs}m/s × ({aiInferenceSec}s + {actuatorDelayMs/1000}s) = <strong>{requiredDistanceM} m</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span>ระยะติดตั้งจริง: <strong>{actuatorDistanceInstalledM} m</strong></span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            isTimingSufficient ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500 text-white'
          }`}>
            {isTimingSufficient ? 'TIMING OK' : 'MISSED_REJECT ALERT'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        {/* Section 1: AI & Decision Engine */}
        <SectionCard title="1. AI Inference & Decision Thresholds" icon={Cpu}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Confidence Threshold:</span>
                <span className="text-sky-400 font-bold">{aiConfidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={aiConfidenceThreshold}
                onChange={(e) => setAiConfidenceThreshold(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                REJECT เมื่อตรวจพบความเสียหายและ confidence &ge; {aiConfidenceThreshold}%
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Weight Tolerance (%):</span>
                <span className="text-emerald-400 font-bold">±{weightTolerancePct}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={weightTolerancePct}
                onChange={(e) => setWeightTolerancePct(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                (ค่าสมมติ) เบี่ยงเบนเกินเกณฑ์จะถูกตีเป็น WEIGHT_ANOMALY
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-300 block">Review State (รอคนตรวจ):</span>
                  <span className="text-[10px] text-slate-500 font-sans">Confidence 60-85% to REVIEW</span>
                </div>
                <input
                  type="checkbox"
                  checked={reviewStateEnabled}
                  onChange={(e) => setReviewStateEnabled(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Actuator & Conveyor Timing */}
        <SectionCard title="2. Conveyor & Actuator Hardware" icon={Gauge}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Conveyor Speed (m/s):</span>
                <span className="text-sky-400 font-bold">{conveyorSpeedMs} m/s</span>
              </div>
              <input
                type="range"
                step="0.05"
                min="0.2"
                max="2.0"
                value={conveyorSpeedMs}
                onChange={(e) => setConveyorSpeedMs(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-300">AI Inference Time (s):</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">ต้องวัดจริง</span>
                </div>
                <span className="text-purple-400 font-bold">{aiInferenceSec} s</span>
              </div>
              <input
                type="range"
                step="0.05"
                min="0.05"
                max="1.0"
                value={aiInferenceSec}
                onChange={(e) => setAiInferenceSec(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Actuator Delay Time:</span>
                <span className="text-purple-400 font-bold">{actuatorDelayMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                value={actuatorDelayMs}
                onChange={(e) => setActuatorDelayMs(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Actuator Installed Distance:</span>
                <span className="text-emerald-400 font-bold">{actuatorDistanceInstalledM} m</span>
              </div>
              <input
                type="range"
                step="0.05"
                min="0.1"
                max="1.5"
                value={actuatorDistanceInstalledM}
                onChange={(e) => setActuatorDistanceInstalledM(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Actuator Mechanism (รอทีมยืนยัน):</label>
              <select
                value={actuatorType}
                onChange={(e) => setActuatorType(e.target.value as 'PNEUMATIC' | 'SERVO')}
                className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="PNEUMATIC">Pneumatic Cylinder (ตาม System Flow หน้า 5)</option>
                <option value="SERVO">Servo Motor (ตาม Wokwi สไลด์ 6)</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Sensor Fault Tolerances & Queue */}
        <SectionCard title="3. Failure Limits & Store-and-Forward" icon={Sliders}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">IR Timeout (Belt Jam):</span>
                <span className="text-amber-400 font-bold">{irTimeoutSec} s</span>
              </div>
              <input
                type="range"
                step="0.5"
                min="1.0"
                max="10.0"
                value={irTimeoutSec}
                onChange={(e) => setIrTimeoutSec(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                บังลำแสงค้างเกินเวลานี้ = Belt Jam หยุดสายพานทันที
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Min Brightness (Vision Fault):</span>
                <span className="text-amber-400 font-bold">{minBrightness} Lux</span>
              </div>
              <input
                type="range"
                min="50"
                max="250"
                value={minBrightness}
                onChange={(e) => setMinBrightness(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                ความสว่างเฉลี่ยต่ำกว่าเกณฑ์ = กล้องมัว/ไฟดับ
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Store-and-Forward Queue Limit:</span>
                <span className="text-cyan-400 font-bold">{offlineQueueLimit} records</span>
              </div>
              <input
                type="range"
                step="50"
                min="100"
                max="1000"
                value={offlineQueueLimit}
                onChange={(e) => setOfflineQueueLimit(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                เมื่อเต็มจะทิ้งแถวที่เก่าสุด (FIFO) ตามโค้ด bridge.py
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
