import React from 'react';
import { 
  Sliders, 
  Sparkles, 
  HelpCircle, 
  RotateCw,
  Cpu,
  Layers
} from 'lucide-react';
import { ProcessingParameters } from '../types/sonar';

interface ProcessingControlsProps {
  params: ProcessingParameters;
  onChangeParams: (params: ProcessingParameters) => void;
  onApply: () => void;
  isLoading: boolean;
}

export const ProcessingControls: React.FC<ProcessingControlsProps> = ({
  params,
  onChangeParams,
  onApply,
  isLoading
}) => {
  return (
    <div className="bg-sonar-900 border border-sonar-700/80 rounded-lg p-3.5 shadow-xl select-none font-mono text-xs">
      <div className="flex items-center justify-between border-b border-sonar-800 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sonar-teal" />
          <span className="font-bold text-slate-100 uppercase tracking-wider">
            Acoustic Pipeline & Filter Controls
          </span>
        </div>
        <button
          onClick={onApply}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition shadow disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Apply Pipeline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Slant-Range Correction (SRC) Switch */}
        <div className="bg-sonar-950/70 p-2.5 rounded border border-sonar-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <span>Slant-Range (SRC)</span>
              <span title="Reprojects slant range (Rs) to true horizontal seabed ground range (Rg = sqrt(Rs^2 - Hf^2))">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              </span>
            </span>
            <input
              type="checkbox"
              checked={params.apply_src}
              onChange={(e) => onChangeParams({ ...params, apply_src: e.target.checked })}
              className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Linearizes seabed distance & removes water column gap.
          </p>
        </div>

        {/* Time-Varying Gain (TVG) Equalization */}
        <div className="bg-sonar-950/70 p-2.5 rounded border border-sonar-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <span>TVG Curve Equalizer</span>
              <span title="Flattens radial acoustic transmission loss falloff across scan width">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              </span>
            </span>
            <input
              type="checkbox"
              checked={params.apply_tvg}
              onChange={(e) => onChangeParams({ ...params, apply_tvg: e.target.checked })}
              className="w-4 h-4 accent-cyan-500 cursor-pointer rounded"
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Compensates spreading loss & absorption attenuation.
          </p>
        </div>

        {/* Lee Speckle Filter Settings */}
        <div className="bg-sonar-950/70 p-2.5 rounded border border-sonar-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold">Lee Speckle Window</span>
            <span className="text-cyan-400 font-bold">{params.despeckle_window}x{params.despeckle_window}</span>
          </div>
          <input
            type="range"
            min={3}
            max={9}
            step={2}
            value={params.despeckle_window}
            onChange={(e) => onChangeParams({ ...params, despeckle_window: parseInt(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>3x3 (Sharp)</span>
            <span>9x9 (Smooth)</span>
          </div>
        </div>

        {/* AI Confidence Threshold */}
        <div className="bg-sonar-950/70 p-2.5 rounded border border-sonar-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-bold">AI Conf. Threshold</span>
            <span className="text-emerald-400 font-bold">{Math.round(params.confidence_threshold * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={0.95}
            step={0.05}
            value={params.confidence_threshold}
            onChange={(e) => onChangeParams({ ...params, confidence_threshold: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>20% (High Recall)</span>
            <span>95% (High Precision)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
