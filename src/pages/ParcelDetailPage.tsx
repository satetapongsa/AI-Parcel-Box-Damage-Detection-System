import React from 'react';
import { 
  ArrowLeft, 
  Printer, 
  AlertOctagon, 
  Clock, 
  Layers, 
  FileCheck,
  Check
} from 'lucide-react';
import type { ParcelInspection } from '../types/inspection';
import { ParcelVisualizer } from '../components/ParcelVisualizer';

interface ParcelDetailPageProps {
  parcel: ParcelInspection;
  onBack: () => void;
  onUpdateParcelStatus: (parcelId: string, status: 'PASS' | 'HOLD' | 'MANUAL INSPECTION') => void;
}

export const ParcelDetailPage: React.FC<ParcelDetailPageProps> = ({
  parcel,
  onBack,
  onUpdateParcelStatus
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'HOLD':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'MANUAL INSPECTION':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  const defaultTimeline = [
    { time: parcel.time, event: `AI Vision scan triggered on ${parcel.camera}` },
    { time: parcel.time, event: `CiRA CORE AI model classified condition as ${parcel.damageType}` },
    { time: parcel.time, event: `System assigned automated decision: ${parcel.status}` },
    { time: '14:34:07', event: 'Operator Somchai K. opened evidence record for manual verification', user: 'Op. Somchai K.' },
  ];

  const timeline = parcel.decisionTimeline || defaultTimeline;

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-300 transition-all"
            title="Back to History"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-white tracking-tight font-mono">
                Parcel ID: {parcel.parcelId}
              </h1>
              <span className={`px-3 py-0.5 rounded-full border text-xs font-mono font-bold ${getStatusBadge(parcel.status)}`}>
                {parcel.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Inspection Time: <span className="text-slate-200">{parcel.timestamp}</span>
            </p>
          </div>
        </div>

        {/* Print & Override Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => alert(`Printing evidence label for ${parcel.parcelId}...`)}
            className="flex items-center space-x-2 bg-navy-800 hover:bg-navy-750 border border-navy-700 text-slate-200 font-mono text-xs px-3.5 py-2 rounded-lg transition-all"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Print Evidence Tag</span>
          </button>

          <button
            onClick={() => onUpdateParcelStatus(parcel.parcelId, 'PASS')}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs px-3.5 py-2 rounded-lg shadow transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Override to PASS</span>
          </button>
        </div>
      </div>

      {/* Image Comparison Section (2 Columns) */}
      <div className="bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Image Comparison & AI Bounding Box Analysis</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Source: <span className="text-slate-200 font-bold">{parcel.camera}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Original Camera Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="font-bold uppercase tracking-wider text-slate-400">Original Camera Image</span>
              <span className="text-slate-500 text-[10px]">RAW FRAME (No Bounding Boxes)</span>
            </div>

            <div className="h-80 w-full rounded-xl overflow-hidden border border-navy-700 bg-navy-950">
              <ParcelVisualizer
                parcelId={parcel.parcelId}
                damageType={parcel.damageType}
                confidence={parcel.confidence}
                boundingBoxes={[]} // Empty for original view
                cameraId={parcel.camera}
                isScanning={false}
              />
            </div>
          </div>

          {/* Right Column: AI Detection Result */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="font-bold uppercase tracking-wider text-blue-400">AI Detection Result</span>
              <span className="text-emerald-400 text-[10px] font-bold">CiRA CORE Bounding Box Active</span>
            </div>

            <div className="h-80 w-full rounded-xl overflow-hidden border border-navy-700 bg-navy-950">
              <ParcelVisualizer
                parcelId={parcel.parcelId}
                damageType={parcel.damageType}
                confidence={parcel.confidence}
                boundingBoxes={parcel.boundingBoxes}
                cameraId={parcel.camera}
                isScanning={true}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Detection Info & AI Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Detection Info Cards (2 Cols) */}
        <div className="lg:col-span-2 bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono border-b border-navy-800 pb-3">
            Detection Metrics Summary
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
              <span className="text-slate-400 text-[10px] block">Damage Type</span>
              <span className={`text-base font-bold mt-1 block ${
                parcel.result === 'NORMAL' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {parcel.damageType}
              </span>
            </div>

            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
              <span className="text-slate-400 text-[10px] block">Severity</span>
              <span className={`text-base font-bold mt-1 block ${
                parcel.severity === 'HIGH' || parcel.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'
              }`}>
                {parcel.severity}
              </span>
            </div>

            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
              <span className="text-slate-400 text-[10px] block">Confidence</span>
              <span className="text-base font-bold text-blue-400 mt-1 block">
                {parcel.confidence}%
              </span>
            </div>

            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
              <span className="text-slate-400 text-[10px] block">Detection Count</span>
              <span className="text-base font-bold text-purple-400 mt-1 block">
                {parcel.boundingBoxes.length || 1} ROI Region
              </span>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl space-y-1">
            <div className="flex items-center space-x-2 text-red-400 text-xs font-mono font-bold uppercase">
              <AlertOctagon className="w-4 h-4" />
              <span>AI Recommendation & Action Required</span>
            </div>
            <p className="text-slate-200 text-sm font-semibold pt-1">
              "{parcel.recommendation}"
            </p>
          </div>
        </div>

        {/* Evidence Card (1 Col) */}
        <div className="bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold text-white tracking-tight uppercase border-b border-navy-800 pb-3 flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Inspection Evidence</span>
          </h3>

          <div className="space-y-2 text-slate-300">
            <div className="flex justify-between border-b border-navy-800 py-1">
              <span className="text-slate-400">Camera Source:</span>
              <span className="text-white font-bold">{parcel.camera}</span>
            </div>
            <div className="flex justify-between border-b border-navy-800 py-1">
              <span className="text-slate-400">Scan Timestamp:</span>
              <span className="text-slate-200">{parcel.timestamp}</span>
            </div>
            <div className="flex justify-between border-b border-navy-800 py-1">
              <span className="text-slate-400">AI Framework:</span>
              <span className="text-emerald-400 font-bold">CiRA CORE v4.2</span>
            </div>
            <div className="flex justify-between border-b border-navy-800 py-1">
              <span className="text-slate-400">Model Name:</span>
              <span className="text-slate-200">YOLOv8-Damage-v2.4</span>
            </div>
            <div className="flex justify-between border-b border-navy-800 py-1">
              <span className="text-slate-400">Confidence Score:</span>
              <span className="text-blue-400 font-bold">{parcel.confidence}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Final Audit Status:</span>
              <span className="text-amber-400 font-bold">{parcel.status}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Decision History Timeline */}
      <div className="bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono border-b border-navy-800 pb-3 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Decision History & Audit Trail</span>
        </h3>

        <div className="relative border-l-2 border-navy-700 ml-4 space-y-6 my-2">
          {timeline.map((item, idx) => (
            <div key={idx} className="relative pl-6">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-navy-900 shadow"></span>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono">
                <span className="text-slate-200 font-semibold">{item.event}</span>
                <span className="text-blue-400 font-bold">{item.time}</span>
              </div>

              {item.user && (
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Logged by: <span className="text-slate-300">{item.user}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
