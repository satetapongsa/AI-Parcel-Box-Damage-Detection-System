import React from 'react';
import type { DamageType, BoundingBox } from '../types/inspection';
import { Camera, Zap } from 'lucide-react';

interface ParcelVisualizerProps {
  parcelId: string;
  damageType: DamageType;
  confidence: number;
  boundingBoxes: BoundingBox[];
  cameraId?: string;
  isScanning?: boolean;
  showHeatmap?: boolean;
}

export const ParcelVisualizer: React.FC<ParcelVisualizerProps> = ({
  parcelId,
  damageType,
  confidence,
  boundingBoxes,
  cameraId = 'CAM-01',
  isScanning = true,
  showHeatmap = false
}) => {

  const getStatusColor = (type: DamageType) => {
    switch (type) {
      case 'NORMAL':
        return {
          stroke: '#10b981',
          bg: 'rgba(16, 185, 129, 0.15)',
          badgeBg: '#059669',
          text: '#34d399'
        };
      case 'DAMAGED':
        return {
          stroke: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.2)',
          badgeBg: '#dc2626',
          text: '#f87171'
        };
      case 'WET':
        return {
          stroke: '#3b82f6',
          bg: 'rgba(59, 130, 246, 0.2)',
          badgeBg: '#2563eb',
          text: '#60a5fa'
        };
      case 'OPEN':
        return {
          stroke: '#f97316',
          bg: 'rgba(249, 115, 22, 0.2)',
          badgeBg: '#ea580c',
          text: '#fb923c'
        };
    }
  };

  const statusStyle = getStatusColor(damageType);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-navy-950 border border-navy-700 rounded-xl overflow-hidden flex flex-col justify-between shadow-2xl select-none">
      
      {/* Top Overlay Controls & Camera Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2 bg-navy-900/90 backdrop-blur border border-navy-700 px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          <span className="font-bold text-red-400">● LIVE</span>
          <span className="text-gray-400">|</span>
          <span className="text-slate-200 font-semibold">{cameraId}</span>
          <span className="text-gray-500 text-[10px]">1080p @ 24fps</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="bg-navy-900/90 backdrop-blur border border-navy-700 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-400 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>CiRA CORE Online</span>
          </div>
          <div className="bg-navy-900/90 backdrop-blur border border-navy-700 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
            ID: <span className="text-blue-400 font-bold">{parcelId}</span>
          </div>
        </div>
      </div>

      {/* Main Vision Stage & Box Graphics */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center bg-grid-pattern overflow-hidden">
        
        {/* Conveyor belt base texture */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-navy-900 border-t border-navy-700 animate-conveyor flex items-center justify-around opacity-75">
          <div className="h-full w-1 border-r border-navy-700"></div>
          <div className="h-full w-1 border-r border-navy-700"></div>
          <div className="h-full w-1 border-r border-navy-700"></div>
          <div className="h-full w-1 border-r border-navy-700"></div>
          <div className="h-full w-1 border-r border-navy-700"></div>
        </div>

        {/* Roller lines */}
        <div className="absolute bottom-28 left-0 right-0 h-2 bg-slate-800 border-y border-slate-700"></div>

        {/* Cardboard Box 3D Simulation Graphic */}
        <div className="relative w-80 h-64 z-10 transition-all duration-300 transform hover:scale-105">
          
          {/* Box Shadow */}
          <div className="absolute -bottom-6 left-4 right-4 h-8 bg-black/60 blur-md rounded-full transform scale-95"></div>

          {/* Cardboard Box SVG */}
          <svg className="w-full h-full drop-shadow-xl" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Box Front Face */}
            <path d="M 40 90 L 160 140 L 160 210 L 40 160 Z" fill="#b48356" stroke="#8a5e37" strokeWidth="2" />
            
            {/* Box Side Face */}
            <path d="M 160 140 L 260 90 L 260 160 L 160 210 Z" fill="#9e6e44" stroke="#784e2c" strokeWidth="2" />
            
            {/* Box Top Face */}
            <path d="M 40 90 L 140 45 L 260 90 L 160 140 Z" fill="#cca06e" stroke="#9e6e44" strokeWidth="2" />

            {/* Packaging Tape */}
            <path d="M 90 67 L 210 115" stroke="#475569" strokeWidth="12" opacity="0.85" strokeLinecap="round" />
            <path d="M 160 140 L 160 210" stroke="#475569" strokeWidth="8" opacity="0.75" />

            {/* Logistics Label Sticker */}
            <g transform="translate(60, 110) rotate(15)">
              <rect width="45" height="35" fill="#f8fafc" rx="2" />
              <rect x="5" y="5" width="20" height="3" fill="#0f172a" />
              <rect x="5" y="10" width="35" height="2" fill="#64748b" />
              <rect x="5" y="14" width="30" height="2" fill="#64748b" />
              {/* Barcode lines */}
              <line x1="5" y1="20" x2="5" y2="30" stroke="#0f172a" strokeWidth="2"/>
              <line x1="9" y1="20" x2="9" y2="30" stroke="#0f172a" strokeWidth="1"/>
              <line x1="12" y1="20" x2="12" y2="30" stroke="#0f172a" strokeWidth="3"/>
              <line x1="17" y1="20" x2="17" y2="30" stroke="#0f172a" strokeWidth="1.5"/>
              <line x1="22" y1="20" x2="22" y2="30" stroke="#0f172a" strokeWidth="2"/>
              <line x1="27" y1="20" x2="27" y2="30" stroke="#0f172a" strokeWidth="1"/>
              <line x1="32" y1="20" x2="32" y2="30" stroke="#0f172a" strokeWidth="2"/>
            </g>

            {/* DAMAGE VISUAL EFFECT OVERLAYS */}
            {damageType === 'WET' && (
              <g>
                {/* Dark wet stain spots */}
                <ellipse cx="110" cy="165" rx="35" ry="25" fill="#2d1c10" opacity="0.75" />
                <ellipse cx="85" cy="150" rx="22" ry="18" fill="#1e130a" opacity="0.8" />
                <ellipse cx="130" cy="180" rx="20" ry="15" fill="#2d1c10" opacity="0.7" />
                {/* Water droplets */}
                <circle cx="115" cy="175" r="4" fill="#60a5fa" opacity="0.6" />
                <circle cx="95" cy="160" r="3" fill="#93c5fd" opacity="0.7" />
                <circle cx="128" cy="170" r="5" fill="#3b82f6" opacity="0.8" />
              </g>
            )}

            {damageType === 'DAMAGED' && (
              <g>
                {/* Dented / Crushed edge deformation */}
                <path d="M 210 90 L 260 90 L 250 120 L 210 125 Z" fill="#54371f" opacity="0.9" />
                <path d="M 210 90 L 250 120 M 230 85 L 240 135 M 220 95 L 260 115" stroke="#1f1207" strokeWidth="3" />
                {/* Box Tear lines */}
                <path d="M 190 100 Q 215 110 205 135 T 235 140" stroke="#110a04" strokeWidth="4" fill="none" />
                <circle cx="215" cy="120" r="8" fill="#1a0e05" />
              </g>
            )}

            {damageType === 'OPEN' && (
              <g>
                {/* Flap detached tape tearing */}
                <path d="M 110 60 L 150 40 L 170 50" fill="none" stroke="#ea580c" strokeWidth="4" strokeDasharray="3 3" />
                <polygon points="120,55 140,35 155,50 135,70" fill="#cca06e" stroke="#784e2c" strokeWidth="2" transform="rotate(-15 135 50)" />
                <path d="M 130 52 L 170 70" stroke="#e2e8f0" strokeWidth="3" opacity="0.9" />
              </g>
            )}

            {showHeatmap && damageType !== 'NORMAL' && (
              <g opacity="0.4">
                <circle cx="110" cy="160" r="50" fill="url(#heatGradient)" />
              </g>
            )}

            <defs>
              <radialGradient id="heatGradient">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          {/* AI Bounding Box Overlays */}
          {boundingBoxes.map((box, idx) => (
            <div
              key={idx}
              className="absolute transition-all duration-300 border-2 rounded shadow-lg pointer-events-none z-30"
              style={{
                left: `${box.x}%`,
                top: `${box.y}%`,
                width: `${box.width}%`,
                height: `${box.height}%`,
                borderColor: statusStyle.stroke,
                backgroundColor: statusStyle.bg,
                boxShadow: `0 0 15px ${statusStyle.stroke}`
              }}
            >
              {/* Corner crosshairs */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2" style={{ borderColor: statusStyle.stroke }}></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2" style={{ borderColor: statusStyle.stroke }}></div>
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2" style={{ borderColor: statusStyle.stroke }}></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2" style={{ borderColor: statusStyle.stroke }}></div>

              {/* Bounding box label tag */}
              <div 
                className="absolute -top-7 left-0 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider text-white shadow flex items-center space-x-1"
                style={{ backgroundColor: statusStyle.badgeBg }}
              >
                <span>{box.label}</span>
                <span className="text-[10px] opacity-90">({box.confidence}%)</span>
              </div>
            </div>
          ))}

          {/* Normal condition overlay badge if pristine */}
          {damageType === 'NORMAL' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-950/80 border border-emerald-500/50 backdrop-blur px-4 py-2 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2 z-20 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>PARCEL CONDITION NORMAL (99.2%)</span>
            </div>
          )}

        </div>

        {/* Laser Scanner Beam Effect */}
        {isScanning && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] z-20 animate-scanner"></div>
        )}

        {/* Grid HUD Overlay Marks */}
        <div className="absolute top-12 left-6 text-[10px] font-mono text-slate-500 space-y-1">
          <div>ROI: [X: 120, Y: 80, W: 640, H: 480]</div>
          <div>MODEL: CiRA-YOLOv8-Parcel-v2.4</div>
          <div>INSPECTION_MODE: AUTOMATED_DISPATCH</div>
        </div>

        <div className="absolute bottom-4 left-6 text-[10px] font-mono text-slate-500">
          STATION: MAIN_SORTING_LINE_A
        </div>

        <div className="absolute bottom-4 right-6 text-[10px] font-mono text-slate-500 text-right">
          LATENCY: 120ms | GPU: 34%
        </div>

      </div>

      {/* Footer Camera Info Strip */}
      <div className="bg-navy-900 border-t border-navy-700 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono z-20">
        <div className="flex items-center space-x-3">
          <span className="flex items-center text-slate-300">
            <Camera className="w-4 h-4 mr-1 text-blue-400" />
            {cameraId}
          </span>
          <span>•</span>
          <span>Optical Lens 8mm</span>
          <span>•</span>
          <span>Diffused Ring LED: 100%</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-gray-400">Detection Confidence:</span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-navy-800 border border-navy-700" style={{ color: statusStyle.text }}>
            {confidence}%
          </span>
        </div>
      </div>

    </div>
  );
};
