import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { Modal } from '../components/common/Modal';

interface DiagramNode {
  id: string;
  title: string;
  subtitle: string;
  category: 'PHYSICAL_CONTROL' | 'EDGE_STORAGE' | 'CLOUD_DATA';
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  spec: string;
  protocol: string;
  role: string;
  input: string;
  output: string;
}

export const ArchitecturePage: React.FC = () => {
  const { systemStatus, faults } = useSimulation();
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);

  const isWanDown = faults.wanDisconnected;

  const nodes: DiagramNode[] = [
    {
      id: 'ir-trigger',
      title: 'IR Breakbeam',
      subtitle: 'Hardware Trigger',
      category: 'PHYSICAL_CONTROL',
      status: systemStatus.irSensorStatus === 'FAULT' ? 'WARNING' : 'ONLINE',
      spec: 'NPN Photoelectric Sensor (Response < 2ms)',
      protocol: 'Digital GPIO (5V)',
      role: 'ตรวจจับพัสดุเข้าสู่จุดตรวจและ trigger กล้องถ่ายทันทีเพื่อลดภาระ GPU',
      input: 'ลำแสงอินฟราเรดถูกตัด',
      output: 'Digital Interrupt Trigger'
    },
    {
      id: 'dual-cam',
      title: 'Webcam Top + Side',
      subtitle: 'Dual 1080p Optical',
      category: 'PHYSICAL_CONTROL',
      status: faults.visionFaultDark || faults.dropSideCamera ? 'WARNING' : 'ONLINE',
      spec: '1080p Industrial Cameras with Ring LED',
      protocol: 'USB 3.0 UVC',
      role: 'เก็บภาพรอบกล่องระยะใกล้เพื่อส่งให้ CiRA CORE',
      input: 'Trigger จาก IR Breakbeam',
      output: 'Dual 1080p Image Frames'
    },
    {
      id: 'cira-core',
      title: 'CiRA CORE Edge AI',
      subtitle: 'Deep Detect (v5)',
      category: 'PHYSICAL_CONTROL',
      status: 'ONLINE',
      spec: 'CiRA CORE v1.9.4 on Industrial Edge PC',
      protocol: 'IPC / Shared Memory',
      role: 'ตรวจจับความเสียหาย 2 คลาสหลัก (Dent, Tear) พร้อมคำนวณ confidence',
      input: 'ภาพจากกล้องบน/ข้าง',
      output: 'Class + Confidence (box_good-157 95%)'
    },
    {
      id: 'esp32-plc',
      title: 'ESP32 / PLC Controller',
      subtitle: 'Real-time Digital I/O',
      category: 'PHYSICAL_CONTROL',
      status: 'ONLINE',
      spec: 'ESP32-WROOM-32 / Optocoupled Relays',
      protocol: 'UART Serial @ 115200 baud / Modbus',
      role: 'รับ trigger จาก IR และคำสั่ง 1/2/3 ควบคุมตัวปัดและ Tower Light โดยไม่พึ่งเน็ต',
      input: 'UART Commands (1=PASS, 3=FAIL)',
      output: 'Solenoid Pulse + Tower Light Relays'
    },
    {
      id: 'actuator',
      title: 'Actuator (Pneumatic)',
      subtitle: 'Reject Cylinder / Servo',
      category: 'PHYSICAL_CONTROL',
      status: systemStatus.actuatorStatus === 'FIRING' ? 'ONLINE' : 'ONLINE',
      spec: 'SMC Pneumatic Cylinder / 6.0 Bar (รอทีมยืนยัน Servo vs Pneumatic)',
      protocol: '5/2 Solenoid Air Pulse',
      role: 'ปัดกล่อง REJECT ออกจากสายพานตามจังหวะ delay ที่ตั้งไว้',
      input: 'Air pressure pulse',
      output: 'Stroke deflection (180ms delay)'
    },
    {
      id: 'tower-light',
      title: 'Tower Light & Buzzer',
      subtitle: '3-Color LED Signal',
      category: 'PHYSICAL_CONTROL',
      status: 'ONLINE',
      spec: 'Industrial 24V 3-Tier Tower Light with Buzzer',
      protocol: 'Digital 24V Relay Drive',
      role: 'เขียว = PASS / แดง+เสียง = ชำรุด/กำลังปัด / เหลือง = ออฟไลน์หรือขัดข้อง',
      input: 'ESP32 Relay outputs',
      output: 'Visual & Audio Alerts'
    },
    {
      id: 'edge-bridge',
      title: 'Edge PC & SQLite',
      subtitle: 'Store-and-Forward Engine',
      category: 'EDGE_STORAGE',
      status: 'ONLINE',
      spec: 'Python Bridge (bridge.py) + SQLite WAL',
      protocol: 'Local SQLite DB + Queue (max 500)',
      role: 'บันทึกข้อมูลทุกกล่องลง Local SQLite ทันที ถ้าเน็ตหลุดจะเข้าคิวสำรองไว้',
      input: 'CiRA CORE results & Barcode',
      output: 'Local DB records + Store-and-Forward queue'
    },
    {
      id: 'cloud-db',
      title: 'Cloud DB & Ingestion',
      subtitle: 'Supabase PostgreSQL',
      category: 'CLOUD_DATA',
      status: isWanDown ? 'OFFLINE' : 'ONLINE',
      spec: 'Supabase Cloud DB + Row Level Security (RLS)',
      protocol: 'HTTPS POST /api/inspections + x-api-key',
      role: 'จัดเก็บข้อมูลหลักฐานระยะยาวและส่งต่อไปยัง Realtime Dashboard',
      input: 'Bridge JSON Payloads',
      output: 'Persistent Cloud Rows & Realtime Streams'
    },
    {
      id: 'web-dashboard',
      title: 'React Web Dashboard',
      subtitle: 'Hub Operator & Manager UI',
      category: 'CLOUD_DATA',
      status: 'ONLINE',
      spec: 'React 19 + TypeScript + Tailwind (ตัวแทน Grafana/Node-RED ในสไลด์)',
      protocol: 'HTTPS / WSS Realtime',
      role: 'แสดงผลสด ภาพหลักฐาน KPI และปรับจูนพารามิเตอร์โดยไม่แตะการตัดสินใจหน้างาน',
      input: 'Realtime State & Events',
      output: 'Operator Interface & Analytics'
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-300 max-w-[1920px] mx-auto">
      {/* Page Header */}
      <PageHeader
        title="SPDI System Architecture & Real-Time Flow"
        description="แผนภาพ System Flow ข้อ 3 และสไลด์ 5 แบบ Interactive เชื่อมต่อสถานะสดจากตัวจำลอง"
        badge="INTERACTIVE SCHEMATIC"
        badgeType="sky"
      />

      {/* Path Legend Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/60 flex items-center space-x-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-emerald-300 block">REAL-TIME CONTROL PATH (PHYSICAL)</span>
            <span className="text-[10px] text-slate-300 font-sans">
              IR &rarr; Camera &rarr; CiRA CORE &rarr; ESP32 &rarr; ตัวปัด (ทำงานที่ Edge 100% ไม่พึ่งเน็ต)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/60 flex items-center space-x-2.5">
          <div className="w-3 h-3 rounded-full bg-cyan-400 shrink-0" />
          <div>
            <span className="font-bold text-cyan-300 block">LOCAL DATA PATH (EDGE)</span>
            <span className="text-[10px] text-slate-300 font-sans">
              Local SQLite + Store-and-Forward คิวสูงสุด 500 records
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-lg border flex items-center space-x-2.5 ${
          isWanDown ? 'bg-amber-950/40 border-amber-500/60 text-amber-300' : 'bg-purple-950/40 border-purple-500/60 text-purple-300'
        }`}>
          <div className={`w-3 h-3 rounded-full shrink-0 ${isWanDown ? 'bg-amber-400 animate-pulse' : 'bg-purple-400'}`} />
          <div>
            <span className="font-bold block">CLOUD DATA PATH</span>
            <span className="text-[10px] text-slate-300 font-sans">
              {isWanDown ? 'WAN Severed — คิวรอส่งอัตโนมัติเมื่อต่อเน็ต' : 'Edge PC &rarr; Cloud DB &rarr; Web Dashboard'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <SectionCard 
        title="Interactive System Flow Diagram (Click any node to view real-time state & specs)" 
        icon={Zap}
        headerActions={<span className="text-xs font-mono text-cyan-400 font-bold">WAN: {isWanDown ? 'OFFLINE (STORE ACTIVE)' : 'ONLINE'}</span>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs pt-2">
          {nodes.map((node) => {
            const isControl = node.category === 'PHYSICAL_CONTROL';
            const isLocal = node.category === 'EDGE_STORAGE';

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-lg flex flex-col justify-between min-h-[140px] group ${
                  node.status === 'OFFLINE'
                    ? 'bg-red-950/30 border-red-500/60'
                    : node.status === 'WARNING'
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : isControl
                    ? 'bg-[#0B1528] border-emerald-900/60 hover:border-emerald-500'
                    : isLocal
                    ? 'bg-[#0B1528] border-cyan-900/60 hover:border-cyan-500'
                    : 'bg-[#0B1528] border-purple-900/60 hover:border-purple-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isControl ? 'bg-emerald-500/20 text-emerald-400' : isLocal ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {node.category.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      node.status === 'OFFLINE' ? 'text-red-400' : node.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      ● {node.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-cyan-300">
                    {node.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {node.subtitle}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>{node.protocol}</span>
                  <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">
                    Inspect &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Node Detail Modal */}
      {selectedNode && (
        <Modal
          isOpen={!!selectedNode}
          onClose={() => setSelectedNode(null)}
          title={`Component: ${selectedNode.title}`}
          subtitle={`${selectedNode.subtitle} • Protocol: ${selectedNode.protocol}`}
          maxWidth="lg"
          footerActions={
            <button 
              onClick={() => setSelectedNode(null)} 
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs font-mono shadow"
            >
              Close
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs text-slate-300">
            <div className="bg-[#162235] p-3.5 rounded-xl border border-[#26354A] space-y-1">
              <span className="text-[#94A3B8] text-[10px] uppercase block font-bold">Function in System Flow:</span>
              <p className="text-white text-xs font-sans leading-relaxed">{selectedNode.role}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Input:</span>
                <span className="text-slate-200 font-bold">{selectedNode.input}</span>
              </div>
              <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
                <span className="text-[#94A3B8] text-[10px] block uppercase">Output:</span>
                <span className="text-emerald-400 font-bold">{selectedNode.output}</span>
              </div>
            </div>

            <div className="bg-[#162235] p-3 rounded-lg border border-[#26354A]">
              <span className="text-[#94A3B8] text-[10px] block uppercase">Hardware Specification / Note:</span>
              <span className="text-cyan-300 font-bold">{selectedNode.spec}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
