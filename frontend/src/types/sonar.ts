export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface TargetBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TargetDimensions {
  length_m: number;
  width_m: number;
  height_m: number;
  area_m2: number;
  volume_m3: number;
  shadow_length_m: number;
}

export interface TargetCoordinates {
  latitude: number;
  longitude: number;
  along_track_m: number;
  across_track_m: number;
  channel_side: 'port' | 'starboard';
  pixel_x: number;
  pixel_y: number;
}

export interface DetectedTarget {
  id: string;
  class_name: string;
  label: string;
  severity: Severity;
  confidence: number;
  color: string;
  description: string;
  acoustic_signature: string;
  box: TargetBox;
  shadow_box?: TargetBox;
  contour?: number[][];
  dimensions: TargetDimensions;
  coordinates: TargetCoordinates;
}

export interface SurveyTelemetry {
  altitude_m: number;
  range_scale_m: number;
  vessel_speed_knots: number;
  ping_rate_hz: number;
  start_lat: number;
  start_lon: number;
  heading_deg: number;
  seabed_type?: string;
}

export interface NadirInfo {
  center_col: number;
  port_seabed_offset: number;
  starboard_seabed_offset: number;
  port_bottom_profile: number[];
  starboard_bottom_profile: number[];
  water_column_width_px: number;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  description: string;
  altitude_m: number;
  range_scale_m: number;
  targets_count: number;
  key_hazards: string[];
}

export interface SonarProcessResponse {
  success: boolean;
  survey_id: string;
  scenario_type: string;
  seabed_type_desc: string;
  raw_image_data_uri: string;
  processed_image_data_uri: string;
  src_corrected_image_data_uri: string;
  nadir_info: NadirInfo;
  targets: DetectedTarget[];
  geojson: any;
  track_points: [number, number][];
  stats: {
    total_targets: number;
    inference_time_ms: number;
    class_counts: Record<string, number>;
    severity_counts: Record<Severity, number>;
    altitude_m: number;
    range_scale_m: number;
    swath_width_m: number;
  };
  telemetry: SurveyTelemetry;
  colormap: string;
}

export interface ProcessingParameters {
  scenario: string;
  despeckle_window: number;
  despeckle_variance: number;
  apply_tvg: boolean;
  apply_src: boolean;
  confidence_threshold: number;
  colormap: string;
  telemetry: SurveyTelemetry;
}
