import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Network
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { ARCHITECTURE_NODES } from '../data/mockData';
import type { ArchitectureNode } from '../types/spdi';

export const SystemHealthPage: React.FC = () => {
  const { anomalies, isOfflineMode } = useSimulation();
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);

  const getNodeStatusBadge = (nodeId: string) => {
    if (isOfflineMode && (nodeId === 'node-mqtt' || nodeId === 'node-cloud')) {
      return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', text: 'OFFLINE' };
    }
    return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', text: 'ONLINE' };
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <Activity className="w-6 h-6 text-sky-400" />
            <span>Industrial System Topology & Hardware Health</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Real-time IoT bus telemetry, sensor sampling & actuator response diagnostics
          </p>
        </div>

        <div className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-2 rounded-lg font-bold flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ALL EDGE SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      {/* SYSTEM TOPOLOGY NODES GRID */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#26344A] pb-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center space-x-2">
            <Network className="w-4 h-4 text-sky-400" />
            <span>Hardware & Compute Topology Graph (Click Node to Inspect)</span>
          </h3>
          <span className="text-xs font-mono text-[#94A3B8]">
            Bus Latency Average: <strong className="text-emerald-400">1.8 ms</strong>
          </span>
        </div>

        {/* Nodes Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARCHITECTURE_NODES.map((node) => {
            const st = getNodeStatusBadge(node.id);
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="bg-[#172235] border border-[#26344A] hover:border-sky-500/60 p-4 rounded-xl shadow-md cursor-pointer transition-all hover:translate-y-[-2px] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                    {node.category}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${st.bg}`}>
                    {st.text}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white tracking-tight font-mono">
                  {node.title}
                </h4>

                <div className="pt-2 border-t border-[#26344A] flex justify-between items-center text-[10px] font-mono text-[#94A3B8]">
                  <span>Latency: <strong className="text-slate-200">{node.latency}</strong></span>
                  <span className="text-sky-400">Details →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SYSTEM ANOMALIES MONITORING LOG */}
      <div className="bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#26344A] pb-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>System Anomaly Monitoring & Event Incident Log</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Real-time Sensor Faults & Overlap Detection Log
          </span>
        </div>

        <div className="space-y-3">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className={`p-4 rounded-xl border font-mono text-xs space-y-1.5 ${
                anom.severity === 'CRITICAL'
                  ? 'bg-red-950/40 border-red-500/40 text-red-200'
                  : anom.severity === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-[#172235] border-[#26344A] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    anom.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {anom.severity}
                  </span>
                  <span className="font-bold text-white">{anom.title}</span>
                </div>
                <span className="text-[10px] text-[#94A3B8]">{anom.timestamp}</span>
              </div>
              <p className="text-xs leading-relaxed font-sans opacity-90">{anom.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* NODE DETAIL MODAL */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#101A2B] border border-[#26344A] rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#26344A] pb-3">
              <h3 className="text-sm font-bold text-white uppercase">{selectedNode.title}</h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 text-slate-300">
              <div><span className="text-[#94A3B8]">Role:</span> <strong className="text-white">{selectedNode.role}</strong></div>
              <div><span className="text-[#94A3B8]">Input Signal:</span> <span>{selectedNode.input}</span></div>
              <div><span className="text-[#94A3B8]">Output Payload:</span> <span>{selectedNode.output}</span></div>
              <div><span className="text-[#94A3B8]">Hardware Spec:</span> <span className="text-sky-400">{selectedNode.spec}</span></div>
              <div><span className="text-[#94A3B8]">Protocol / Interface:</span> <span>{selectedNode.protocol}</span></div>
              <div><span className="text-[#94A3B8]">Bus Latency:</span> <span className="text-emerald-400">{selectedNode.latency}</span></div>
            </div>

            <div className="pt-3 border-t border-[#26344A] text-right">
              <button onClick={() => setSelectedNode(null)} className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
