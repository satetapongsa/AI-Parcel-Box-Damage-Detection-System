import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Play, Layers, CheckCircle2 } from 'lucide-react';

export const CiraPanel: React.FC = () => {
  const { ciraState, setCiraTab, settings } = useSimulation();

  return (
    <div className="bg-[#0B1528] border border-cyan-950/70 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
            CiRA CORE Edge AI Screen
          </h2>
        </div>
        <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono px-2 py-0.5 rounded">
          Slide 9 Prototype Replica
        </span>
      </div>

      {/* Node Flow Diagram from Slide 9: Button Run -> VideoFile -> Deep Detect (v5) */}
      <div className="bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 mb-3">
        <div className="text-[10px] font-mono text-slate-400 mb-2">FLOW PIPELINE (GRAPH):</div>
        <div className="flex items-center justify-between text-xs font-mono">
          {/* Node 1 */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-2 py-1.5 rounded">
            <Play className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-200">Button Run</span>
          </div>
          <span className="text-cyan-500 font-bold">→</span>

          {/* Node 2 */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-2 py-1.5 rounded">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-200">VideoFile / Dual Cam</span>
          </div>
          <span className="text-cyan-500 font-bold">→</span>

          {/* Node 3 */}
          <div className="flex items-center space-x-1.5 bg-cyan-950/60 border border-cyan-700 px-2 py-1.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-cyan-300" />
            <span className="text-cyan-200 font-semibold">Deep Detect (v5)</span>
          </div>
        </div>
      </div>

      {/* Tabs matching Slide 9: Payload / Output / Image */}
      <div className="flex border-b border-slate-800 mb-3 space-x-2">
        {(['Image', 'Output', 'Payload'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setCiraTab(tab)}
            className={`px-3 py-1.5 text-xs font-mono rounded-t transition-colors ${
              ciraState.activeTab === tab
                ? 'bg-[#070D1B] text-cyan-400 border-t-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 bg-[#070D1B] border border-slate-800/80 rounded-lg p-3 overflow-hidden flex flex-col justify-center min-h-[160px]">
        {ciraState.activeTab === 'Image' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded p-2">
            {/* Synthetic parcel view with bounding box and slide 9 tag format */}
            <div className="relative w-48 h-32 bg-amber-950/30 border border-amber-800/40 rounded flex items-center justify-center">
              <span className="text-[10px] text-amber-500/60 font-mono">PARCEL SURFACE</span>

              {/* Bounding Box matching Slide 9 purple style */}
              <div className="absolute inset-x-6 inset-y-4 border-2 border-purple-500/90 rounded bg-purple-500/10 flex flex-col justify-between p-1">
                <span className="bg-purple-600 text-white font-mono text-[10px] font-bold px-1 rounded w-fit shadow">
                  {ciraState.latestLabelTag || 'box_good-157 95%'}
                </span>
                <span className="text-[9px] text-purple-300 font-mono text-right">
                  Inference: {settings.aiInferenceSec}s
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              Bounding format: [class]-[seq] [confidence]% (Slide 9 pattern)
            </div>
          </div>
        )}

        {ciraState.activeTab === 'Output' && (
          <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap overflow-auto max-h-[180px]">
            {ciraState.latestOutputText}
          </pre>
        )}

        {ciraState.activeTab === 'Payload' && (
          <pre className="text-[11px] font-mono text-cyan-300 whitespace-pre-wrap overflow-auto max-h-[180px]">
            {ciraState.latestPayloadText}
          </pre>
        )}
      </div>
    </div>
  );
};
