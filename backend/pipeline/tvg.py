"""
Time-Varying Gain (TVG) and Acoustic Backscatter Normalization.
Compensates for radial acoustic transmission attenuation (spreading loss + water absorption).
"""

import numpy as np


def apply_tvg_filter(strip_matrix: np.ndarray, alpha_db_km: float = 35.0, speed_sound_mps: float = 1500.0) -> np.ndarray:
    """
    Equalizes acoustic intensity from nadir outward across both port and starboard channels.
    Computes empirical across-track beam pattern and applies smooth inverse gain curve.
    """
    img = strip_matrix.astype(np.float32)
    height, width = img.shape
    center_col = width // 2
    
    # Calculate column-wise mean intensity profile
    col_means = np.mean(img, axis=0)
    
    # Smooth the profile to prevent amplifying sharp targets
    kernel_size = max(15, width // 40)
    if kernel_size % 2 == 0:
        kernel_size += 1
    window = np.ones(kernel_size) / kernel_size
    smoothed_profile = np.convolve(col_means, window, mode='same')
    
    # Avoid division by zero
    smoothed_profile = np.maximum(smoothed_profile, np.percentile(col_means, 5) * 0.5 + 1e-3)
    target_mean = np.median(col_means)
    if target_mean <= 0:
        target_mean = 128.0
        
    # Gain matrix across columns
    gain_curve = target_mean / smoothed_profile
    gain_curve = np.clip(gain_curve, 0.2, 5.0)
    
    # Apply gain curve across all pings (rows)
    equalized = img * gain_curve[np.newaxis, :]
    
    # Normalize back to source dynamic range
    if strip_matrix.dtype == np.uint8:
        return np.clip(equalized, 0, 255).astype(np.uint8)
    elif strip_matrix.dtype == np.uint16:
        return np.clip(equalized, 0, 65535).astype(np.uint16)
    return equalized


def empirical_gain_normalization(strip_matrix: np.ndarray, clip_percentile: float = 99.5) -> np.ndarray:
    """
    Adaptive histogram/contrast stretch after TVG normalization.
    """
    img = strip_matrix.astype(np.float32)
    p_low = np.percentile(img, 1.0)
    p_high = np.percentile(img, clip_percentile)
    
    if p_high > p_low:
        stretched = (img - p_low) / (p_high - p_low) * 255.0
        return np.clip(stretched, 0, 255).astype(np.uint8)
    return np.clip(img, 0, 255).astype(np.uint8)
