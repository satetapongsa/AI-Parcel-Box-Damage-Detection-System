import React from 'react';
import type { ParcelRecord, BoundingBox } from '../types/spdi';
import { Camera, Scan, Layers } from 'lucide-react';

interface InspectionVisualizerProps {
  parcel: ParcelRecord;
}

export const InspectionVisualizer: React.FC<InspectionVisualizerProps> = ({ parcel }) => {
  const isReject = parcel.status === 'REJECT';

  const renderBoxSVG = (isSideView: boolean, boxes: BoundingBox[]) => {
    return (
      <div className="relative w-full h-full min-h-[220px] bg-[#07111F] border border-[#26344A] rounded-xl overflow-hidden flex flex-col justify-between shadow-2xl select-none group">
        
        {/* Machine Vision Camera Header HUD */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-2 bg-[#0B1220]/90 backdrop-blur border border-[#26344A] px-2.5 py-1 rounded-md text-[11px] font-mono">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="font-bold text-red-400">● LIVE</span>
            <span className="text-gray-500">|</span>
            <span className="text-white font-semibold">{isSideView ? 'CAM-02 (SIDE VIEW)' : 'CAM-01 (TOP VIEW)'}</span>
          </div>

          <div className="flex items-center space-x-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-[#101A2B] border border-[#26344A] text-sky-400">
              1080p @ 30 FPS
            </span>
            <span className="px-2 py-0.5 rounded bg-[#101A2B] border border-[#26344A] text-emerald-400 font-bold">
              35ms Latency
            </span>
          </div>
        </div>

        {/* Vision Area / Canvas */}
        <div className="relative w-full h-full flex-1 flex items-center justify-center bg-grid-pattern overflow-hidden">
          
          {/* Conveyor Belt Background Motion */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#0B1220] border-t border-[#26344A] animate-conveyor flex items-center justify-around opacity-60">
            <div className="h-full w-1 border-r border-[#26344A]"></div>
            <div className="h-full w-1 border-r border-[#26344A]"></div>
            <div className="h-full w-1 border-r border-[#26344A]"></div>
            <div className="h-full w-1 border-r border-[#26344A]"></div>
          </div>

          {/* 3D Parcel Box Illustration */}
          <div className="relative w-64 h-48 z-10">
            
            {/* Box Shadow */}
            <div className="absolute -bottom-4 left-6 right-6 h-6 bg-black/70 blur-md rounded-full"></div>

            {/* Render Machine Vision Graphics */}
            <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {!isSideView ? (
                // TOP VIEW PARCEL
                <g>
                  {/* Top Face main */}
                  <rect x="30" y="30" width="200" height="140" rx="4" fill="#c09363" stroke="#8a5e37" strokeWidth="2" />
                  {/* Seam Tape */}
                  <line x1="30" y1="100" x2="230" y2="100" stroke="#334155" strokeWidth="12" strokeDasharray="180" opacity="0.8" />
                  {/* Barcode Label */}
                  <g transform="translate(45, 45)">
                    <rect width="60" height="40" fill="#f8fafc" rx="2" />
                    <rect x="6" y="6" width="30" height="3" fill="#0f172a" />
                    <line x1="6" y1="14" x2="6" y2="34" stroke="#0f172a" strokeWidth="2"/>
                    <line x1="11" y1="14" x2="11" y2="34" stroke="#0f172a" strokeWidth="1"/>
                    <line x1="15" y1="14" x2="15" y2="34" stroke="#0f172a" strokeWidth="3"/>
                    <line x1="22" y1="14" x2="22" y2="34" stroke="#0f172a" strokeWidth="1.5"/>
                    <line x1="28" y1="14" x2="28" y2="34" stroke="#0f172a" strokeWidth="2"/>
                    <line x1="35" y1="14" x2="35" y2="34" stroke="#0f172a" strokeWidth="1"/>
                    <line x1="42" y1="14" x2="42" y2="34" stroke="#0f172a" strokeWidth="2"/>
                    <line x1="48" y1="14" x2="48" y2="34" stroke="#0f172a" strokeWidth="2.5"/>
                  </g>
                </g>
              ) : (
                // SIDE VIEW PARCEL
                <g>
                  {/* Front Face */}
                  <polygon points="20,70 140,110 140,175 20,135" fill="#a37446" stroke="#784e2c" strokeWidth="2" />
                  {/* Side Face */}
                  <polygon points="140,110 240,70 240,135 140,175" fill="#885b30" stroke="#603b1d" strokeWidth="2" />
                  {/* Top Edge */}
                  <polygon points="20,70 120,30 240,70 140,110" fill="#cca06e" stroke="#9e6e44" strokeWidth="2" />
                </g>
              )}

              {/* DEFECT SPECIFIC OVERLAYS */}
              {parcel.damageType === 'WATER_STAIN' && (
                <g>
                  <ellipse cx="110" cy="115" rx="35" ry="25" fill="#2d1c10" opacity="0.8" />
                  <ellipse cx="90" cy="100" rx="20" ry="15" fill="#1e130a" opacity="0.85" />
                  <circle cx="120" cy="120" r="4" fill="#3b82f6" opacity="0.7" />
                </g>
              )}

              {parcel.damageType === 'TEAR' && (
                <g>
                  <path d="M 90 75 Q 115 85 105 110 T 135 115" stroke="#110a04" strokeWidth="5" fill="none" />
                  <polygon points="95,70 110,65 120,80 100,85" fill="#8a5e37" opacity="0.9" />
                </g>
              )}

              {parcel.damageType === 'DENT' && (
                <g>
                  <path d="M 160 60 L 210 60 L 195 90 L 160 95 Z" fill="#4d321b" opacity="0.9" />
                  <path d="M 160 60 L 195 90 M 180 55 L 190 105" stroke="#1c1007" strokeWidth="3" />
                </g>
              )}
            </svg>

            {/* AI Bounding Box Overlays */}
            {boxes.map((box, idx) => (
              <div
                key={idx}
                className="absolute border-2 rounded shadow-2xl pointer-events-none z-30 transition-all duration-300"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  borderColor: isReject ? '#ef4444' : '#22c55e',
                  backgroundColor: isReject ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                  boxShadow: `0 0 18px ${isReject ? '#ef4444' : '#22c55e'}`
                }}
              >
                {/* Bounding box label tag */}
                <div 
                  className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-md flex items-center space-x-1 ${
                    isReject ? 'bg-red-600' : 'bg-emerald-600'
                  }`}
                >
                  <span>{box.label}</span>
                </div>
              </div>
            ))}

            {/* Normal condition badge if PASS */}
            {parcel.damageType === 'NORMAL' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-950/90 border border-emerald-500/60 backdrop-blur px-3 py-1.5 rounded-lg text-emerald-400 text-[11px] font-mono font-bold flex items-center space-x-1.5 z-20 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>CONDITION NORMAL (99.1%)</span>
              </div>
            )}

          </div>

          {/* Laser Scanner Beam Effect */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8] z-20 animate-scanner"></div>

          {/* Machine Vision Reticle overlay marks */}
          <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-500 space-y-0.5 text-right pointer-events-none">
            <div>ROI: 640x480</div>
            <div>FPS: 28</div>
          </div>
        </div>

        {/* Footer Camera Info */}
        <div className="bg-[#0B1220] border-t border-[#26344A] px-3 py-1.5 flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
          <span className="flex items-center space-x-1">
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-white font-semibold">{isSideView ? 'Camera #2' : 'Camera #1'}</span>
          </span>
          <span>Diffused Ring LED: 100%</span>
        </div>

      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Top Camera Panel */}
      <div>
        <div className="text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Scan className="w-4 h-4 text-sky-400" />
            <span>TOP CAMERA VIEW</span>
          </span>
          <span className="text-[10px] text-[#94A3B8]">Angle: 90° Top-down</span>
        </div>
        {renderBoxSVG(false, parcel.boundingBoxesTop)}
      </div>

      {/* Side Camera Panel */}
      <div>
        <div className="text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>SIDE CAMERA VIEW</span>
          </span>
          <span className="text-[10px] text-[#94A3B8]">Angle: 45° Side Profile</span>
        </div>
        {renderBoxSVG(true, parcel.boundingBoxesSide)}
      </div>
    </div>
  );
};
