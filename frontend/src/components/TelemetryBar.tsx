import React from 'react';
import { 
  Gauge, 
  ArrowUpRight, 
  Radio, 
  Compass, 
  Layers, 
  Navigation, 
  Zap,
  Globe2
} from 'lucide-react';
import { SurveyTelemetry } from '../types/sonar';

interface TelemetryBarProps {
  telemetry: SurveyTelemetry;
  swathWidthM: number;
  inferenceTimeMs: number;
  seabedDesc: string;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  telemetry,
  swathWidthM,
  inferenceTimeMs,
  seabedDesc
}) => {
  return (
    <div className="bg-sonar-950 border-b border-sonar-800/80 px-4 py-2 text-xs font-mono select-none">
      <div className="max-w-[1920px] mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        {/* Speed Over Ground (SOG) */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Speed (SOG)</div>
            <div className="text-slate-100 font-bold">
              {telemetry.vessel_speed_knots} <span className="text-slate-400 text-[10px]">kts</span>
            </div>
          </div>
        </div>

        {/* Towfish Altitude */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Altitude (Hf)</div>
            <div className="text-emerald-300 font-bold">
              {telemetry.altitude_m} <span className="text-slate-400 text-[10px]">m</span>
            </div>
          </div>
        </div>

        {/* Range Scale */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Radio className="w-4 h-4 text-teal-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Range Scale</div>
            <div className="text-slate-100 font-bold">
              {telemetry.range_scale_m} <span className="text-slate-400 text-[10px]">m/ch</span>
            </div>
          </div>
        </div>

        {/* Total Swath Width */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Layers className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Swath Width</div>
            <div className="text-amber-300 font-bold">
              {swathWidthM} <span className="text-slate-400 text-[10px]">m total</span>
            </div>
          </div>
        </div>

        {/* Course Over Ground Heading */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Compass className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Heading (COG)</div>
            <div className="text-slate-100 font-bold">
              {telemetry.heading_deg.toFixed(1)}° <span className="text-slate-400 text-[10px]">T</span>
            </div>
          </div>
        </div>

        {/* GPS Anchor Position */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Globe2 className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Start Position</div>
            <div className="text-slate-200 text-[11px] truncate">
              {telemetry.start_lat.toFixed(4)}°N, {telemetry.start_lon.toFixed(4)}°E
            </div>
          </div>
        </div>

        {/* Ping Rate */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Navigation className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Ping Rate</div>
            <div className="text-slate-100 font-bold">
              {telemetry.ping_rate_hz} <span className="text-slate-400 text-[10px]">Hz</span>
            </div>
          </div>
        </div>

        {/* Inference Latency */}
        <div className="flex items-center gap-2 bg-sonar-900/60 border border-sonar-800 px-2.5 py-1.5 rounded">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
          <div className="overflow-hidden">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Inference Time</div>
            <div className="text-yellow-300 font-bold">
              {inferenceTimeMs} <span className="text-slate-400 text-[10px]">ms</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
