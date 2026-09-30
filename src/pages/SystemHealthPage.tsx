import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Network
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { ARCHITECTURE_NODES } from '../data/mockData';
import type { ArchitectureNode } from '../types/spdi';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const SystemHealthPage: React.FC = () => {
  const { anomalies, isOfflineMode } = useSimulation();
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);

  const getNodeStatusBadge = (nodeId: string) => {
    if (isOfflineMode && (nodeId === 'node-mqtt' || nodeId === 'node-cloud')) {
      return 'OFFLINE';
    }
    return 'ONLINE';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      
      {/* Enterprise Page Header */}
      <PageHeader
        title="Industrial Topology & Hardware Health"
        description="Real-time IoT bus telemetry, sensor sampling & actuator response diagnostics"
        badge="ALL EDGE SYSTEMS OK"
        badgeType="green"
        actions={
          <div className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SYSTEM HEALTH: OPTIMAL</span>
          </div>
        }
      />

      {/* SYSTEM TOPOLOGY NODES GRID */}
      <SectionCard 
        title="Hardware & Compute Topology Graph (Click Node to Inspect)" 
        icon={Network}
        headerActions={<span className="text-xs font-mono text-[#94A3B8]">Average Latency: <strong className="text-emerald-400">1.8 ms</strong></span>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ARCHITECTURE_NODES.map((node) => {
            const st = getNodeStatusBadge(node.id);
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="bg-[#0F172A] border border-[#26354A] hover:border-sky-500/60 p-4 rounded-xl shadow-md cursor-pointer transition-all hover:translate-y-[-2px] space-y-3 min-w-0"
              >
                <div className="flex items-center justify-between space-x-2">
                  <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider truncate">
                    {node.category}
                  </span>
                  <StatusBadge status={st} size="sm" />
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight font-mono truncate">
                  {node.title}
                </h4>

                <div className="pt-2 border-t border-[#26354A] flex justify-between items-center text-[11px] font-mono text-[#94A3B8]">
                  <span>Latency: <strong className="text-slate-200">{node.latency}</strong></span>
                  <span className="text-sky-400 font-bold hover:underline">Inspect →</span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* SYSTEM ANOMALIES MONITORING LOG */}
      <SectionCard title="System Anomaly Monitoring & Event Incident Log" icon={AlertTriangle}>
        <div className="space-y-3">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className={`p-4 rounded-xl border font-mono text-xs space-y-1.5 ${
                anom.severity === 'CRITICAL'
                  ? 'bg-red-950/40 border-red-500/40 text-red-200'
                  : anom.severity === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : 'bg-[#0F172A] border-[#26354A] text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
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
      </SectionCard>

      {/* NODE DETAIL MODAL */}
      {selectedNode && (
        <Modal
          isOpen={!!selectedNode}
          onClose={() => setSelectedNode(null)}
          title={`Node Specification: ${selectedNode.title}`}
          subtitle={`Category: ${selectedNode.category} • Protocol: ${selectedNode.protocol}`}
          maxWidth="lg"
          footerActions={
            <button 
              onClick={() => setSelectedNode(null)} 
              className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-xs font-mono"
            >
              Close Window
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-[#162235] border border-[#26354A] space-y-2">
              <div className="flex justify-between border-b border-[#26354A] pb-1.5">
                <span className="text-[#94A3B8]">Role:</span>
                <strong className="text-white">{selectedNode.role}</strong>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-1.5">
                <span className="text-[#94A3B8]">Input Signal:</span>
                <span>{selectedNode.input}</span>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-1.5">
                <span className="text-[#94A3B8]">Output Payload:</span>
                <span>{selectedNode.output}</span>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-1.5">
                <span className="text-[#94A3B8]">Hardware Spec:</span>
                <span className="text-sky-400 font-bold">{selectedNode.spec}</span>
              </div>
              <div className="flex justify-between border-b border-[#26354A] pb-1.5">
                <span className="text-[#94A3B8]">Protocol / Interface:</span>
                <span>{selectedNode.protocol}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#94A3B8]">Bus Latency:</span>
                <span className="text-emerald-400 font-bold">{selectedNode.latency}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

