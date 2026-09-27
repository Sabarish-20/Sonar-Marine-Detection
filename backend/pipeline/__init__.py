"""
Preprocessing pipeline package for Side-Scan Sonar imagery.
"""

from backend.pipeline.sonar_processor import (
    SonarProcessor,
    detect_nadir_line,
    despeckle_filter,
    apply_tvg,
    perform_slant_range_correction
)

__all__ = [
    "SonarProcessor",
    "detect_nadir_line",
    "despeckle_filter",
    "apply_tvg",
    "perform_slant_range_correction"
]
