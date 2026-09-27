"""
Bottom Tracking and Nadir Water Column Gap Detection.
Identifies the first seabed acoustic return for both Port and Starboard sides.
"""

from typing import Tuple, Dict, Any
import numpy as np
from scipy.ndimage import gaussian_filter1d


def detect_nadir(strip_matrix: np.ndarray, threshold_rel: float = 0.35) -> Dict[str, Any]:
    """
    Detects the seabed first-return line per ping using intensity gradient and thresholding.
    
    Returns:
        Dict containing:
            - 'center_col': Nadir vehicle track column
            - 'port_seabed_offset': Average pixel distance to Port seabed
            - 'starboard_seabed_offset': Average pixel distance to Starboard seabed
            - 'port_bottom_profile': Array of seabed positions per ping (left side)
            - 'starboard_bottom_profile': Array of seabed positions per ping (right side)
            - 'water_column_width_px': Total average water column pixel width
    """
    img = strip_matrix.astype(np.float32)
    rows, cols = img.shape
    center_col = cols // 2
    
    port_side = img[:, :center_col]  # Left channel (0 to center)
    starboard_side = img[:, center_col:]  # Right channel (center to end)
    
    # We examine outwards from center_col
    # For port: from center_col-1 backwards to 0
    # For starboard: from 0 outwards to width/2
    
    port_bottom_profile = np.zeros(rows, dtype=np.int32)
    starboard_bottom_profile = np.zeros(rows, dtype=np.int32)
    
    for r in range(rows):
        # Port channel (reverse indexing from center outwards)
        p_slice = port_side[r, ::-1]  # index 0 is center, index center_col-1 is far port
        p_smooth = gaussian_filter1d(p_slice, sigma=2.0)
        p_grad = np.gradient(p_smooth)
        
        # Look for the first strong upward jump from low water noise to seabed echo
        p_noise_floor = np.percentile(p_smooth[:max(5, len(p_smooth)//10)], 50)
        p_max = np.max(p_smooth)
        p_thresh = p_noise_floor + threshold_rel * (p_max - p_noise_floor + 1e-3)
        
        p_candidates = np.where((p_smooth > p_thresh) & (p_grad > 0))[0]
        if len(p_candidates) > 0 and p_candidates[0] > 4:
            p_offset = p_candidates[0]
        else:
            # Fallback to max gradient position
            p_offset = max(10, int(np.argmax(p_grad[:len(p_grad)//2])))
        port_bottom_profile[r] = center_col - 1 - p_offset
        
        # Starboard channel (outwards from center)
        s_slice = starboard_side[r, :]
        s_smooth = gaussian_filter1d(s_slice, sigma=2.0)
        s_grad = np.gradient(s_smooth)
        
        s_noise_floor = np.percentile(s_smooth[:max(5, len(s_smooth)//10)], 50)
        s_max = np.max(s_smooth)
        s_thresh = s_noise_floor + threshold_rel * (s_max - s_noise_floor + 1e-3)
        
        s_candidates = np.where((s_smooth > s_thresh) & (s_grad > 0))[0]
        if len(s_candidates) > 0 and s_candidates[0] > 4:
            s_offset = s_candidates[0]
        else:
            s_offset = max(10, int(np.argmax(s_grad[:len(s_grad)//2])))
        starboard_bottom_profile[r] = center_col + s_offset

    # Smooth the bottom profiles along the track
    port_smooth = gaussian_filter1d(port_bottom_profile.astype(np.float32), sigma=3.0)
    starboard_smooth = gaussian_filter1d(starboard_bottom_profile.astype(np.float32), sigma=3.0)
    
    port_offset_avg = float(np.mean(center_col - port_smooth))
    starboard_offset_avg = float(np.mean(starboard_smooth - center_col))
    
    return {
        "center_col": center_col,
        "port_seabed_offset": port_offset_avg,
        "starboard_seabed_offset": starboard_offset_avg,
        "port_bottom_profile": port_smooth.tolist(),
        "starboard_bottom_profile": starboard_smooth.tolist(),
        "water_column_width_px": port_offset_avg + starboard_offset_avg,
    }
