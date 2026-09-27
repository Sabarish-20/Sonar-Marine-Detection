"""
Slant-Range Correction (SRC) Module.
Converts time-of-flight slant range (Rs) to true horizontal ground range (Rg)
using towfish altitude (Hf):
    Rg = sqrt(Rs^2 - Hf^2)
    Rs = sqrt(Rg^2 + Hf^2)
"""

import numpy as np
from scipy.interpolate import interp1d


def slant_range_correction(
    strip_matrix: np.ndarray, 
    altitude_px: float,
    output_channel_width: int = None
) -> np.ndarray:
    """
    Reprojects slant-range rows into flat seabed horizontal distance.
    Removes the central nadir water-column dead zone and linearizes ground distance.
    
    Args:
        strip_matrix: 2D uint8 or float32 matrix (height x width)
        altitude_px: Towfish altitude in slant-range pixel units (distance to first bottom return)
        output_channel_width: Desired width of port and starboard channels in output
        
    Returns:
        Corrected 2D image matrix with rectified ground geometry.
    """
    rows, cols = strip_matrix.shape
    center_col = cols // 2
    raw_channel_len = center_col
    
    # Altitude cannot exceed raw channel length
    alt = min(max(2.0, float(altitude_px)), float(raw_channel_len - 10))
    
    # Maximum ground range in pixel units
    max_ground_range = np.sqrt(max(1.0, raw_channel_len ** 2 - alt ** 2))
    
    if output_channel_width is None:
        out_len = int(np.round(max_ground_range))
    else:
        out_len = output_channel_width
        
    # Generate regular ground range sample points from 0 to max_ground_range
    rg_grid = np.linspace(0.0, max_ground_range, out_len)
    
    # Compute corresponding slant range query points: Rs = sqrt(Rg^2 + Hf^2)
    rs_query = np.sqrt(rg_grid ** 2 + alt ** 2)
    rs_query = np.clip(rs_query, 0, raw_channel_len - 1)
    
    # Base slant range grid
    raw_rs_grid = np.arange(raw_channel_len)
    
    corrected_strip = np.zeros((rows, out_len * 2), dtype=strip_matrix.dtype)
    
    # Process ping by ping (or vectorized interpolation)
    for r in range(rows):
        # Port channel (reverse indexing: center outwards to port)
        port_raw = strip_matrix[r, center_col - 1::-1].astype(np.float32)
        # Interpolator for port
        f_port = interp1d(raw_rs_grid, port_raw, kind='linear', bounds_error=False, fill_value='extrapolate')
        port_corrected = f_port(rs_query)
        
        # Starboard channel (outwards from center to starboard)
        starboard_raw = strip_matrix[r, center_col:].astype(np.float32)
        f_starboard = interp1d(raw_rs_grid, starboard_raw, kind='linear', bounds_error=False, fill_value='extrapolate')
        starboard_corrected = f_starboard(rs_query)
        
        # Assemble row: Left is Port (inverted back so far-port is left), Right is Starboard
        corrected_strip[r, :out_len] = port_corrected[::-1].astype(strip_matrix.dtype)
        corrected_strip[r, out_len:] = starboard_corrected.astype(strip_matrix.dtype)
        
    return corrected_strip
