import React, { useState } from 'react';
import { ArrowRight, Zap, Radio } from 'lucide-react';
import { ARCHITECTURE_NODES } from '../data/mockData';
import type { ArchitectureNode } from '../types/spdi';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Modal } from '../components/common/Modal';

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
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="CiRA CORE & Edge AI System Architecture"
        description="Decoupled Edge Bridge, MQTT Topics, Event Normalization & Real-time Alert Engine pipeline"
        badge="PRODUCTION ARCHITECTURE"
        badgeType="purple"
      />

      {/* CiRA CORE TO WEB DASHBOARD ARCHITECTURE DIAGRAM */}
      <SectionCard 
        title="End-to-End Integration Flow (CiRA CORE → Edge Bridge → MQTT → Dashboard)" 
        icon={Radio}
        headerActions={<span className="text-xs font-mono text-emerald-400 font-bold">Topic: <strong className="text-sky-400">spdi/SORT-01/inspection</strong></span>}
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5 font-mono text-xs pt-1">
          {integrationPipeline.map((step, idx) => (
            <div key={idx} className="bg-[#0F172A] p-3 rounded-xl border border-[#26354A] text-center space-y-1 hover:border-purple-500/60 transition-all min-w-0">
              <span className="text-lg block">{step.icon}</span>
              <span className="font-bold text-white text-[11px] block truncate">{step.title}</span>
              <span className="text-[9px] text-[#94A3B8] block truncate">{step.sub}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Interactive System Flowchart Diagram Stage */}
      <SectionCard title="Hardware & Pipeline Topology Graph (Click Node for Technical Specification)" icon={Zap}>
        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs py-2">
          {ARCHITECTURE_NODES.map((node, index) => (
            <React.Fragment key={node.id}>
              <div
                onClick={() => setSelectedNode(node)}
                className="p-4 rounded-xl bg-[#0F172A] border border-[#26354A] hover:border-sky-400 cursor-pointer transition-all hover:scale-105 shadow-md space-y-1.5 w-44 min-h-[95px] flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between text-[9px] font-bold text-sky-400 uppercase">
                  <span>STEP {index + 1}</span>
                  <span className="text-emerald-400">{node.latency}</span>
                </div>

                <div className="font-bold text-white text-xs group-hover:text-sky-300 truncate">
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
      </SectionCard>

      {/* NODE DETAIL MODAL */}
      {selectedNode && (
        <Modal
          isOpen={!!selectedNode}
          onClose={() => setSelectedNode(null)}
          title={`Architecture Node: ${selectedNode.title}`}
          subtitle={`Category: ${selectedNode.category} • Spec: ${selectedNode.spec}`}
          maxWidth="xl"
          footerActions={
            <button 
              onClick={() => setSelectedNode(null)} 
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs font-mono shadow"
            >
              Close Architecture Inspector
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="bg-[#162235] p-3.5 rounded-xl border border-[#26354A] space-y-2">
              <span className="text-[#94A3B8] text-[10px] uppercase block font-bold">System Role & Function:</span>
              <p className="text-white text-xs font-sans leading-relaxed">{selectedNode.role}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Input Signal:</span>
                <span className="text-slate-200 font-bold">{selectedNode.input}</span>
              </div>
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Output Payload:</span>
                <span className="text-emerald-400 font-bold">{selectedNode.output}</span>
              </div>
            </div>

            <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
              <span className="text-[#94A3B8] text-[10px] block uppercase">Hardware Specification:</span>
              <span className="text-sky-400 font-bold">{selectedNode.spec}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Communication Protocol:</span>
                <span className="text-purple-400 font-bold">{selectedNode.protocol}</span>
              </div>
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Execution Latency:</span>
                <span className="text-emerald-400 font-bold">{selectedNode.latency}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

