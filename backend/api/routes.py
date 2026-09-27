"""
FastAPI Routes for Side-Scan Sonar Acoustic Preprocessing and Target Detection.
"""

from typing import Optional, Dict, Any, List
import io
import csv
import time
import numpy as np
import cv2
from PIL import Image

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from backend.api.schemas import (
    ProcessRequest,
    SonarProcessResponse,
    TargetListResponse,
    SurveyTelemetry,
    DetectedTarget
)
from backend.pipeline.sonar_processor import SonarProcessor
from backend.ml.inference_engine import AnomalyDetector
from backend.ml.synthetic_generator import generate_synthetic_sonar_strip
from backend.ml.target_classes import CLASS_METADATA
from backend.utils.colormaps import matrix_to_base64_data_uri, matrix_to_png_bytes
from backend.api.report_generator import generate_hydrographic_pdf_report

router = APIRouter(prefix="/api/sonar", tags=["Sonar Analysis"])

# State caching for current active survey
CURRENT_STATE: Dict[str, Any] = {
    "survey_id": "SRV-2026-ALPHA",
    "scenario_type": "gravel_sand",
    "seabed_type_desc": "Gravel & Sand Ripples (Shallow Continental Shelf)",
    "raw_matrix": None,
    "processed_matrix": None,
    "src_matrix": None,
    "nadir_info": {},
    "targets": [],
    "geojson": {"type": "FeatureCollection", "features": []},
    "track_points": [],
    "stats": {},
    "telemetry": SurveyTelemetry(),
    "colormap": "copper"
}

processor = SonarProcessor()
detector = AnomalyDetector()


def _ensure_default_state():
    """Initializes default synthetic dataset if none is loaded."""
    if CURRENT_STATE["raw_matrix"] is None:
        _load_scenario("gravel_sand")


def _load_scenario(scenario_name: str, telemetry_override: Optional[SurveyTelemetry] = None):
    """Loads a pre-configured synthetic sonar waterfall strip scenario."""
    tel = telemetry_override or SurveyTelemetry()
    tel.seabed_type = scenario_name
    
    if scenario_name == "gravel_sand":
        tel.start_lat = 18.9218
        tel.start_lon = 72.8347
        tel.heading_deg = 45.0
        tel.altitude_m = 8.5
        tel.range_scale_m = 50.0
        tel.vessel_speed_knots = 3.5
    elif scenario_name == "mud_pipeline":
        tel.start_lat = 18.9450
        tel.start_lon = 72.8610
        tel.heading_deg = 135.0
        tel.altitude_m = 10.2
        tel.range_scale_m = 60.0
        tel.vessel_speed_knots = 3.2
    
    synth_data = generate_synthetic_sonar_strip(
        scenario_type=scenario_name,
        height=600,
        width=800,
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m,
        vessel_speed_knots=tel.vessel_speed_knots,
        start_lat=tel.start_lat,
        start_lon=tel.start_lon,
        heading_deg=tel.heading_deg
    )
    
    # Run pipeline
    proc_result = processor.process_strip(
        synth_data["image"],
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m
    )
    
    # Run ML detection & shadow mensuration
    det_result = detector.detect_and_measure(
        image_matrix=proc_result["tvg_equalized"],
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m,
        start_lat=tel.start_lat,
        start_lon=tel.start_lon,
        heading_deg=tel.heading_deg,
        vessel_speed_knots=tel.vessel_speed_knots,
        ping_rate_hz=tel.ping_rate_hz,
        scenario_hint=scenario_name
    )
    
    CURRENT_STATE["survey_id"] = f"SRV-{int(time.time())%100000}-{scenario_name[:3].upper()}"
    CURRENT_STATE["scenario_type"] = scenario_name
    CURRENT_STATE["seabed_type_desc"] = synth_data["seabed_type_desc"]
    CURRENT_STATE["raw_matrix"] = proc_result["raw"]
    CURRENT_STATE["processed_matrix"] = proc_result["tvg_equalized"]
    CURRENT_STATE["src_matrix"] = proc_result["corrected"]
    CURRENT_STATE["nadir_info"] = proc_result["nadir_info"]
    CURRENT_STATE["targets"] = det_result["targets"]
    CURRENT_STATE["geojson"] = det_result["geojson"]
    CURRENT_STATE["track_points"] = det_result["track_points"]
    CURRENT_STATE["stats"] = det_result["stats"]
    CURRENT_STATE["telemetry"] = tel


# Initialize immediately
_ensure_default_state()


@router.get("/scenarios")
def get_available_scenarios():
    """Returns metadata for pre-configured synthetic survey test scenarios."""
    return [
        {
            "id": "gravel_sand",
            "title": "Scenario 1: Shallow Continental Sand Ripples & Gravel",
            "description": "Gravel & sand ripple seabed containing an abandoned nylon ghost net, sunken steel drum, and vehicle tyre.",
            "altitude_m": 8.5,
            "range_scale_m": 50.0,
            "targets_count": 3,
            "key_hazards": ["Ghost Net", "Metallic Drum", "Sunken Tyre"]
        },
        {
            "id": "mud_pipeline",
            "title": "Scenario 2: Deep Estuarine Silt Trench & Subsea Pipeline",
            "description": "Muddy silt seabed containing a high-risk unexploded ordnance (UXO), subsea pipeline scour anomaly, and sunken shipping container.",
            "altitude_m": 10.2,
            "range_scale_m": 60.0,
            "targets_count": 3,
            "key_hazards": ["UXO Bomb", "Pipeline Scour / Anomaly", "Sunken Container"]
        }
    ]


@router.post("/process", response_model=SonarProcessResponse)
def process_sonar_data(req: ProcessRequest, colormap: str = Query("copper", description="copper, amber, bronze, viridis, jet, grayscale")):
    """
    Executes end-to-end acoustic preprocessing, bottom tracking, TVG, despeckle,
    slant-range correction, and AI highlight-shadow target detection.
    """
    custom_proc = SonarProcessor(
        despeckle_window=req.despeckle_window,
        despeckle_noise_var=req.despeckle_variance,
        apply_tvg=req.apply_tvg,
        apply_src=req.apply_src
    )
    
    # Reload or synthesize scenario
    tel = req.telemetry or CURRENT_STATE["telemetry"]
    synth_data = generate_synthetic_sonar_strip(
        scenario_type=req.scenario,
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m,
        vessel_speed_knots=tel.vessel_speed_knots,
        start_lat=tel.start_lat,
        start_lon=tel.start_lon,
        heading_deg=tel.heading_deg
    )
    
    proc_result = custom_proc.process_strip(
        synth_data["image"],
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m
    )
    
    custom_det = AnomalyDetector(confidence_threshold=req.confidence_threshold)
    det_result = custom_det.detect_and_measure(
        image_matrix=proc_result["tvg_equalized"],
        altitude_m=tel.altitude_m,
        range_scale_m=tel.range_scale_m,
        start_lat=tel.start_lat,
        start_lon=tel.start_lon,
        heading_deg=tel.heading_deg,
        vessel_speed_knots=tel.vessel_speed_knots,
        ping_rate_hz=tel.ping_rate_hz,
        scenario_hint=req.scenario
    )
    
    CURRENT_STATE["survey_id"] = f"SRV-{int(time.time())%100000}-{req.scenario[:3].upper()}"
    CURRENT_STATE["scenario_type"] = req.scenario
    CURRENT_STATE["seabed_type_desc"] = synth_data["seabed_type_desc"]
    CURRENT_STATE["raw_matrix"] = proc_result["raw"]
    CURRENT_STATE["processed_matrix"] = proc_result["tvg_equalized"]
    CURRENT_STATE["src_matrix"] = proc_result["corrected"]
    CURRENT_STATE["nadir_info"] = proc_result["nadir_info"]
    CURRENT_STATE["targets"] = det_result["targets"]
    CURRENT_STATE["geojson"] = det_result["geojson"]
    CURRENT_STATE["track_points"] = det_result["track_points"]
    CURRENT_STATE["stats"] = det_result["stats"]
    CURRENT_STATE["telemetry"] = tel
    CURRENT_STATE["colormap"] = colormap
    
    raw_uri = matrix_to_base64_data_uri(proc_result["raw"], colormap_name=colormap)
    proc_uri = matrix_to_base64_data_uri(proc_result["tvg_equalized"], colormap_name=colormap)
    src_uri = matrix_to_base64_data_uri(proc_result["corrected"], colormap_name=colormap)
    
    return {
        "success": True,
        "survey_id": CURRENT_STATE["survey_id"],
        "scenario_type": req.scenario,
        "seabed_type_desc": synth_data["seabed_type_desc"],
        "raw_image_data_uri": raw_uri,
        "processed_image_data_uri": proc_uri,
        "src_corrected_image_data_uri": src_uri,
        "nadir_info": proc_result["nadir_info"],
        "targets": det_result["targets"],
        "geojson": det_result["geojson"],
        "track_points": det_result["track_points"],
        "stats": det_result["stats"],
        "telemetry": tel,
        "colormap": colormap
    }


@router.post("/upload")
async def upload_sonar_strip(
    file: UploadFile = File(...),
    altitude_m: float = Form(8.5),
    range_scale_m: float = Form(50.0),
    vessel_speed_knots: float = Form(3.5),
    ping_rate_hz: float = Form(10.0),
    start_lat: float = Form(18.9218),
    start_lon: float = Form(72.8347),
    heading_deg: float = Form(45.0)
):
    """
    Ingests custom side-scan sonar waterfall image strip (PNG, JPEG, TIFF)
    and executes automated acoustic bottom tracking, equalization, and target mensuration.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid acoustic image format. Must be single-channel or RGB image.")
        
    tel = SurveyTelemetry(
        altitude_m=altitude_m,
        range_scale_m=range_scale_m,
        vessel_speed_knots=vessel_speed_knots,
        ping_rate_hz=ping_rate_hz,
        start_lat=start_lat,
        start_lon=start_lon,
        heading_deg=heading_deg,
        seabed_type="custom_upload"
    )
    
    proc_result = processor.process_strip(img, altitude_m=altitude_m, range_scale_m=range_scale_m)
    det_result = detector.detect_and_measure(
        image_matrix=proc_result["tvg_equalized"],
        altitude_m=altitude_m,
        range_scale_m=range_scale_m,
        start_lat=start_lat,
        start_lon=start_lon,
        heading_deg=heading_deg,
        vessel_speed_knots=vessel_speed_knots,
        ping_rate_hz=ping_rate_hz
    )
    
    CURRENT_STATE["survey_id"] = f"SRV-UPL-{int(time.time())%100000}"
    CURRENT_STATE["scenario_type"] = "custom_upload"
    CURRENT_STATE["seabed_type_desc"] = "User Uploaded Sonar Waterfall Record"
    CURRENT_STATE["raw_matrix"] = proc_result["raw"]
    CURRENT_STATE["processed_matrix"] = proc_result["tvg_equalized"]
    CURRENT_STATE["src_matrix"] = proc_result["corrected"]
    CURRENT_STATE["nadir_info"] = proc_result["nadir_info"]
    CURRENT_STATE["targets"] = det_result["targets"]
    CURRENT_STATE["geojson"] = det_result["geojson"]
    CURRENT_STATE["track_points"] = det_result["track_points"]
    CURRENT_STATE["stats"] = det_result["stats"]
    CURRENT_STATE["telemetry"] = tel
    
    colormap = "copper"
    return {
        "success": True,
        "survey_id": CURRENT_STATE["survey_id"],
        "scenario_type": "custom_upload",
        "seabed_type_desc": "User Uploaded Acoustic Record",
        "raw_image_data_uri": matrix_to_base64_data_uri(proc_result["raw"], colormap),
        "processed_image_data_uri": matrix_to_base64_data_uri(proc_result["tvg_equalized"], colormap),
        "src_corrected_image_data_uri": matrix_to_base64_data_uri(proc_result["corrected"], colormap),
        "nadir_info": proc_result["nadir_info"],
        "targets": det_result["targets"],
        "geojson": det_result["geojson"],
        "track_points": det_result["track_points"],
        "stats": det_result["stats"],
        "telemetry": tel,
        "colormap": colormap
    }


@router.get("/targets", response_model=TargetListResponse)
def get_detected_targets():
    """Returns list of detected anomalies and GeoJSON FeatureCollection."""
    _ensure_default_state()
    return {
        "total": len(CURRENT_STATE["targets"]),
        "targets": CURRENT_STATE["targets"],
        "geojson": CURRENT_STATE["geojson"]
    }


@router.get("/export/report")
def export_pdf_report():
    """Generates and downloads the Hydrographic Survey PDF anomaly inspection report."""
    _ensure_default_state()
    pdf_bytes = generate_hydrographic_pdf_report(
        survey_meta={
            "survey_id": CURRENT_STATE["survey_id"],
            "seabed_type_desc": CURRENT_STATE["seabed_type_desc"],
            "altitude_m": CURRENT_STATE["telemetry"].altitude_m,
            "range_scale_m": CURRENT_STATE["telemetry"].range_scale_m,
            "vessel_speed_knots": CURRENT_STATE["telemetry"].vessel_speed_knots,
            "heading_deg": CURRENT_STATE["telemetry"].heading_deg,
            "start_lat": CURRENT_STATE["telemetry"].start_lat,
            "start_lon": CURRENT_STATE["telemetry"].start_lon
        },
        targets=CURRENT_STATE["targets"],
        stats=CURRENT_STATE["stats"],
        sonar_matrix=CURRENT_STATE["processed_matrix"]
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Hydrographic_Sonar_Report_{CURRENT_STATE['survey_id']}.pdf"}
    )


@router.get("/export/geojson")
def export_geojson():
    """Returns raw GeoJSON FeatureCollection file for GIS import."""
    _ensure_default_state()
    import json
    content = json.dumps(CURRENT_STATE["geojson"], indent=2)
    return Response(
        content=content,
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename={CURRENT_STATE['survey_id']}_targets.geojson"}
    )


@router.get("/export/csv")
def export_csv_targets():
    """Exports target anomaly table to CSV."""
    _ensure_default_state()
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Target ID", "Class", "Label", "Severity", "Confidence",
        "Length (m)", "Width (m)", "Height (m)", "Area (m2)", "Shadow Length (m)",
        "Latitude", "Longitude", "Along Track (m)", "Across Track (m)", "Channel", "Description"
    ])
    
    for t in CURRENT_STATE["targets"]:
        dims = t.get("dimensions", {})
        coords = t.get("coordinates", {})
        writer.writerow([
            t.get("id"),
            t.get("class_name"),
            t.get("label"),
            t.get("severity"),
            t.get("confidence"),
            dims.get("length_m"),
            dims.get("width_m"),
            dims.get("height_m"),
            dims.get("area_m2"),
            dims.get("shadow_length_m"),
            coords.get("latitude"),
            coords.get("longitude"),
            coords.get("along_track_m"),
            coords.get("across_track_m"),
            coords.get("channel_side"),
            t.get("description")
        ])
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={CURRENT_STATE['survey_id']}_targets.csv"}
    )
