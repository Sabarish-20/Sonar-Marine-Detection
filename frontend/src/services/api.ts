import { SonarProcessResponse, ScenarioInfo, ProcessingParameters } from '../types/sonar';

const API_BASE = '/api/sonar';

export async function fetchScenarios(): Promise<ScenarioInfo[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error(`Failed to fetch scenarios: ${res.statusText}`);
  return res.json();
}

export async function processSonar(params: ProcessingParameters): Promise<SonarProcessResponse> {
  const res = await fetch(`${API_BASE}/process?colormap=${encodeURIComponent(params.colormap)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario: params.scenario,
      despeckle_window: params.despeckle_window,
      despeckle_variance: params.despeckle_variance,
      apply_tvg: params.apply_tvg,
      apply_src: params.apply_src,
      confidence_threshold: params.confidence_threshold,
      telemetry: params.telemetry
    })
  });
  if (!res.ok) throw new Error(`Processing failed: ${res.statusText}`);
  return res.json();
}

export async function uploadSonarFile(formData: FormData): Promise<SonarProcessResponse> {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export function getExportReportUrl(): string {
  return `${API_BASE}/export/report`;
}

export function getExportGeoJsonUrl(): string {
  return `${API_BASE}/export/geojson`;
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/export/csv`;
}
