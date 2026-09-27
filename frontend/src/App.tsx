import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TelemetryBar } from './components/TelemetryBar';
import { WaterfallViewer } from './components/WaterfallViewer';
import { MapView } from './components/MapView';
import { TargetTable } from './components/TargetTable';
import { ProcessingControls } from './components/ProcessingControls';
import { TargetDetailModal } from './components/TargetDetailModal';
import { UploadModal } from './components/UploadModal';
import { fetchScenarios, processSonar } from './services/api';
import { 
  SonarProcessResponse, 
  ScenarioInfo, 
  ProcessingParameters, 
  DetectedTarget 
} from './types/sonar';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [activeScenario, setActiveScenario] = useState<string>('gravel_sand');
  const [sonarData, setSonarData] = useState<SonarProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Target for Inspector & Highlighting
  const [selectedTarget, setSelectedTarget] = useState<DetectedTarget | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Pipeline Processing Parameters
  const [params, setParams] = useState<ProcessingParameters>({
    scenario: 'gravel_sand',
    despeckle_window: 5,
    despeckle_variance: 0.25,
    apply_tvg: true,
    apply_src: true,
    confidence_threshold: 0.50,
    colormap: 'copper',
    telemetry: {
      altitude_m: 8.5,
      range_scale_m: 50.0,
      vessel_speed_knots: 3.5,
      ping_rate_hz: 10.0,
      start_lat: 18.9218,
      start_lon: 72.8347,
      heading_deg: 45.0,
      seabed_type: 'gravel_sand'
    }
  });

  // Load scenarios on mount
  useEffect(() => {
    async function init() {
      try {
        const scList = await fetchScenarios();
        setScenarios(scList);
        await runPipeline(params);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize sonar system.');
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const runPipeline = async (currentParams: ProcessingParameters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await processSonar(currentParams);
      setSonarData(response);
      setParams((prev) => ({
        ...prev,
        telemetry: response.telemetry,
        scenario: response.scenario_type
      }));
      // Reset selected target if not in new list
      if (selectedTarget) {
        const found = response.targets.find((t) => t.id === selectedTarget.id);
        setSelectedTarget(found || null);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing acoustic sonar data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId);
    const updatedParams = { ...params, scenario: scenarioId };
    setParams(updatedParams);
    runPipeline(updatedParams);
  };

  const handleSelectTarget = (tgt: DetectedTarget) => {
    setSelectedTarget(tgt);
    setIsDetailModalOpen(true);
  };

  const handleChangeColormap = (cm: string) => {
    const updated = { ...params, colormap: cm };
    setParams(updated);
    runPipeline(updated);
  };

  const criticalCount = sonarData?.stats.severity_counts.critical || 0;

  return (
    <div className="flex flex-col min-h-screen bg-[#060B13] text-slate-100 font-sans">
      
      {/* 1. Global Tactical Navigation Header */}
      <Header
        surveyId={sonarData?.survey_id || 'SRV-INITIALIZING'}
        scenario={activeScenario}
        scenarios={scenarios}
        onSelectScenario={handleSelectScenario}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onRefresh={() => runPipeline(params)}
        isLoading={isLoading}
        totalTargets={sonarData?.targets.length || 0}
        criticalCount={criticalCount}
      />

      {/* 2. Hydrographic Sensor Telemetry Bar */}
      {sonarData && (
        <TelemetryBar
          telemetry={sonarData.telemetry}
          swathWidthM={sonarData.stats.swath_width_m}
          inferenceTimeMs={sonarData.stats.inference_time_ms}
          seabedDesc={sonarData.seabed_type_desc}
        />
      )}

      {/* Main Operational Workspace Grid */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 flex flex-col gap-3">
        
        {/* Error Notification */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-lg flex items-center gap-3 text-red-200 text-xs font-mono">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <strong>System Error:</strong> {error}
            </div>
            <button
              onClick={() => runPipeline(params)}
              className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Split View: Continuous Waterfall (Left 60%) + Geospatial Map (Right 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[520px]">
          
          {/* Continuous Waterfall Viewer (7 cols) */}
          <div className="lg:col-span-7 h-full">
            {sonarData ? (
              <WaterfallViewer
                rawImageUri={sonarData.raw_image_data_uri}
                processedImageUri={sonarData.processed_image_data_uri}
                srcCorrectedImageUri={sonarData.src_corrected_image_data_uri}
                targets={sonarData.targets}
                nadirInfo={sonarData.nadir_info}
                telemetry={sonarData.telemetry}
                selectedTargetId={selectedTarget?.id || null}
                onSelectTarget={handleSelectTarget}
                colormap={params.colormap}
                onChangeColormap={handleChangeColormap}
                applySrc={params.apply_src}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-sonar-900 border border-sonar-700/80 rounded-lg">
                <Loader2 className="w-8 h-8 text-sonar-cyan animate-spin" />
              </div>
            )}
          </div>

          {/* Geospatial Map View (5 cols) */}
          <div className="lg:col-span-5 h-full">
            {sonarData ? (
              <MapView
                targets={sonarData.targets}
                trackPoints={sonarData.track_points}
                telemetry={sonarData.telemetry}
                selectedTargetId={selectedTarget?.id || null}
                onSelectTarget={handleSelectTarget}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-sonar-900 border border-sonar-700/80 rounded-lg">
                <Loader2 className="w-8 h-8 text-sonar-teal animate-spin" />
              </div>
            )}
          </div>

        </div>

        {/* Filter & Pipeline Preprocessing Controls */}
        <ProcessingControls
          params={params}
          onChangeParams={setParams}
          onApply={() => runPipeline(params)}
          isLoading={isLoading}
        />

        {/* Bottom Panel: Anomaly Catalog Table */}
        <div className="h-[280px]">
          <TargetTable
            targets={sonarData?.targets || []}
            selectedTargetId={selectedTarget?.id || null}
            onSelectTarget={handleSelectTarget}
          />
        </div>

      </main>

      {/* Deep Target Mensuration Modal */}
      {sonarData && (
        <TargetDetailModal
          target={selectedTarget}
          telemetry={sonarData.telemetry}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      {/* Upload Custom Sonar Strip Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(newData) => {
          setSonarData(newData);
          setParams((prev) => ({
            ...prev,
            telemetry: newData.telemetry,
            scenario: 'custom_upload'
          }));
        }}
      />

    </div>
  );
};
