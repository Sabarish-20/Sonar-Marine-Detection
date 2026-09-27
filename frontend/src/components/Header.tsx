import React from 'react';
import { 
  Waves, 
  FileDown, 
  MapPin, 
  UploadCloud, 
  RefreshCw, 
  ShieldAlert, 
  FileSpreadsheet, 
  Layers,
  Activity
} from 'lucide-react';
import { getExportReportUrl, getExportGeoJsonUrl, getExportCsvUrl } from '../services/api';
import { ScenarioInfo } from '../types/sonar';

interface HeaderProps {
  surveyId: string;
  scenario: string;
  scenarios: ScenarioInfo[];
  onSelectScenario: (scenarioId: string) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalTargets: number;
  criticalCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  surveyId,
  scenario,
  scenarios,
  onSelectScenario,
  onOpenUpload,
  onRefresh,
  isLoading,
  totalTargets,
  criticalCount
}) => {
  return (
    <header className="bg-sonar-900 border-b border-sonar-700/80 px-4 py-3 select-none sticky top-0 z-40">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-sonar-800 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Waves className="w-6 h-6 text-sonar-cyan animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider text-slate-100 uppercase">
                AQUASCAN <span className="text-sonar-cyan font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30">SIH26057</span>
              </h1>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Dual-Channel SSS Debris & Anomaly Detection</span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-slate-300">{surveyId}</span>
            </p>
          </div>
        </div>

        {/* Survey Scenario Selector */}
        <div className="flex items-center gap-2 bg-sonar-950/80 p-1.5 rounded-lg border border-sonar-700/60">
          <Layers className="w-4 h-4 text-sonar-teal ml-1" />
          <span className="text-xs text-slate-400 font-medium hidden lg:inline">Scenario:</span>
          <select
            value={scenario}
            onChange={(e) => onSelectScenario(e.target.value)}
            disabled={isLoading}
            className="bg-sonar-900 text-xs font-mono text-cyan-300 border border-sonar-700 rounded px-2.5 py-1 focus:outline-none focus:border-sonar-cyan cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Re-run pipeline"
            className="p-1.5 text-slate-400 hover:text-sonar-cyan hover:bg-sonar-800 rounded transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sonar-cyan' : ''}`} />
          </button>
        </div>

        {/* Quick Threat Indicators & Export Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Threat Metric Pills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-sonar-950/80 border border-sonar-700 px-2.5 py-1 rounded">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-400">Targets:</span>
              <span className="text-xs font-mono font-bold text-cyan-300">{totalTargets}</span>
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 px-2.5 py-1 rounded animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-300 font-bold">Critical:</span>
                <span className="text-xs font-mono font-extrabold text-red-200">{criticalCount}</span>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sonar-800 hover:bg-sonar-700 text-slate-200 hover:text-white rounded border border-sonar-600 text-xs font-medium transition shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-sonar-teal" />
            <span>Upload Sonar</span>
          </button>

          {/* Export Dropdown Group */}
          <div className="flex items-center gap-1 bg-sonar-950/90 border border-sonar-700 p-1 rounded">
            <a
              href={getExportReportUrl()}
              target="_blank"
              rel="noreferrer"
              title="Download Hydrographic Survey PDF Inspection Report"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </a>
            <a
              href={getExportGeoJsonUrl()}
              download
              title="Export GeoJSON FeatureCollection"
              className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-sonar-800 rounded transition"
            >
              <MapPin className="w-3.5 h-3.5" />
            </a>
            <a
              href={getExportCsvUrl()}
              download
              title="Export CSV Target Records"
              className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-sonar-800 rounded transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </header>
  );
};
