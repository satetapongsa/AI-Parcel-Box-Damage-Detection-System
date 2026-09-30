import React, { useState } from 'react';
import { Save, RotateCcw, Cpu, Camera, Gauge } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSimulation();

  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(settings.aiConfidenceThreshold);
  const [actuatorDelayMs, setActuatorDelayMs] = useState(settings.actuatorDelayMs);
  const [weightTolerancePct, setWeightTolerancePct] = useState(settings.weightTolerancePct);
  const [conveyorSpeedMs, setConveyorSpeedMs] = useState(settings.conveyorSpeedMs);
  const [cameraExposure, setCameraExposure] = useState(settings.cameraExposure);
  const [brightnessThreshold, setBrightnessThreshold] = useState(settings.brightnessThreshold);
  const [offlineQueueLimit, setOfflineQueueLimit] = useState(settings.offlineQueueLimit);

  const handleSave = () => {
    updateSettings({
      aiConfidenceThreshold,
      actuatorDelayMs,
      weightTolerancePct,
      conveyorSpeedMs,
      cameraExposure,
      brightnessThreshold,
      offlineQueueLimit
    });
  };

  const handleReset = () => {
    resetSettings();
    setAiConfidenceThreshold(85);
    setActuatorDelayMs(180);
    setWeightTolerancePct(5);
    setConveyorSpeedMs(0.75);
    setCameraExposure(450);
    setBrightnessThreshold(120);
    setOfflineQueueLimit(500);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Engineering System Parameters & Control Config"
        description="Configure decision thresholds, actuator timing calibration & store-and-forward limits"
        badge="CONFIG MODE"
        badgeType="sky"
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-lg bg-[#0F172A] hover:bg-[#162235] text-slate-300 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 border border-[#26354A]"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all flex items-center space-x-2 shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Config</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono text-xs">
        
        {/* Section 1: AI & Decision Engine Parameters */}
        <SectionCard title="AI Inference & Decision Thresholds" icon={Cpu}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">AI Confidence Threshold:</span>
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
                Damage classified above this confidence level is assigned REJECT.
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
                Weight deviation beyond this threshold triggers REJECT.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Section 2: Actuator & Conveyor Timing */}
        <SectionCard title="Actuator & Conveyor Timing" icon={Gauge}>
          <div className="space-y-4">
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
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Delay from IR trigger to pneumatic solenoid firing stroke.
              </p>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Conveyor Speed (m/s):</label>
              <input
                type="number"
                step="0.05"
                value={conveyorSpeedMs}
                onChange={(e) => setConveyorSpeedMs(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </SectionCard>

        {/* Section 3: Vision & Offline Storage Config */}
        <SectionCard title="Vision & Offline Limits" icon={Camera}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Camera Exposure:</span>
                <span className="text-amber-400 font-bold">{cameraExposure} µs</span>
              </div>
              <input
                type="range"
                min="100"
                max="1000"
                value={cameraExposure}
                onChange={(e) => setCameraExposure(Number(e.target.value))}
                className="w-full h-2 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Camera Brightness Threshold (Lux):</label>
              <input
                type="number"
                value={brightnessThreshold}
                onChange={(e) => setBrightnessThreshold(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Offline Queue Limit (Records):</label>
              <input
                type="number"
                value={offlineQueueLimit}
                onChange={(e) => setOfflineQueueLimit(Number(e.target.value))}
                className="w-full bg-[#0F172A] border border-[#26354A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </SectionCard>

      </div>

    </div>
  );
};

