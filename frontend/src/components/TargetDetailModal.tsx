import React from 'react';
import { 
  X, 
  ShieldAlert, 
  Ruler, 
  Compass, 
  Layers, 
  Box, 
  Activity, 
  FileText,
  MapPin
} from 'lucide-react';
import { DetectedTarget, SurveyTelemetry } from '../types/sonar';

interface TargetDetailModalProps {
  target: DetectedTarget | null;
  telemetry: SurveyTelemetry;
  onClose: () => void;
}

export const TargetDetailModal: React.FC<TargetDetailModalProps> = ({
  target,
  telemetry,
  onClose
}) => {
  if (!target) return null;

  const dims = target.dimensions;
  const coords = target.coordinates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-sonar-900 border border-cyan-500/50 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl font-mono text-xs">
        
        {/* Modal Header */}
        <div className="bg-sonar-950 px-5 py-4 border-b border-sonar-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span 
              className="w-3.5 h-3.5 rounded-full" 
              style={{ backgroundColor: target.color }} 
            />
            <div>
              <h2 className="text-base font-bold text-slate-100">{target.label}</h2>
              <p className="text-slate-400 text-[11px] flex items-center gap-2">
                <span>ID: <strong className="text-cyan-400">{target.id}</strong></span>
                <span>•</span>
                <span>Class: <strong className="text-slate-300">{target.class_name}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded text-xs font-extrabold uppercase text-slate-950"
              style={{ backgroundColor: target.color }}
            >
              {target.severity} SEVERITY
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-sonar-800 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-slate-200">
          
          {/* Acoustic Physical Mensuration Mathematical Breakdown */}
          <div className="bg-sonar-950/80 border border-sonar-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3">
              <Ruler className="w-4 h-4" />
              <span className="uppercase tracking-wider">Acoustic Trigonometry Mensuration</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-sonar-900 p-2.5 rounded border border-sonar-800">
                <div className="text-[10px] text-slate-400">Target Height (Ht)</div>
                <div className="text-base font-bold text-amber-300">{dims.height_m} m</div>
              </div>
              <div className="bg-sonar-900 p-2.5 rounded border border-sonar-800">
                <div className="text-[10px] text-slate-400">Shadow Length (Ls)</div>
                <div className="text-base font-bold text-slate-100">{dims.shadow_length_m} m</div>
              </div>
              <div className="bg-sonar-900 p-2.5 rounded border border-sonar-800">
                <div className="text-[10px] text-slate-400">Length x Width</div>
                <div className="text-base font-bold text-slate-100">{dims.length_m}m x {dims.width_m}m</div>
              </div>
              <div className="bg-sonar-900 p-2.5 rounded border border-sonar-800">
                <div className="text-[10px] text-slate-400">Volume Envelope</div>
                <div className="text-base font-bold text-teal-300">{dims.volume_m3} m³</div>
              </div>
            </div>

            {/* Live Formula Display */}
            <div className="bg-[#060B13] p-3 rounded border border-cyan-500/20 text-slate-300 space-y-1 text-[11px]">
              <div className="text-cyan-400 font-bold">Acoustic Shadow Height Formula:</div>
              <div className="text-slate-100 font-mono">
                {`Ht = (Hf × Ls) / Rs = (${telemetry.altitude_m}m × ${dims.shadow_length_m}m) / sqrt((${coords.across_track_m} + ${dims.shadow_length_m})² + ${telemetry.altitude_m}²) = ${dims.height_m} m`}
              </div>
            </div>
          </div>

          {/* Spatial & Navigation Geolocation */}
          <div className="bg-sonar-950/80 border border-sonar-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 font-bold mb-3">
              <MapPin className="w-4 h-4" />
              <span className="uppercase tracking-wider">Geospatial Coordinates & Track Offset</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-300">
              <div>
                <span className="text-slate-500">WGS84 Latitude:</span>
                <div className="text-slate-100 font-bold">{coords.latitude.toFixed(7)}° N</div>
              </div>
              <div>
                <span className="text-slate-500">WGS84 Longitude:</span>
                <div className="text-slate-100 font-bold">{coords.longitude.toFixed(7)}° E</div>
              </div>
              <div>
                <span className="text-slate-500">Across-Track Swath Offset:</span>
                <div className="text-slate-100 font-bold">
                  {coords.channel_side.toUpperCase()} channel ({coords.across_track_m} m from center)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Along-Track Survey Distance:</span>
                <div className="text-slate-100 font-bold">{coords.along_track_m} m</div>
              </div>
            </div>
          </div>

          {/* Acoustic Signature & Classification Description */}
          <div className="bg-sonar-950/80 border border-sonar-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Activity className="w-4 h-4" />
              <span className="uppercase tracking-wider">Acoustic Morphology & Assessment</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{target.description}</p>
            <div className="text-slate-400 text-[11px] pt-1 border-t border-sonar-800/60">
              <strong className="text-slate-300">Acoustic Signature:</strong> {target.acoustic_signature}
            </div>
          </div>

          {/* Operational Mitigation Action Protocol */}
          <div className="bg-sonar-950/80 border border-red-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span className="uppercase tracking-wider">Standard Operating Protocol (SOP)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {target.severity === 'critical' && 
                'IMMEDIATE HAZARD ACTION: Mark nautical exclusion radius. Dispatch EOD disposal or clearance vessel prior to any dredging or anchoring.'}
              {target.severity === 'high' && 
                'ECOLOGICAL / STRUCTURAL PRIORITY: ROV visual confirmation required. Deploy mechanical recovery grapple for ghost net extraction.'}
              {target.severity === 'medium' && 
                'MONITORING NOTICE: Log anomaly in marine database for periodic bathymetric trend and corrosion monitoring.'}
              {target.severity === 'low' && 
                'ROUTINE DEBRIS: Flag for scheduled coastal harbor cleanup campaign.'}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-sonar-950 px-5 py-3 border-t border-sonar-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sonar-800 hover:bg-sonar-700 text-slate-200 rounded font-medium transition"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
