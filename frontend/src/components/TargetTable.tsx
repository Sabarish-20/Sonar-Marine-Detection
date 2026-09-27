import React, { useState } from 'react';
import { 
  DetectedTarget, 
  Severity 
} from '../types/sonar';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Eye, 
  ShieldAlert, 
  Layers,
  ChevronRight
} from 'lucide-react';

interface TargetTableProps {
  targets: DetectedTarget[];
  selectedTargetId: string | null;
  onSelectTarget: (target: DetectedTarget) => void;
}

export const TargetTable: React.FC<TargetTableProps> = ({
  targets,
  selectedTargetId,
  onSelectTarget
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'id' | 'confidence' | 'height' | 'severity'>('severity');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filtering
  const filtered = targets.filter((t) => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.class_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === 'all' || t.severity === severityFilter;
    const matchesChannel = channelFilter === 'all' || t.coordinates.channel_side === channelFilter;

    return matchesSearch && matchesSeverity && matchesChannel;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    const sevWeight: Record<Severity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
      info: 0
    };

    let result = 0;
    if (sortField === 'confidence') {
      result = a.confidence - b.confidence;
    } else if (sortField === 'height') {
      result = a.dimensions.height_m - b.dimensions.height_m;
    } else if (sortField === 'severity') {
      result = sevWeight[a.severity] - sevWeight[b.severity];
    } else {
      result = a.id.localeCompare(b.id);
    }

    return sortAsc ? result : -result;
  });

  const toggleSort = (field: 'id' | 'confidence' | 'height' | 'severity') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sonar-900 border border-sonar-700/80 rounded-lg overflow-hidden shadow-xl">
      
      {/* Table Controls Header */}
      <div className="bg-sonar-950/90 border-b border-sonar-800 p-3 flex flex-wrap items-center justify-between gap-2.5">
        
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sonar-cyan" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Hydrographic Anomaly Catalog ({filtered.length})
          </span>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search target ID, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-sonar-900 text-xs font-mono text-slate-200 pl-8 pr-2.5 py-1 rounded border border-sonar-700 focus:outline-none focus:border-sonar-cyan w-48"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-sonar-900 text-xs font-mono text-slate-300 border border-sonar-700 rounded px-2 py-1 focus:outline-none focus:border-sonar-cyan cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-sonar-900 text-xs font-mono text-slate-300 border border-sonar-700 rounded px-2 py-1 focus:outline-none focus:border-sonar-cyan cursor-pointer"
          >
            <option value="all">Both Channels</option>
            <option value="port">Port Only</option>
            <option value="starboard">Starboard Only</option>
          </select>
        </div>

      </div>

      {/* Target Table Body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead className="bg-sonar-950 text-slate-400 text-[11px] sticky top-0 z-10 border-b border-sonar-800">
            <tr>
              <th 
                onClick={() => toggleSort('id')}
                className="py-2 px-3 font-semibold cursor-pointer hover:text-cyan-300"
              >
                <div className="flex items-center gap-1">
                  <span>Target ID</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold">Classification</th>
              <th 
                onClick={() => toggleSort('severity')}
                className="py-2 px-3 font-semibold cursor-pointer hover:text-cyan-300"
              >
                <div className="flex items-center gap-1">
                  <span>Severity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                onClick={() => toggleSort('confidence')}
                className="py-2 px-3 font-semibold cursor-pointer hover:text-cyan-300"
              >
                <div className="flex items-center gap-1">
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th 
                onClick={() => toggleSort('height')}
                className="py-2 px-3 font-semibold cursor-pointer hover:text-cyan-300"
              >
                <div className="flex items-center gap-1">
                  <span>Height (Ht)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold">Dimensions (LxW)</th>
              <th className="py-2 px-3 font-semibold">Shadow (Ls)</th>
              <th className="py-2 px-3 font-semibold">Channel Offset</th>
              <th className="py-2 px-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sonar-800/60">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                  No acoustic anomalies match current filters
                </td>
              </tr>
            ) : (
              sorted.map((t) => {
                const isSelected = selectedTargetId === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTarget(t)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-cyan-950/60 border-l-4 border-l-sonar-cyan text-cyan-200'
                        : 'hover:bg-sonar-800/50 text-slate-300'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: t.color }}
                      />
                      <span>{t.id}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-100 font-medium">{t.label}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase text-slate-950"
                        style={{ backgroundColor: t.color }}
                      >
                        {t.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {Math.round(t.confidence * 100)}%
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">
                      {t.dimensions.height_m} m
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {t.dimensions.length_m}m x {t.dimensions.width_m}m
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {t.dimensions.shadow_length_m} m
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={t.coordinates.channel_side === 'port' ? 'text-teal-400' : 'text-blue-400'}>
                        {t.coordinates.channel_side.toUpperCase()} ({t.coordinates.across_track_m}m)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget(t);
                        }}
                        className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-sonar-700 rounded transition"
                        title="View Target Mensuration Details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
