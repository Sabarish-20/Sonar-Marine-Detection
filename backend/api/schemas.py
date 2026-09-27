"""
Pydantic schemas for the Sonar API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SurveyTelemetry(BaseModel):
    altitude_m: float = Field(default=8.5, description="Towfish altitude above seabed in meters")
    range_scale_m: float = Field(default=50.0, description="Max slant range in meters per channel")
    vessel_speed_knots: float = Field(default=3.5, description="Vessel speed over ground in knots")
    ping_rate_hz: float = Field(default=10.0, description="Acoustic ping firing rate in Hz")
    start_lat: float = Field(default=18.9218, description="Survey starting WGS84 Latitude")
    start_lon: float = Field(default=72.8347, description="Survey starting WGS84 Longitude")
    heading_deg: float = Field(default=45.0, description="Survey course over ground heading in degrees")
    seabed_type: Optional[str] = Field(default="gravel_sand", description="gravel_sand or mud_pipeline")


class ProcessRequest(BaseModel):
    scenario: str = Field(default="gravel_sand", description="Preset dataset scenario ('gravel_sand' or 'mud_pipeline')")
    despeckle_window: int = Field(default=5, ge=3, le=11)
    despeckle_variance: float = Field(default=0.25, ge=0.01, le=2.0)
    apply_tvg: bool = Field(default=True)
    apply_src: bool = Field(default=True)
    confidence_threshold: float = Field(default=0.50, ge=0.1, le=1.0)
    telemetry: Optional[SurveyTelemetry] = None


class TargetBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class TargetDimensions(BaseModel):
    length_m: float
    width_m: float
    height_m: float
    area_m2: float
    volume_m3: float
    shadow_length_m: float


class TargetCoordinates(BaseModel):
    latitude: float
    longitude: float
    along_track_m: float
    across_track_m: float
    channel_side: str
    pixel_x: int
    pixel_y: int


class DetectedTarget(BaseModel):
    id: str
    class_name: str
    label: str
    severity: str
    confidence: float
    color: str
    description: str
    acoustic_signature: str
    box: TargetBox
    shadow_box: Optional[TargetBox] = None
    contour: Optional[List[List[int]]] = None
    dimensions: TargetDimensions
    coordinates: TargetCoordinates


class SonarProcessResponse(BaseModel):
    success: bool
    survey_id: str
    scenario_type: str
    seabed_type_desc: str
    raw_image_data_uri: str
    processed_image_data_uri: str
    src_corrected_image_data_uri: str
    nadir_info: Dict[str, Any]
    targets: List[DetectedTarget]
    geojson: Dict[str, Any]
    track_points: List[List[float]]
    stats: Dict[str, Any]
    telemetry: SurveyTelemetry
    colormap: str = "copper"


class TargetListResponse(BaseModel):
    total: int
    targets: List[DetectedTarget]
    geojson: Dict[str, Any]
