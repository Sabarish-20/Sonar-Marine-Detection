import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Palette, 
  Play, 
  Pause, 
  Crosshair, 
  Sliders, 
  Info, 
  Maximize2
} from 'lucide-react';
import { DetectedTarget, NadirInfo, SurveyTelemetry } from '../types/sonar';

interface WaterfallViewerProps {
  rawImageUri: string;
  processedImageUri: string;
  srcCorrectedImageUri: string;
  targets: DetectedTarget[];
  nadirInfo?: NadirInfo;
  telemetry: SurveyTelemetry;
  selectedTargetId: string | null;
  onSelectTarget: (target: DetectedTarget) => void;
  colormap: string;
  onChangeColormap: (cm: string) => void;
  applySrc: boolean;
}

export const WaterfallViewer: React.FC<WaterfallViewerProps> = ({
  rawImageUri,
  processedImageUri,
  srcCorrectedImageUri,
  targets,
  nadirInfo,
  telemetry,
  selectedTargetId,
  onSelectTarget,
  colormap,
  onChangeColormap,
  applySrc
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // View & Transform States
  const [viewMode, setViewMode] = useState<'processed' | 'corrected' | 'raw'>('processed');
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Display Toggles
  const [showHighlights, setShowHighlights] = useState<boolean>(true);
  const [showShadows, setShowShadows] = useState<boolean>(true);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [showNadirLines, setShowNadirLines] = useState<boolean>(true);
  const [showGridRuler, setShowGridRuler] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [scrollOffset, setScrollOffset] = useState<number>(0);

  // Hover Tooltip State
  const [hoveredTarget, setHoveredTarget] = useState<DetectedTarget | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // Active Image reference
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Determine active image URI based on viewMode
  const currentImageUri = 
    viewMode === 'corrected' ? srcCorrectedImageUri :
    viewMode === 'raw' ? rawImageUri :
    processedImageUri;

  // Load image when URI changes
  useEffect(() => {
    if (!currentImageUri) return;
    const img = new Image();
    img.src = currentImageUri;
    img.onload = () => {
      imageObjRef.current = img;
      renderCanvas();
    };
  }, [currentImageUri, viewMode]);

  // Waterfall animation simulation
  useEffect(() => {
    let animationFrameId: number;
    if (isStreaming) {
      const animate = () => {
        setScrollOffset((prev) => (prev + 1) % 600);
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming]);

  // Re-render canvas on dependencies change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObjRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageObjRef.current;
    const imgW = img.width || 800;
    const imgH = img.height || 600;

    // Set canvas dimensions
    canvas.width = imgW;
    canvas.height = imgH;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply zoom and pan
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Draw Waterfall Sonar Image (with simulated wrap scroll if streaming)
    if (isStreaming && scrollOffset > 0) {
      const part1H = imgH - scrollOffset;
      ctx.drawImage(img, 0, 0, imgW, part1H, 0, scrollOffset, imgW, part1H);
      ctx.drawImage(img, 0, part1H, imgW, scrollOffset, 0, 0, imgW, scrollOffset);
    } else {
      ctx.drawImage(img, 0, 0, imgW, imgH);
    }

    const centerCol = imgW / 2;

    // Draw Nadir Line and Water Column Boundaries (if not in SRC mode)
    if (showNadirLines && viewMode !== 'corrected') {
      // Center Nadir Line
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(centerCol, 0);
      ctx.lineTo(centerCol, imgH);
      ctx.stroke();

      // Draw bottom tracking profiles if available
      if (nadirInfo && nadirInfo.port_bottom_profile && nadirInfo.starboard_bottom_profile) {
        ctx.strokeStyle = 'rgba(255, 184, 0, 0.6)';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([2 / zoom, 2 / zoom]);

        // Port Seabed First Arrival
        ctx.beginPath();
        for (let r = 0; r < nadirInfo.port_bottom_profile.length; r++) {
          const px = nadirInfo.port_bottom_profile[r];
          if (r === 0) ctx.moveTo(px, r);
          else ctx.lineTo(px, r);
        }
        ctx.stroke();

        // Starboard Seabed First Arrival
        ctx.beginPath();
        for (let r = 0; r < nadirInfo.starboard_bottom_profile.length; r++) {
          const sx = nadirInfo.starboard_bottom_profile[r];
          if (r === 0) ctx.moveTo(sx, r);
          else ctx.lineTo(sx, r);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw Target Detections Overlays
    targets.forEach((tgt) => {
      const isSelected = selectedTargetId === tgt.id;
      const isHovered = hoveredTarget?.id === tgt.id;
      const hl = tgt.box;
      const sh = tgt.shadow_box;

      // 1. Draw Acoustic Propagation Ray Vector
      if (showShadows && sh) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([3 / zoom, 3 / zoom]);
        ctx.beginPath();
        const startX = tgt.coordinates.channel_side === 'port' ? hl.x + hl.width : hl.x;
        const startY = hl.y + hl.height / 2;
        const endX = tgt.coordinates.channel_side === 'port' ? sh.x : sh.x + sh.width;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, startY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Shadow Boundary Box
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
        ctx.lineWidth = 1 / zoom;
        ctx.fillRect(sh.x, sh.y, sh.width, sh.height);
        ctx.strokeRect(sh.x, sh.y, sh.width, sh.height);

        // Shadow Tag
        ctx.font = `${Math.max(9, 10 / zoom)}px JetBrains Mono, monospace`;
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`Ls: ${tgt.dimensions.shadow_length_m}m`, sh.x, sh.y + sh.height + 12 / zoom);
      }

      // 2. Draw Polygon Contour
      if (showContours && tgt.contour && tgt.contour.length > 2) {
        ctx.strokeStyle = isSelected ? '#00F0FF' : tgt.color;
        ctx.fillStyle = `${tgt.color}22`; // 15% opacity fill
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoom;
        ctx.beginPath();
        tgt.contour.forEach(([cx, cy], i) => {
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 3. Draw Specular Highlight Box
      if (showHighlights) {
        ctx.strokeStyle = isSelected ? '#00F0FF' : (isHovered ? '#FFFFFF' : tgt.color);
        ctx.lineWidth = (isSelected ? 2.5 : 1.5) / zoom;
        ctx.strokeRect(hl.x, hl.y, hl.width, hl.height);

        // Target Tag Pill Header
        const tagText = `${tgt.label.split(' ')[0]} ${Math.round(tgt.confidence * 100)}%`;
        ctx.font = `bold ${Math.max(9, 11 / zoom)}px JetBrains Mono, monospace`;
        const textMetrics = ctx.measureText(tagText);
        const padX = 4 / zoom;
        const tagH = 16 / zoom;
        const tagY = hl.y - tagH - 2 / zoom;

        // Background tag badge
        ctx.fillStyle = isSelected ? '#00F0FF' : tgt.color;
        ctx.fillRect(hl.x, Math.max(0, tagY), textMetrics.width + padX * 2, tagH);

        // Text
        ctx.fillStyle = '#060B13';
        ctx.fillText(tagText, hl.x + padX, Math.max(0, tagY) + 12 / zoom);

        // Physical height badge
        const hText = `Ht: ${tgt.dimensions.height_m}m`;
        ctx.font = `${Math.max(8, 10 / zoom)}px JetBrains Mono, monospace`;
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(hText, hl.x, hl.y + hl.height + 12 / zoom);
      }
    });

    // Draw Across-Track Grid & Range Scale Ruler
    if (showGridRuler) {
      const maxRange = telemetry.range_scale_m;
      const stepM = maxRange > 50 ? 20 : 10;
      const pxPerM = (imgW / 2) / maxRange;

      ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
      ctx.font = `${Math.max(8, 10 / zoom)}px JetBrains Mono, monospace`;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5 / zoom;

      // Port side intervals (-range to 0)
      for (let m = stepM; m <= maxRange; m += stepM) {
        const xPort = centerCol - m * pxPerM;
        ctx.beginPath();
        ctx.moveTo(xPort, 0);
        ctx.lineTo(xPort, imgH);
        ctx.stroke();
        ctx.fillText(`-${m}m`, xPort + 2 / zoom, 16 / zoom);
      }

      // Starboard side intervals (0 to +range)
      for (let m = stepM; m <= maxRange; m += stepM) {
        const xStbd = centerCol + m * pxPerM;
        ctx.beginPath();
        ctx.moveTo(xStbd, 0);
        ctx.lineTo(xStbd, imgH);
        ctx.stroke();
        ctx.fillText(`+${m}m`, xStbd + 2 / zoom, 16 / zoom);
      }

      // Channel Labels
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.font = `bold ${Math.max(10, 13 / zoom)}px Plus Jakarta Sans, sans-serif`;
      ctx.fillText('◄ PORT CHANNEL', 14 / zoom, 28 / zoom);
      ctx.fillText('STARBOARD CHANNEL ►', imgW - (170 / zoom), 28 / zoom);
    }

    ctx.restore();
  }, [
    zoom,
    panOffset,
    viewMode,
    targets,
    selectedTargetId,
    hoveredTarget,
    showHighlights,
    showShadows,
    showContours,
    showNadirLines,
    showGridRuler,
    isStreaming,
    scrollOffset,
    nadirInfo,
    telemetry
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Mouse Interactivity: Pan, Zoom, Hover & Click
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    // Hit test targets for hover
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseCanvasX = ((e.clientX - rect.left) * scaleX - panOffset.x) / zoom;
    const mouseCanvasY = ((e.clientY - rect.top) * scaleY - panOffset.y) / zoom;
    setMouseCanvasPos({ x: e.clientX, y: e.clientY });

    const found = targets.find((t) => {
      const b = t.box;
      return (
        mouseCanvasX >= b.x - 5 &&
        mouseCanvasX <= b.x + b.width + 5 &&
        mouseCanvasY >= b.y - 5 &&
        mouseCanvasY <= b.y + b.height + 5
      );
    });

    setHoveredTarget(found || null);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredTarget) {
      onSelectTarget(hoveredTarget);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 5.0));
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative flex flex-col h-full bg-sonar-900 border border-sonar-700/80 rounded-lg overflow-hidden shadow-2xl">
      
      {/* Top Controls Toolbar */}
      <div className="bg-sonar-950/90 border-b border-sonar-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10">
        
        {/* Waterfall Mode Selector */}
        <div className="flex items-center gap-1 bg-sonar-900 p-0.5 rounded border border-sonar-700">
          <button
            onClick={() => setViewMode('processed')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition ${
              viewMode === 'processed'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            TVG + Despeckle
          </button>
          <button
            onClick={() => setViewMode('corrected')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition ${
              viewMode === 'corrected'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Ground-range rectified horizontal projection (SRC)"
          >
            Slant-Range Corrected (SRC)
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition ${
              viewMode === 'raw'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Raw Sonar
          </button>
        </div>

        {/* Colormap Selector */}
        <div className="flex items-center gap-1.5 bg-sonar-900 px-2 py-1 rounded border border-sonar-700">
          <Palette className="w-3.5 h-3.5 text-sonar-teal" />
          <span className="text-[11px] text-slate-400">Palette:</span>
          <select
            value={colormap}
            onChange={(e) => onChangeColormap(e.target.value)}
            className="bg-sonar-950 text-xs font-mono text-cyan-300 border-none focus:outline-none cursor-pointer"
          >
            <option value="copper">Acoustic Copper</option>
            <option value="amber">Deep Amber</option>
            <option value="bronze">Thermal Bronze</option>
            <option value="viridis">Viridis Spectral</option>
            <option value="jet">Jet Rainbow</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </div>

        {/* Toggle Overlays */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`px-2 py-1 text-xs rounded border transition flex items-center gap-1 ${
              showHighlights
                ? 'bg-sonar-800 text-cyan-300 border-cyan-500/40'
                : 'bg-sonar-950 text-slate-500 border-sonar-800'
            }`}
            title="Toggle Highlight Detections"
          >
            <Crosshair className="w-3 h-3" />
            <span>Highlights</span>
          </button>
          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`px-2 py-1 text-xs rounded border transition flex items-center gap-1 ${
              showShadows
                ? 'bg-sonar-800 text-cyan-300 border-cyan-500/40'
                : 'bg-sonar-950 text-slate-500 border-sonar-800'
            }`}
            title="Toggle Acoustic Shadows"
          >
            <span>Shadows</span>
          </button>
          <button
            onClick={() => setShowContours(!showContours)}
            className={`px-2 py-1 text-xs rounded border transition ${
              showContours
                ? 'bg-sonar-800 text-cyan-300 border-cyan-500/40'
                : 'bg-sonar-950 text-slate-500 border-sonar-800'
            }`}
            title="Toggle Polygon Contours"
          >
            Contours
          </button>
          <button
            onClick={() => setShowGridRuler(!showGridRuler)}
            className={`px-2 py-1 text-xs rounded border transition ${
              showGridRuler
                ? 'bg-sonar-800 text-cyan-300 border-cyan-500/40'
                : 'bg-sonar-950 text-slate-500 border-sonar-800'
            }`}
            title="Toggle Range Rulers"
          >
            Ruler
          </button>
        </div>

        {/* Zoom & Navigation Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`p-1.5 rounded border transition ${
              isStreaming
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                : 'bg-sonar-900 text-slate-400 hover:text-white border-sonar-700'
            }`}
            title={isStreaming ? 'Pause waterfall movement' : 'Simulate continuous waterfall movement'}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setZoom((prev) => Math.min(prev * 1.2, 5.0))}
            className="p-1.5 bg-sonar-900 hover:bg-sonar-800 text-slate-300 rounded border border-sonar-700 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((prev) => Math.max(prev * 0.8, 0.5))}
            className="p-1.5 bg-sonar-900 hover:bg-sonar-800 text-slate-300 rounded border border-sonar-700 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 bg-sonar-900 hover:bg-sonar-800 text-slate-300 rounded border border-sonar-700 transition"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-cyan-400 ml-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>

      </div>

      {/* Main Interactive Waterfall Canvas Container */}
      <div 
        ref={containerRef}
        className="relative flex-1 bg-[#04080F] overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="max-w-full max-h-full object-contain shadow-inner"
        />

        {/* Hover Tooltip Card */}
        {hoveredTarget && mouseCanvasPos && (
          <div
            className="fixed pointer-events-none z-50 bg-sonar-950/95 border border-cyan-500/60 p-3 rounded-lg shadow-2xl backdrop-blur-md text-xs font-mono w-72"
            style={{
              left: `${mouseCanvasPos.x + 15}px`,
              top: `${mouseCanvasPos.y + 15}px`
            }}
          >
            <div className="flex items-center justify-between border-b border-sonar-800 pb-1.5 mb-1.5">
              <span className="font-bold text-slate-100">{hoveredTarget.label}</span>
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase text-slate-950"
                style={{ backgroundColor: hoveredTarget.color }}
              >
                {hoveredTarget.severity}
              </span>
            </div>
            
            <div className="space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Target ID:</span>
                <span className="text-cyan-300">{hoveredTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Confidence:</span>
                <span className="text-emerald-400 font-bold">{Math.round(hoveredTarget.confidence * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Est. Height (Ht):</span>
                <span className="text-amber-300 font-bold">{hoveredTarget.dimensions.height_m} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Shadow (Ls):</span>
                <span>{hoveredTarget.dimensions.shadow_length_m} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dimensions:</span>
                <span>{hoveredTarget.dimensions.length_m}m x {hoveredTarget.dimensions.width_m}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Position:</span>
                <span className="text-[11px]">{hoveredTarget.coordinates.latitude.toFixed(5)}°, {hoveredTarget.coordinates.longitude.toFixed(5)}°</span>
              </div>
            </div>

            <div className="mt-2 pt-1 border-t border-sonar-800 text-[10px] text-cyan-400 italic">
              Click target on waterfall to view 3D mensuration analysis
            </div>
          </div>
        )}

        {/* Live Status Overlay Ribbon */}
        <div className="absolute bottom-2 left-3 bg-sonar-950/80 border border-sonar-800 px-2 py-1 rounded text-[11px] font-mono text-slate-400 pointer-events-none flex items-center gap-3">
          <span>Mode: <strong className="text-cyan-400">{viewMode.toUpperCase()}</strong></span>
          <span>•</span>
          <span>Detections: <strong className="text-amber-400">{targets.length}</strong></span>
          <span>•</span>
          <span>Resolution: <strong className="text-slate-200">{(telemetry.range_scale_m / 400).toFixed(3)} m/px</strong></span>
        </div>

      </div>
    </div>
  );
};
