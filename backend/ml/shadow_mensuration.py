"""
Highlight-Shadow Association & Physical Mensuration Engine.
Implements hydrographic acoustic trigonometry for calculating target height, width, length, and area.
"""

from typing import Dict, Any, Tuple, Optional, List
import math
import numpy as np


def measure_shadow_target(
    highlight_box: Dict[str, float],
    shadow_box: Optional[Dict[str, float]],
    altitude_m: float,
    range_scale_m: float,
    image_width: int,
    image_height: int,
    vessel_speed_knots: float = 3.5,
    ping_rate_hz: float = 10.0
) -> Dict[str, Any]:
    """
    Calculates estimated physical target dimensions using acoustic shadow geometry.
    
    Formula:
        Ht = (Hf * Ls) / Rs
    where:
        Hf = Towfish altitude above seabed (meters)
        Ls = Acoustic shadow length across track (meters)
        Rs = Slant range from transducer to the tip/end of the acoustic shadow (meters)
        
    Args:
        highlight_box: dict with {'x': min_x, 'y': min_y, 'width': w, 'height': h} (normalized or px)
        shadow_box: optional dict with {'x': min_x, 'y': min_y, 'width': w, 'height': h}
        altitude_m: towfish altitude in meters
        range_scale_m: max range in meters per channel
        image_width, image_height: dimensions in pixels
        vessel_speed_knots: vessel speed
        ping_rate_hz: ping rate
    """
    # Across-track resolution
    channel_px = image_width / 2.0
    res_across_m = range_scale_m / max(1.0, channel_px)
    
    # Along-track resolution
    speed_mps = vessel_speed_knots * 0.514444
    ping_interval_s = 1.0 / max(0.1, ping_rate_hz)
    res_along_m = speed_mps * ping_interval_s
    
    hl_x = highlight_box["x"]
    hl_y = highlight_box["y"]
    hl_w = highlight_box["width"]
    hl_h = highlight_box["height"]
    
    # Target center in pixel coordinates
    center_x = hl_x + hl_w / 2.0
    center_y = hl_y + hl_h / 2.0
    
    # Across-track distance from nadir to highlight center
    dist_from_nadir_px = abs(center_x - (image_width / 2.0))
    target_ground_range_m = dist_from_nadir_px * res_across_m
    
    # Target length along track (meters)
    target_length_m = max(0.1, hl_h * res_along_m)
    
    # Target width across track (meters)
    target_width_m = max(0.1, hl_w * res_across_m)
    
    # Shadow measurement
    if shadow_box is not None and shadow_box.get("width", 0) > 0:
        shadow_len_px = shadow_box["width"]
        shadow_len_m = shadow_len_px * res_across_m
        
        # Slant range to the shadow tip:
        # Distance to highlight + shadow length
        total_ground_range_to_tip_m = target_ground_range_m + shadow_len_m
        slant_range_to_tip_m = math.sqrt(total_ground_range_to_tip_m ** 2 + altitude_m ** 2)
        
        # Physical Height Calculation (Ht)
        if slant_range_to_tip_m > 0:
            target_height_m = (altitude_m * shadow_len_m) / slant_range_to_tip_m
        else:
            target_height_m = 0.5
    else:
        # Fallback estimation if shadow is masked or obscured
        shadow_len_m = target_width_m * 1.5
        total_ground_range_to_tip_m = target_ground_range_m + shadow_len_m
        slant_range_to_tip_m = math.sqrt(total_ground_range_to_tip_m ** 2 + altitude_m ** 2)
        target_height_m = (altitude_m * shadow_len_m) / max(1.0, slant_range_to_tip_m)
        target_height_m = max(0.2, min(5.0, target_height_m))
        
    target_area_m2 = target_length_m * target_width_m
    target_volume_m3 = target_area_m2 * target_height_m
    
    # Determine channel side (Port vs Starboard)
    channel_side = "starboard" if center_x >= (image_width / 2.0) else "port"
    
    return {
        "target_height_m": round(target_height_m, 2),
        "target_width_m": round(target_width_m, 2),
        "target_length_m": round(target_length_m, 2),
        "target_area_m2": round(target_area_m2, 2),
        "target_volume_m3": round(target_volume_m3, 2),
        "shadow_length_m": round(shadow_len_m, 2),
        "target_ground_range_m": round(target_ground_range_m, 2),
        "slant_range_to_tip_m": round(slant_range_to_tip_m, 2),
        "towfish_altitude_m": round(altitude_m, 2),
        "channel_side": channel_side,
        "center_pixel": {"x": int(round(center_x)), "y": int(round(center_y))}
    }


def find_highlight_shadow_pairs(
    image_matrix: np.ndarray,
    min_highlight_thresh: int = 190,
    max_shadow_thresh: int = 40,
    min_area_px: int = 25
) -> List[Dict[str, Any]]:
    """
    Acoustic feature segmentation to isolate bright specular returns (highlights)
    and their radially adjacent acoustic cast shadows.
    """
    import cv2
    rows, cols = image_matrix.shape
    center_col = cols // 2
    
    # Threshold masks
    _, highlight_mask = cv2.threshold(image_matrix, min_highlight_thresh, 255, cv2.THRESH_BINARY)
    _, shadow_mask = cv2.threshold(image_matrix, max_shadow_thresh, 255, cv2.THRESH_BINARY_INV)
    
    # Zero out the central water column in the shadow mask to avoid false shadows
    water_col_margin = max(10, cols // 30)
    shadow_mask[:, max(0, center_col - water_col_margin):min(cols, center_col + water_col_margin)] = 0
    
    # Find highlight contours
    contours, _ = cv2.findContours(highlight_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    pairs = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area_px:
            continue
            
        x, y, w, h = cv2.boundingRect(cnt)
        cx = x + w / 2.0
        cy = y + h / 2.0
        
        # Determine propagation direction:
        # If in Port channel (cx < center_col), sound travels LEFT (shadow extends towards smaller X)
        # If in Starboard channel (cx >= center_col), sound travels RIGHT (shadow extends towards larger X)
        if cx < center_col:
            # Look to the left of the highlight
            search_x1 = max(0, x - w * 4)
            search_x2 = x
        else:
            # Look to the right of the highlight
            search_x1 = x + w
            search_x2 = min(cols, x + w + w * 4)
            
        search_y1 = max(0, y - 5)
        search_y2 = min(rows, y + h + 5)
        
        shadow_roi = shadow_mask[search_y1:search_y2, search_x1:search_x2]
        shadow_pixels = cv2.countNonZero(shadow_roi)
        
        shadow_box = None
        if shadow_pixels > min_area_px / 2:
            s_contours, _ = cv2.findContours(shadow_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if s_contours:
                largest_s = max(s_contours, key=cv2.contourArea)
                sx, sy, sw, sh = cv2.boundingRect(largest_s)
                shadow_box = {
                    "x": float(search_x1 + sx),
                    "y": float(search_y1 + sy),
                    "width": float(sw),
                    "height": float(sh)
                }
                
        # Generate polygon contours
        contour_points = cnt.reshape(-1, 2).tolist()
        
        pairs.append({
            "highlight_box": {"x": float(x), "y": float(y), "width": float(w), "height": float(h)},
            "shadow_box": shadow_box,
            "contour": contour_points,
            "area_px": float(area),
            "mean_intensity": float(np.mean(image_matrix[y:y+h, x:x+w]))
        })
        
    return pairs
