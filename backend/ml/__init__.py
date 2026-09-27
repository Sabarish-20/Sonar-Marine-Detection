"""
Machine learning and acoustic mensuration package.
"""

from backend.ml.target_classes import CLASSES, CLASS_METADATA
from backend.ml.shadow_mensuration import measure_shadow_target, find_highlight_shadow_pairs
from backend.ml.inference_engine import AnomalyDetector
from backend.ml.synthetic_generator import generate_synthetic_sonar_strip

__all__ = [
    "CLASSES",
    "CLASS_METADATA",
    "measure_shadow_target",
    "find_highlight_shadow_pairs",
    "AnomalyDetector",
    "generate_synthetic_sonar_strip"
]
