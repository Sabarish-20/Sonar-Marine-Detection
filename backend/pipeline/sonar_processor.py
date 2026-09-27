"""
Sonar Acoustic Preprocessing Engine.
Orchestrates bottom tracking, slant-range correction, TVG gain curve flattening, and speckle reduction.
"""

from typing import Dict, Any, Tuple, Optional
import numpy as np
import cv2

from backend.pipeline.nadir_detector import detect_nadir
from backend.pipeline.tvg import apply_tvg_filter, empirical_gain_normalization
from backend.pipeline.despeckle import lee_filter, frost_filter
from backend.pipeline.slant_range import slant_range_correction


class SonarProcessor:
    """
    End-to-end processing pipeline for Side-Scan Sonar (SSS) waterfall records.
    """
    
    def __init__(
        self,
        despeckle_window: int = 5,
        despeckle_noise_var: float = 0.25,
        apply_tvg: bool = True,
        apply_src: bool = True
    ):
        self.despeckle_window = despeckle_window
        self.despeckle_noise_var = despeckle_noise_var
        self.apply_tvg = apply_tvg
        self.apply_src = apply_src

    def process_strip(
        self,
        raw_matrix: np.ndarray,
        altitude_m: Optional[float] = None,
        range_scale_m: float = 50.0
    ) -> Dict[str, Any]:
        """
        Processes a raw sonar strip matrix.
        
        Args:
            raw_matrix: 2D uint8 or float array [height, width]
            altitude_m: Towfish altitude in meters (if None, estimated from nadir)
            range_scale_m: Max slant range in meters per channel
            
        Returns:
            Dict containing:
                - 'raw': Raw matrix
                - 'despeckled': Despeckled matrix
                - 'tvg_equalized': Contrast equalized matrix
                - 'corrected': Slant-range corrected ground-plane matrix
                - 'nadir_info': Bottom tracking metrics
                - 'altitude_m_est': Estimated altitude
                - 'resolution_m_per_px': Slant range meters per pixel
        """
        rows, cols = raw_matrix.shape
        channel_width_px = cols // 2
        meters_per_px = range_scale_m / max(1, channel_width_px)
        
        # Step 1: Bottom tracking / Nadir detection
        nadir_info = detect_nadir(raw_matrix)
        avg_nadir_offset_px = (nadir_info["port_seabed_offset"] + nadir_info["starboard_seabed_offset"]) / 2.0
        
        if altitude_m is None or altitude_m <= 0:
            altitude_m_est = float(avg_nadir_offset_px * meters_per_px)
            altitude_px = avg_nadir_offset_px
        else:
            altitude_m_est = float(altitude_m)
            altitude_px = altitude_m / max(1e-4, meters_per_px)
            
        # Step 2: Despeckle Filtering (Lee Filter)
        despeckled = lee_filter(raw_matrix, window_size=self.despeckle_window, noise_variance=self.despeckle_noise_var)
        
        # Step 3: Time-Varying Gain (TVG) Equalization & Histogram Stretch
        if self.apply_tvg:
            tvg_eq = apply_tvg_filter(despeckled)
            tvg_eq = empirical_gain_normalization(tvg_eq)
        else:
            tvg_eq = despeckled
            
        # Step 4: Slant-Range Correction (SRC)
        if self.apply_src:
            src_corrected = slant_range_correction(tvg_eq, altitude_px=altitude_px)
        else:
            src_corrected = tvg_eq
            
        return {
            "raw": raw_matrix,
            "despeckled": despeckled,
            "tvg_equalized": tvg_eq,
            "corrected": src_corrected,
            "nadir_info": nadir_info,
            "altitude_m_est": altitude_m_est,
            "altitude_px": altitude_px,
            "resolution_m_per_px": meters_per_px,
            "shape_raw": raw_matrix.shape,
            "shape_corrected": src_corrected.shape
        }


# Direct utility wrapper functions satisfying task requirements
def detect_nadir_line(strip_matrix: np.ndarray, threshold: float = 0.35) -> Dict[str, Any]:
    return detect_nadir(strip_matrix, threshold_rel=threshold)

def despeckle_filter(strip_matrix: np.ndarray, window_size: int = 5) -> np.ndarray:
    return lee_filter(strip_matrix, window_size=window_size)

def apply_tvg(strip_matrix: np.ndarray) -> np.ndarray:
    return apply_tvg_filter(strip_matrix)

def perform_slant_range_correction(strip_matrix: np.ndarray, altitude_px: float) -> np.ndarray:
    return slant_range_correction(strip_matrix, altitude_px=altitude_px)
