import React, { useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polyline, 
  CircleMarker, 
  Popup, 
  Tooltip, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { DetectedTarget, SurveyTelemetry } from '../types/sonar';
import { MapPin, Navigation, Eye, AlertTriangle } from 'lucide-react';

interface MapViewProps {
  targets: DetectedTarget[];
  trackPoints: [number, number][];
  telemetry: SurveyTelemetry;
  selectedTargetId: string | null;
  onSelectTarget: (target: DetectedTarget) => void;
}

// Controller component to dynamically pan/fit map bounds
function MapController({ 
  center, 
  selectedPos 
}: { 
  center: [number, number]; 
  selectedPos: [number, number] | null; 
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPos) {
      map.flyTo(selectedPos, 16, { animate: true, duration: 1.0 });
    } else {
      map.setView(center, 15);
    }
  }, [center, selectedPos, map]);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  targets,
  trackPoints,
  telemetry,
  selectedTargetId,
  onSelectTarget
}) => {
  const centerPosition: [number, number] = [telemetry.start_lat, telemetry.start_lon];

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);
  const selectedPos: [number, number] | null = selectedTarget
    ? [selectedTarget.coordinates.latitude, selectedTarget.coordinates.longitude]
    : null;

  // Format track coordinates for Leaflet Polyline: [lat, lon][]
  const polylinePositions: [number, number][] = trackPoints.length > 0
    ? trackPoints
    : [centerPosition];

  return (
    <div className="relative flex flex-col h-full bg-sonar-900 border border-sonar-700/80 rounded-lg overflow-hidden shadow-xl">
      
      {/* Map Header Toolbar */}
      <div className="bg-sonar-950/90 border-b border-sonar-800 px-3 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sonar-cyan" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Geospatial Survey Swath & GIS Map
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>Heading: <strong className="text-purple-400">{telemetry.heading_deg.toFixed(1)}°</strong></span>
          <span>•</span>
          <span>Swath: <strong className="text-amber-400">{telemetry.range_scale_m * 2}m</strong></span>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="flex-1 w-full h-full min-h-[300px]">
        <MapContainer
          center={centerPosition}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Dark Matter CartoDB Basemap Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController center={centerPosition} selectedPos={selectedPos} />

          {/* Vessel Survey Trajectory Polyline */}
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#00F0FF',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.9
            }}
          >
            <Tooltip permanent={false} direction="top">
              <span className="font-mono text-xs">Vessel Track: {telemetry.heading_deg}° COG</span>
            </Tooltip>
          </Polyline>

          {/* Anomaly Target Markers */}
          {targets.map((tgt) => {
            const isSelected = selectedTargetId === tgt.id;
            const pos: [number, number] = [
              tgt.coordinates.latitude,
              tgt.coordinates.longitude
            ];

            return (
              <CircleMarker
                key={tgt.id}
                center={pos}
                radius={isSelected ? 10 : 7}
                pathOptions={{
                  color: isSelected ? '#FFFFFF' : tgt.color,
                  fillColor: tgt.color,
                  fillOpacity: isSelected ? 1.0 : 0.85,
                  weight: isSelected ? 3 : 1.5
                }}
                eventHandlers={{
                  click: () => onSelectTarget(tgt)
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <div className="text-xs font-mono">
                    <strong className="text-slate-100">{tgt.label}</strong>
                    <div className="text-[10px] text-slate-300">
                      Height: {tgt.dimensions.height_m}m | Conf: {Math.round(tgt.confidence * 100)}%
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="text-xs font-mono min-w-[200px] text-slate-200">
                    <div className="flex items-center justify-between border-b border-sonar-700 pb-1 mb-1.5">
                      <span className="font-bold text-slate-100">{tgt.label}</span>
                      <span
                        className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold text-slate-950"
                        style={{ backgroundColor: tgt.color }}
                      >
                        {tgt.severity}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-300 mb-2">
                      <div><strong>ID:</strong> {tgt.id}</div>
                      <div><strong>Dimensions:</strong> {tgt.dimensions.length_m}m x {tgt.dimensions.width_m}m x {tgt.dimensions.height_m}m</div>
                      <div><strong>Shadow (Ls):</strong> {tgt.dimensions.shadow_length_m}m</div>
                      <div><strong>Channel:</strong> {tgt.coordinates.channel_side.toUpperCase()} ({tgt.coordinates.across_track_m}m)</div>
                      <div><strong>Lat/Lon:</strong> {tgt.coordinates.latitude.toFixed(5)}°, {tgt.coordinates.longitude.toFixed(5)}°</div>
                    </div>

                    <button
                      onClick={() => onSelectTarget(tgt)}
                      className="w-full mt-1 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-[11px] transition flex items-center justify-center gap-1 shadow"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect Target</span>
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 bg-sonar-950/90 border border-sonar-700 p-2 rounded text-[10px] font-mono text-slate-300 z-[1000] shadow-lg">
        <div className="font-bold text-slate-400 mb-1">HAZARD SEVERITY</div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Critical (UXO / Container)</span>
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>High (Ghost Net / Pipeline)</span>
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Medium (Steel Drum)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Low (Tyre / Debris)</span>
        </div>
      </div>

    </div>
  );
};
