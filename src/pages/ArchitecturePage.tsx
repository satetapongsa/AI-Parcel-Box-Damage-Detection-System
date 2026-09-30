import React, { useState } from 'react';
import { Network, Cpu, ArrowRight, Zap, Radio } from 'lucide-react';
import { ARCHITECTURE_NODES } from '../data/mockData';
import type { ArchitectureNode } from '../types/spdi';

export const ArchitecturePage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);

  const integrationPipeline = [
    { title: 'CAMERA', sub: 'Dual 1080p Optical', icon: '📸' },
    { title: 'CiRA CORE', sub: 'Deep Learning Engine', icon: '🧠' },
    { title: 'AI RESULT', sub: 'Bounding Boxes & Class', icon: '🏷️' },
    { title: 'EDGE BRIDGE', sub: 'Normalizer & Adapter', icon: '🌉' },
    { title: 'MQTT BROKER', sub: 'Topic Publisher', icon: '📡' },
    { title: 'BACKEND API', sub: 'Event Processor', icon: '⚙️' },
    { title: 'DATABASE', sub: 'Store-and-Forward DB', icon: '💾' },
    { title: 'REALTIME EVENT', sub: 'WebSocket / SSE', icon: '⚡' },
    { title: 'WEB DASHBOARD', sub: 'React Frontend UI', icon: '💻' },
    { title: 'ALERT ENGINE', sub: 'Rule Processor', icon: '🚨' },
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101A2B] border border-[#26344A] p-5 rounded-xl shadow-md">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
            <Network className="w-6 h-6 text-sky-400" />
            <span>CiRA CORE & Edge AI Real-Time Integration Architecture</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1">
            Decoupled Edge Bridge, MQTT Topics, Event Normalization & Real-time Alert Engine pipeline
          </p>
        </div>

        <div className="text-xs font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3.5 py-2 rounded-lg font-bold">
          CiRA CORE Production Integration Ready
        </div>
      </div>

      {/* CiRA CORE TO WEB DASHBOARD ARCHITECTURE DIAGRAM */}
      <div className="bg-[#101A2B] border border-[#26344A] p-6 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-[#26344A] pb-3">
          <h3 className="text-xs font-bold text-white uppercase font-mono flex items-center space-x-2">
            <Radio className="w-4 h-4 text-purple-400" />
            <span>End-to-End Integration Flow (CiRA CORE → Edge Bridge → MQTT → Dashboard)</span>
          </h3>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            MQTT Topic: <strong className="text-sky-400">spdi/SORT-01/inspection</strong>
          </span>
        </div>

        {/* Integration Stepper Diagram */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 font-mono text-xs pt-2">
          {integrationPipeline.map((step, idx) => (
            <div key={idx} className="bg-[#172235] p-3 rounded-xl border border-[#26344A] text-center space-y-1 hover:border-purple-500 transition-all">
              <span className="text-lg block">{step.icon}</span>
              <span className="font-bold text-white text-[11px] block">{step.title}</span>
              <span className="text-[9px] text-[#94A3B8] block">{step.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive System Flowchart Diagram Stage */}
      <div className="bg-[#101A2B] border border-[#26344A] p-6 rounded-xl shadow-md space-y-6">
        <h3 className="text-xs font-bold text-white uppercase font-mono border-b border-[#26344A] pb-3 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-sky-400" />
          <span>Hardware Topology Graph (Click Node for Technical Specification)</span>
        </h3>

        {/* Horizontal & Vertical Flowchart */}
        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
          {ARCHITECTURE_NODES.map((node, index) => (
            <React.Fragment key={node.id}>
              <div
                onClick={() => setSelectedNode(node)}
                className="p-4 rounded-xl bg-[#172235] border border-[#26344A] hover:border-sky-400 cursor-pointer transition-all hover:scale-105 shadow-md space-y-1 w-44 min-h-[90px] flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between text-[9px] font-bold text-sky-400 uppercase">
                  <span>STEP {index + 1}</span>
                  <span className="text-emerald-400">{node.latency}</span>
                </div>

                <div className="font-bold text-white text-xs group-hover:text-sky-300">
                  {node.title}
                </div>

                <div className="text-[10px] text-[#94A3B8] truncate">
                  {node.category}
                </div>
              </div>

              {index < ARCHITECTURE_NODES.length - 1 && (
                <ArrowRight className="w-4 h-4 text-sky-500/60 hidden sm:block shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* NODE DETAIL MODAL */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-[#101A2B] border border-[#26344A] rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#26344A] pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">{selectedNode.title}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <div className="space-y-2.5 text-slate-300">
              <div className="bg-[#172235] p-3 rounded-lg border border-[#26344A]">
                <span className="text-[#94A3B8] text-[10px] uppercase block font-bold">System Role & Function:</span>
                <p className="text-white text-xs font-sans mt-0.5">{selectedNode.role}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#172235] p-2.5 rounded border border-[#26344A]">
                  <span className="text-[#94A3B8] text-[10px] block">Input Signal:</span>
                  <span className="text-slate-200 font-bold">{selectedNode.input}</span>
                </div>
                <div className="bg-[#172235] p-2.5 rounded border border-[#26344A]">
                  <span className="text-[#94A3B8] text-[10px] block">Output Payload:</span>
                  <span className="text-emerald-400 font-bold">{selectedNode.output}</span>
                </div>
              </div>

              <div className="bg-[#172235] p-2.5 rounded border border-[#26344A]">
                <span className="text-[#94A3B8] text-[10px] block">Hardware Specification:</span>
                <span className="text-sky-400 font-bold">{selectedNode.spec}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#172235] p-2.5 rounded border border-[#26344A]">
                  <span className="text-[#94A3B8] text-[10px] block">Communication Protocol:</span>
                  <span className="text-purple-400 font-bold">{selectedNode.protocol}</span>
                </div>
                <div className="bg-[#172235] p-2.5 rounded border border-[#26344A]">
                  <span className="text-[#94A3B8] text-[10px] block">Execution Latency:</span>
                  <span className="text-emerald-400 font-bold">{selectedNode.latency}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#26344A] text-right">
              <button onClick={() => setSelectedNode(null)} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition-all shadow">
                Close Architecture Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
