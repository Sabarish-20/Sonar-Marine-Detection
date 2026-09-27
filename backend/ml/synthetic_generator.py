"""
Synthetic Side-Scan Sonar (SSS) Waterfall and Anomaly Generator.
Generates hydrographically authentic dual-channel acoustic waterfall imagery
complete with realistic seabed textures (sand ripples, mud, rock outcroppings),
water column nadir gap, TVG radial decay, speckle noise, and embedded anomalies with
geometrically accurate specular highlights and acoustic cast shadows.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import cv2
import random


def generate_synthetic_sonar_strip(
    scenario_type: str = "gravel_sand",
    height: int = 600,
    width: int = 800,
    altitude_m: float = 8.5,
    range_scale_m: float = 50.0,
    vessel_speed_knots: float = 3.5,
    start_lat: float = 18.9218,
    start_lon: float = 72.8347,
    heading_deg: float = 45.0
) -> Dict[str, Any]:
    """
    Generates a synthetic sonar survey dataset with ground-truth target annotations.
    
    Scenarios:
        1. 'gravel_sand': Sand ripple seabed with an abandoned ghost net, sunken steel drum, and vehicle tyre.
        2. 'mud_pipeline': Muddy silt seabed with subsea pipeline anomaly, cylindrical UXO, and sunken container.
    """
    center_col = width // 2
    meters_per_px = range_scale_m / (width / 2.0)
    water_col_px = int(altitude_m / meters_per_px)
    
    # 1. Base Seabed Texture Generation
    np.random.seed(42 if scenario_type == "gravel_sand" else 101)
    
    # Generate background speckle noise
    bg_noise = np.random.rayleigh(scale=35.0, size=(height, width)).astype(np.float32)
    
    if scenario_type == "gravel_sand":
        # Create sand ripple patterns (sinusoidal modulation along track)
        y_indices, x_indices = np.indices((height, width))
        ripple_freq_y = 0.08
        ripple_freq_x = 0.02
        sand_ripples = np.sin(ripple_freq_y * y_indices + 0.5 * np.sin(ripple_freq_x * x_indices)) * 25.0
        # Add gravel clumps
        gravel_mask = (np.random.rand(height, width) > 0.985).astype(np.float32)
        gravel_clump = cv2.GaussianBlur(gravel_mask * 120.0, (5, 5), 1.0)
        base_seabed = 90.0 + bg_noise + sand_ripples + gravel_clump
        seabed_type_desc = "Gravel & Sand Ripples (Shallow Continental Shelf)"
        
    elif scenario_type == "mud_pipeline":
        # Muddy smooth silt with soft micro-variations
        blur_noise = cv2.GaussianBlur(bg_noise, (11, 11), 3.0)
        base_seabed = 75.0 + bg_noise * 0.7 + blur_noise * 0.5
        seabed_type_desc = "Fine Silt & Mud (Deep Estuarine / Trench Channel)"
        
    else:
        base_seabed = 80.0 + bg_noise
        seabed_type_desc = "Standard Marine Seabed"

    # 2. Add Nadir Water Column Gap (Low acoustic backscatter at center)
    # The water column exists around center_col +/- water_col_px with some ping jitter
    for r in range(height):
        jitter = int(np.sin(r * 0.05) * 3)
        left_water = max(0, center_col - water_col_px + jitter)
        right_water = min(width, center_col + water_col_px + jitter)
        
        # In the water column, acoustic backscatter is just thermal/water noise (~10-25 intensity)
        water_noise = np.random.uniform(8.0, 24.0, size=(right_water - left_water))
        base_seabed[r, left_water:right_water] = water_noise
        
        # First bottom return: bright sharp specular reflection at seabed contact
        if left_water > 2:
            base_seabed[r, left_water-2:left_water+1] = np.random.uniform(160, 220)
        if right_water < width - 2:
            base_seabed[r, right_water:right_water+3] = np.random.uniform(160, 220)

    # 3. Apply Radial Acoustic Transmission Loss Falloff (TVG falloff)
    x_dist = np.abs(np.arange(width) - center_col)
    radial_decay = np.exp(-x_dist / (width * 0.75)) + 0.35
    base_seabed = base_seabed * radial_decay[np.newaxis, :]

    # 4. Embed Synthetic Marine Debris & Target Anomalies
    targets_ground_truth = []
    
    if scenario_type == "gravel_sand":
        # Target 1: Abandoned Ghost Net (Starboard side)
        # Highlight: ragged mesh, Shadow: ragged acoustic occlusion
        t1_x = center_col + int(water_col_px * 1.6)
        t1_y = 120
        t1_w, t1_h = 42, 38
        _embed_target_acoustic_signature(
            base_seabed, t1_x, t1_y, t1_w, t1_h, 
            shadow_side="right", target_h_m=1.8, altitude_m=altitude_m, meters_per_px=meters_per_px,
            signature_type="diffuse"
        )
        targets_ground_truth.append({
            "target_id": "TGT-2026-001",
            "class_name": "ghost_net",
            "confidence": 0.94,
            "box": {"x": t1_x, "y": t1_y, "width": t1_w, "height": t1_h},
            "estimated_height_m": 1.85,
            "description": "Ghost fishing net entangled with seabed sediment and organic biomass."
        })
        
        # Target 2: Sunken Steel Drum / Metallic Debris (Port side)
        t2_x = center_col - int(water_col_px * 2.2)
        t2_y = 310
        t2_w, t2_h = 24, 26
        _embed_target_acoustic_signature(
            base_seabed, t2_x, t2_y, t2_w, t2_h, 
            shadow_side="left", target_h_m=1.2, altitude_m=altitude_m, meters_per_px=meters_per_px,
            signature_type="specular"
        )
        targets_ground_truth.append({
            "target_id": "TGT-2026-002",
            "class_name": "metallic_debris",
            "confidence": 0.91,
            "box": {"x": t2_x, "y": t2_y, "width": t2_w, "height": t2_h},
            "estimated_height_m": 1.18,
            "description": "Sunken 55-gallon industrial steel drum with sharp metallic corner reflector."
        })
        
        # Target 3: Discarded Vehicle Tyre (Port side)
        t3_x = center_col - int(water_col_px * 1.5)
        t3_y = 470
        t3_w, t3_h = 18, 16
        _embed_target_acoustic_signature(
            base_seabed, t3_x, t3_y, t3_w, t3_h, 
            shadow_side="left", target_h_m=0.45, altitude_m=altitude_m, meters_per_px=meters_per_px,
            signature_type="toroidal"
        )
        targets_ground_truth.append({
            "target_id": "TGT-2026-003",
            "class_name": "sunken_tyre",
            "confidence": 0.88,
            "box": {"x": t3_x, "y": t3_y, "width": t3_w, "height": t3_h},
            "estimated_height_m": 0.46,
            "description": "Heavy commercial vehicle rubber tyre embedded in seabed sand."
        })

    elif scenario_type == "mud_pipeline":
        # Target 1: Pipeline Anomaly (Linear feature spanning across waterfall on Starboard)
        pipe_x = center_col + int(water_col_px * 1.8)
        pipe_y = 60
        pipe_w, pipe_h = 22, 480
        # Draw long pipeline highlight with shadow
        for py in range(pipe_y, min(height - 20, pipe_y + pipe_h)):
            px = pipe_x + int(np.sin(py * 0.015) * 8)
            base_seabed[py, px:px+6] = np.random.uniform(225, 255)
            # Pipeline shadow to the right
            base_seabed[py, px+6:px+28] = np.random.uniform(5, 18)
            
        # Target rupture segment
        rupture_y = 260
        base_seabed[rupture_y-15:rupture_y+20, pipe_x-5:pipe_x+18] = np.random.uniform(240, 255)
        base_seabed[rupture_y-15:rupture_y+20, pipe_x+18:pipe_x+60] = np.random.uniform(2, 10)
        
        targets_ground_truth.append({
            "target_id": "TGT-2026-004",
            "class_name": "pipeline_anomaly",
            "confidence": 0.96,
            "box": {"x": pipe_x - 5, "y": rupture_y - 20, "width": 32, "height": 55},
            "estimated_height_m": 1.4,
            "description": "Subsea pipeline scour exposure with localized casing displacement and scour depression."
        })
        
        # Target 2: Unexploded Ordnance (UXO) (Port side)
        t_uxo_x = center_col - int(water_col_px * 2.5)
        t_uxo_y = 190
        t_uxo_w, t_uxo_h = 22, 34
        _embed_target_acoustic_signature(
            base_seabed, t_uxo_x, t_uxo_y, t_uxo_w, t_uxo_h,
            shadow_side="left", target_h_m=0.9, altitude_m=altitude_m, meters_per_px=meters_per_px,
            signature_type="cylindrical_uxo"
        )
        targets_ground_truth.append({
            "target_id": "TGT-2026-005",
            "class_name": "unexploded_ordnance_uxo",
            "confidence": 0.95,
            "box": {"x": t_uxo_x, "y": t_uxo_y, "width": t_uxo_w, "height": t_uxo_h},
            "estimated_height_m": 0.92,
            "description": "Cylindrical naval unexploded ordnance (UXO) with metallic casing and tapered shadow."
        })
        
        # Target 3: Sunken Shipping Container (Starboard outer range)
        t_box_x = center_col + int(water_col_px * 2.6)
        t_box_y = 380
        t_box_w, t_box_h = 48, 62
        _embed_target_acoustic_signature(
            base_seabed, t_box_x, t_box_y, t_box_w, t_box_h,
            shadow_side="right", target_h_m=2.6, altitude_m=altitude_m, meters_per_px=meters_per_px,
            signature_type="container"
        )
        targets_ground_truth.append({
            "target_id": "TGT-2026-006",
            "class_name": "sunken_container",
            "confidence": 0.97,
            "box": {"x": t_box_x, "y": t_box_y, "width": t_box_w, "height": t_box_h},
            "estimated_height_m": 2.58,
            "description": "20-foot intermodal ISO steel shipping container resting upright on seafloor."
        })

    # Clip and convert to uint8
    final_image = np.clip(base_seabed, 0, 255).astype(np.uint8)
    
    return {
        "image": final_image,
        "scenario_type": scenario_type,
        "seabed_type_desc": seabed_type_desc,
        "altitude_m": altitude_m,
        "range_scale_m": range_scale_m,
        "vessel_speed_knots": vessel_speed_knots,
        "ping_rate_hz": 10.0,
        "start_lat": start_lat,
        "start_lon": start_lon,
        "heading_deg": heading_deg,
        "ground_truth_targets": targets_ground_truth,
        "dimensions": {"width": width, "height": height}
    }


def _embed_target_acoustic_signature(
    image: np.ndarray,
    x: int,
    y: int,
    w: int,
    h: int,
    shadow_side: str,
    target_h_m: float,
    altitude_m: float,
    meters_per_px: float,
    signature_type: str = "specular"
):
    """
    Renders accurate physical acoustic specular reflection and trailing acoustic shadow.
    """
    rows, cols = image.shape
    center_col = cols // 2
    
    # Calculate shadow length in pixels based on sonar physics:
    # Ls = (Ht * Rs) / Hf
    target_ground_range_px = abs(x - center_col)
    target_ground_range_m = target_ground_range_px * meters_per_px
    target_slant_range_m = np.sqrt(target_ground_range_m ** 2 + altitude_m ** 2)
    
    shadow_len_m = (target_h_m * target_slant_range_m) / max(0.5, (altitude_m - target_h_m))
    shadow_len_px = int(np.clip(shadow_len_m / meters_per_px, 10, cols // 3))
    
    # 1. Specular highlight rendering
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(cols, x + w), min(rows, y + h)
    
    if signature_type == "diffuse":
        # Mesh net pattern
        patch = np.random.uniform(180, 250, size=(y2 - y1, x2 - x1))
        # Add holes/lines
        for i in range(0, y2 - y1, 4):
            patch[i, :] *= 0.6
        image[y1:y2, x1:x2] = np.maximum(image[y1:y2, x1:x2], patch)
    elif signature_type == "cylindrical_uxo":
        # Smooth cylindrical highlight
        patch = np.zeros((y2 - y1, x2 - x1), dtype=np.float32)
        cv2.ellipse(patch, ((x2-x1)//2, (y2-y1)//2), ((x2-x1)//2, (y2-y1)//2), 15, 0, 360, 245, -1)
        image[y1:y2, x1:x2] = np.maximum(image[y1:y2, x1:x2], patch)
    elif signature_type == "toroidal":
        patch = np.zeros((y2 - y1, x2 - x1), dtype=np.float32)
        cv2.circle(patch, ((x2-x1)//2, (y2-y1)//2), min(w, h)//2, 230, 2)
        image[y1:y2, x1:x2] = np.maximum(image[y1:y2, x1:x2], patch)
    elif signature_type == "container":
        image[y1:y2, x1:x2] = np.random.uniform(230, 255, size=(y2 - y1, x2 - x1))
    else:
        # Standard specular highlight
        image[y1:y2, x1:x2] = np.random.uniform(210, 255, size=(y2 - y1, x2 - x1))

    # 2. Shadow rendering (sound propagation moves away from nadir)
    if shadow_side == "right":  # Starboard: shadow extends to the right (x2 to x2 + shadow_len_px)
        sx1 = x2
        sx2 = min(cols, x2 + shadow_len_px)
        sy1 = max(0, y1 - 2)
        sy2 = min(rows, y2 + 2)
        if sx2 > sx1:
            shadow_noise = np.random.uniform(2.0, 12.0, size=(sy2 - sy1, sx2 - sx1))
            image[sy1:sy2, sx1:sx2] = shadow_noise
    else:  # Port: shadow extends to the left (x1 - shadow_len_px to x1)
        sx2 = x1
        sx1 = max(0, x1 - shadow_len_px)
        sy1 = max(0, y1 - 2)
        sy2 = min(rows, y2 + 2)
        if sx2 > sx1:
            shadow_noise = np.random.uniform(2.0, 12.0, size=(sy2 - sy1, sx2 - sx1))
            image[sy1:sy2, sx1:sx2] = shadow_noise
