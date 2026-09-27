"""
Despeckle filtering module for Side-Scan Sonar (SSS) acoustic imagery.
Implements Lee and Frost speckle filters tailored for multiplicative acoustic noise.
"""

import numpy as np
from scipy.ndimage import uniform_filter


def lee_filter(img: np.ndarray, window_size: int = 5, noise_variance: float = 0.25) -> np.ndarray:
    """
    Apply Lee Speckle Filter to 2D single-channel acoustic image.
    Formula:
        W = var(I) / (var(I) + noise_var)
        Output = mean + W * (I - mean)
    """
    img_float = img.astype(np.float32)
    
    # Local mean
    mean = uniform_filter(img_float, size=window_size)
    
    # Local mean of squares
    mean_sq = uniform_filter(img_float ** 2, size=window_size)
    
    # Local variance
    variance = np.maximum(0.0, mean_sq - mean ** 2)
    
    # Weight calculation
    weight = variance / (variance + noise_variance + 1e-6)
    weight = np.clip(weight, 0.0, 1.0)
    
    # Filtered result
    filtered = mean + weight * (img_float - mean)
    
    if img.dtype == np.uint8:
        return np.clip(filtered, 0, 255).astype(np.uint8)
    elif img.dtype == np.uint16:
        return np.clip(filtered, 0, 65535).astype(np.uint16)
    return filtered


def frost_filter(img: np.ndarray, window_size: int = 5, damping_factor: float = 1.0) -> np.ndarray:
    """
    Apply Frost Exponential Filter for preserving acoustic edge boundaries.
    """
    img_float = img.astype(np.float32)
    rows, cols = img.shape
    pad = window_size // 2
    padded = np.pad(img_float, pad, mode='reflect')
    
    # Distance matrix from center
    y, x = np.mgrid[-pad:pad + 1, -pad:pad + 1]
    distance = np.sqrt(x ** 2 + y ** 2)
    
    mean = uniform_filter(img_float, size=window_size)
    mean_sq = uniform_filter(img_float ** 2, size=window_size)
    variance = np.maximum(0.0, mean_sq - mean ** 2)
    
    # Coefficient of variation
    cv = np.sqrt(variance) / (mean + 1e-6)
    
    filtered = np.zeros_like(img_float)
    
    for r in range(rows):
        for c in range(cols):
            local_cv = cv[r, c]
            kernel = np.exp(-damping_factor * local_cv * distance)
            kernel_sum = np.sum(kernel)
            if kernel_sum > 0:
                kernel /= kernel_sum
            
            patch = padded[r:r + window_size, c:c + window_size]
            filtered[r, c] = np.sum(patch * kernel)
            
    if img.dtype == np.uint8:
        return np.clip(filtered, 0, 255).astype(np.uint8)
    return filtered
