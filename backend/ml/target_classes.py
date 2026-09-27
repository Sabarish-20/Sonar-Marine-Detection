"""
Target classification definitions and acoustic characteristics.
"""

from typing import Dict, Any

CLASSES = [
    "ghost_net",
    "sunken_container",
    "metallic_debris",
    "sunken_tyre",
    "unexploded_ordnance_uxo",
    "pipeline_anomaly",
    "natural_seabed_clutter"
]

CLASS_METADATA: Dict[str, Dict[str, Any]] = {
    "ghost_net": {
        "label": "Ghost Net / Discarded Gear",
        "severity": "high",
        "color": "#F59E0B",  # Amber
        "icon": "Net",
        "description": "Entangled synthetic nylon fishing net snagged on seabed; severe danger to marine fauna.",
        "typical_height_range_m": (0.4, 2.5),
        "typical_width_range_m": (2.0, 15.0),
        "acoustic_signature": "Diffuse high-backscatter mesh with irregular, ragged acoustic shadow."
    },
    "sunken_container": {
        "label": "Sunken Shipping Container",
        "severity": "critical",
        "color": "#EF4444",  # Red
        "icon": "Box",
        "description": "Standard intermodal freight container (20ft/40ft); navigation hazard and structural obstruction.",
        "typical_height_range_m": (2.2, 2.9),
        "typical_width_range_m": (2.4, 12.2),
        "acoustic_signature": "Intense linear specular highlight box with sharp, elongated rectangular acoustic shadow."
    },
    "metallic_debris": {
        "label": "Metallic Debris / Steel Drum",
        "severity": "medium",
        "color": "#3B82F6",  # Blue
        "icon": "Trash2",
        "description": "Discarded industrial steel drums, machinery frame, or vehicle chassis.",
        "typical_height_range_m": (0.6, 2.0),
        "typical_width_range_m": (0.8, 3.5),
        "acoustic_signature": "Strong specular echo followed by distinct geometric shadow."
    },
    "sunken_tyre": {
        "label": "Sunken Vehicle Tyre",
        "severity": "low",
        "color": "#10B981",  # Emerald
        "icon": "Disc",
        "description": "Discarded rubber tyre; non-biodegradable synthetic polymer anomaly.",
        "typical_height_range_m": (0.2, 0.6),
        "typical_width_range_m": (0.6, 1.2),
        "acoustic_signature": "Toroidal / circular specular ring with small crescent acoustic shadow."
    },
    "unexploded_ordnance_uxo": {
        "label": "Unexploded Ordnance (UXO)",
        "severity": "critical",
        "color": "#DC2626",  # Dark Red / Hazard
        "icon": "AlertTriangle",
        "description": "Submerged naval mine, torpedo, or aerial bomb; extreme explosive hazard.",
        "typical_height_range_m": (0.4, 1.5),
        "typical_width_range_m": (0.3, 2.5),
        "acoustic_signature": "High-intensity cylindrical metallic apex with pointed trailing acoustic shadow."
    },
    "pipeline_anomaly": {
        "label": "Subsea Pipeline Anomaly / Scour",
        "severity": "high",
        "color": "#8B5CF6",  # Purple
        "icon": "Activity",
        "description": "Exposed underwater pipeline, spanning defect, buckling, or sediment scour pocket.",
        "typical_height_range_m": (0.5, 3.0),
        "typical_width_range_m": (0.5, 50.0),
        "acoustic_signature": "Continuous linear highlight track with parallel shadow gap showing free-spanning or rupture."
    },
    "natural_seabed_clutter": {
        "label": "Natural Seabed Clutter / Boulder",
        "severity": "info",
        "color": "#6B7280",  # Slate
        "icon": "Mountain",
        "description": "Naturally occurring glacial erratic boulder, rock outcropping, or coral patch.",
        "typical_height_range_m": (0.5, 4.0),
        "typical_width_range_m": (1.0, 6.0),
        "acoustic_signature": "Rounded moderate backscatter with soft-edged acoustic shadow."
    }
}
