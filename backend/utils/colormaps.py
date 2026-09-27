"""
Acoustic Sonar Colormap Utilities.
Converts single-channel 8-bit sonar waterfall matrices into hydrographic colormapped RGB images.
"""

import numpy as np
import cv2
import io
import base64
from PIL import Image


def get_sonar_colormap(colormap_name: str = "copper") -> int:
    """Returns OpenCV colormap enum or custom acoustic palette."""
    mapping = {
        "copper": cv2.COLORMAP_BONE, # Bone or custom copper
        "amber": cv2.COLORMAP_AUTUMN,
        "bronze": cv2.COLORMAP_HOT,
        "jet": cv2.COLORMAP_JET,
        "viridis": cv2.COLORMAP_VIRIDIS,
        "ocean": cv2.COLORMAP_OCEAN,
        "grayscale": -1
    }
    return mapping.get(colormap_name.lower(), -1)


def matrix_to_png_bytes(
    matrix: np.ndarray,
    colormap_name: str = "copper",
    quality: int = 90
) -> bytes:
    """
    Renders acoustic matrix into an optimized PNG or JPEG byte stream.
    """
    img_uint8 = np.clip(matrix, 0, 255).astype(np.uint8)
    
    if colormap_name == "copper":
        # Custom realistic acoustic sonar copper colormap
        # Dark brown/black -> Copper/Amber -> Bright Golden Yellow
        lut = np.zeros((256, 1, 3), dtype=np.uint8)
        for i in range(256):
            r = min(255, int(i * 1.25))
            g = min(255, int(i * 0.78))
            b = min(255, int(i * 0.35))
            lut[i, 0] = [b, g, r]  # BGR for OpenCV
        colored = cv2.LUT(cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR), lut)
    elif colormap_name == "amber":
        lut = np.zeros((256, 1, 3), dtype=np.uint8)
        for i in range(256):
            r = min(255, int(i * 1.3))
            g = min(255, int(i * 0.9))
            b = min(255, int(i * 0.2))
            lut[i, 0] = [b, g, r]
        colored = cv2.LUT(cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR), lut)
    elif colormap_name == "grayscale":
        colored = cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR)
    else:
        cm_id = get_sonar_colormap(colormap_name)
        if cm_id >= 0:
            colored = cv2.applyColorMap(img_uint8, cm_id)
        else:
            colored = cv2.cvtColor(img_uint8, cv2.COLOR_GRAY2BGR)
            
    # Encode as PNG
    _, buffer = cv2.imencode('.png', colored)
    return buffer.tobytes()


def matrix_to_base64_data_uri(matrix: np.ndarray, colormap_name: str = "copper") -> str:
    """Returns data:image/png;base64,... string for direct frontend embedding."""
    raw_bytes = matrix_to_png_bytes(matrix, colormap_name=colormap_name)
    b64 = base64.b64encode(raw_bytes).decode('utf-8')
    return f"data:image/png;base64,{b64}"
