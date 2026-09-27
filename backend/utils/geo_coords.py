"""
Geospatial coordinate projection and vessel navigation trajectory utility.
Translates side-scan sonar image coordinates (row, col) into real-world WGS84 coordinates.
"""

from typing import Tuple, Dict, Any, List
import math
from pyproj import Geod

geod = Geod(ellps="WGS84")


def calculate_pixel_geo_position(
    pixel_row: int,
    pixel_col: int,
    image_height: int,
    image_width: int,
    start_lat: float,
    start_lon: float,
    heading_deg: float,
    vessel_speed_knots: float,
    ping_interval_s: float,
    range_scale_m: float
) -> Tuple[float, float, float, float]:
    """
    Computes WGS84 Latitude, Longitude, along-track distance (m), and across-track distance (m)
    for a target detected at (pixel_row, pixel_col).
    
    Args:
        pixel_row: Y coordinate along waterfall (ping index, 0 is start)
        pixel_col: X coordinate across waterfall (0 to width-1)
        image_height: Total pings in strip
        image_width: Total samples across strip
        start_lat, start_lon: GPS coordinate at start of survey strip
        heading_deg: Vessel/Towfish course over ground (0-360 degrees)
        vessel_speed_knots: Survey speed in knots
        ping_interval_s: Time between consecutive pings in seconds
        range_scale_m: Maximum slant/ground range in meters per channel
        
    Returns:
        Tuple of (latitude, longitude, along_track_m, across_track_m)
    """
    speed_mps = vessel_speed_knots * 0.514444
    along_track_res_m = speed_mps * ping_interval_s
    along_track_distance_m = pixel_row * along_track_res_m
    
    center_col = image_width / 2.0
    channel_width_px = center_col
    across_track_res_m = range_scale_m / max(1.0, channel_width_px)
    
    # Negative is Port (left of track), Positive is Starboard (right of track)
    across_track_offset_m = (pixel_col - center_col) * across_track_res_m
    
    # Step 1: Move along vessel track heading by along_track_distance_m
    track_lon, track_lat, _ = geod.fwd(start_lon, start_lat, heading_deg, along_track_distance_m)
    
    # Step 2: Offset perpendicular to heading
    # Port is heading - 90 deg, Starboard is heading + 90 deg
    if across_track_offset_m >= 0:
        offset_azimuth = (heading_deg + 90.0) % 360.0
        offset_dist = across_track_offset_m
    else:
        offset_azimuth = (heading_deg - 90.0) % 360.0
        offset_dist = abs(across_track_offset_m)
        
    target_lon, target_lat, _ = geod.fwd(track_lon, track_lat, offset_azimuth, offset_dist)
    
    return float(target_lat), float(target_lon), float(along_track_distance_m), float(across_track_offset_m)


def generate_survey_track_line(
    start_lat: float,
    start_lon: float,
    heading_deg: float,
    vessel_speed_knots: float,
    ping_interval_s: float,
    total_pings: int
) -> List[Tuple[float, float]]:
    """
    Generates a list of (lat, lon) coordinates along the survey trajectory line.
    """
    speed_mps = vessel_speed_knots * 0.514444
    step_m = speed_mps * ping_interval_s * 20  # Sample every 20 pings
    total_dist_m = speed_mps * ping_interval_s * total_pings
    
    points = []
    curr_dist = 0.0
    while curr_dist <= total_dist_m:
        lon, lat, _ = geod.fwd(start_lon, start_lat, heading_deg, curr_dist)
        points.append((float(lat), float(lon)))
        curr_dist += step_m
        
    if curr_dist - step_m < total_dist_m:
        lon, lat, _ = geod.fwd(start_lon, start_lat, heading_deg, total_dist_m)
        points.append((float(lat), float(lon)))
        
    return points
