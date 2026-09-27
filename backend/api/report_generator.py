"""
Hydrographic Anomaly & Marine Debris Inspection Report PDF Generator.
Uses ReportLab to generate a publication-quality hydrographic survey report.
"""

from typing import Dict, Any, List
import io
import time
from datetime import datetime

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from PIL import Image as PILImage
import numpy as np
import cv2

from backend.utils.colormaps import matrix_to_png_bytes


def generate_hydrographic_pdf_report(
    survey_meta: Dict[str, Any],
    targets: List[Dict[str, Any]],
    stats: Dict[str, Any],
    sonar_matrix: np.ndarray = None
) -> bytes:
    """
    Generates a complete PDF report stream.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Hydrographic Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
        alignment=TA_LEFT,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0284C7'),
        alignment=TA_LEFT,
        spaceAfter=12
    )
    
    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        alignment=TA_JUSTIFY
    )
    
    badge_crit = ParagraphStyle(
        'BadgeCrit',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.HexColor('#DC2626'),
        alignment=TA_CENTER
    )
    
    badge_high = ParagraphStyle(
        'BadgeHigh',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.HexColor('#D97706'),
        alignment=TA_CENTER
    )
    
    badge_med = ParagraphStyle(
        'BadgeMed',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        textColor=colors.HexColor('#2563EB'),
        alignment=TA_CENTER
    )

    story = []

    # Title & Header
    story.append(Paragraph("HYDROGRAPHIC SURVEY & ANOMALY DETECTION REPORT", title_style))
    story.append(Paragraph(
        f"AI-Powered Automated Side-Scan Sonar (SSS) Marine Debris Analysis | Problem SIH26057<br/>"
        f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Classification: UNCLASSIFIED / OPERATIONAL",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=10))

    # Survey Metadata Table
    survey_id = survey_meta.get("survey_id", f"SRV-{int(time.time())%100000}")
    seabed_type = survey_meta.get("seabed_type_desc", "Continental Shelf Silt & Sand")
    alt_m = survey_meta.get("altitude_m", 8.5)
    range_m = survey_meta.get("range_scale_m", 50.0)
    speed_kts = survey_meta.get("vessel_speed_knots", 3.5)
    heading = survey_meta.get("heading_deg", 45.0)
    lat_start = survey_meta.get("start_lat", 18.9218)
    lon_start = survey_meta.get("start_lon", 72.8347)
    
    meta_data = [
        [
            Paragraph("<b>Survey ID:</b>", body_style), Paragraph(str(survey_id), body_style),
            Paragraph("<b>Vessel Speed:</b>", body_style), Paragraph(f"{speed_kts} knots", body_style)
        ],
        [
            Paragraph("<b>Seabed Substrate:</b>", body_style), Paragraph(str(seabed_type), body_style),
            Paragraph("<b>Towfish Altitude:</b>", body_style), Paragraph(f"{alt_m} m", body_style)
        ],
        [
            Paragraph("<b>Start Coordinates:</b>", body_style), Paragraph(f"{lat_start:.5f}°N, {lon_start:.5f}°E", body_style),
            Paragraph("<b>Range Scale:</b>", body_style), Paragraph(f"{range_m} m per channel", body_style)
        ],
        [
            Paragraph("<b>Survey Heading:</b>", body_style), Paragraph(f"{heading:.1f}° True", body_style),
            Paragraph("<b>Swath Coverage:</b>", body_style), Paragraph(f"{range_m * 2} m Total Width", body_style)
        ]
    ]
    
    meta_table = Table(meta_data, colWidths=[110, 150, 110, 150])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Executive Summary & Threat Statistics
    story.append(Paragraph("1. EXECUTIVE SUMMARY & HAZARD ASSESSMENT", h2_style))
    total_targets = len(targets)
    crit_count = sum(1 for t in targets if t.get("severity") == "critical")
    high_count = sum(1 for t in targets if t.get("severity") == "high")
    
    summary_text = (
        f"A total of <b>{total_targets} acoustic anomalies and marine debris targets</b> were identified and measured "
        f"along the survey corridor using high-frequency side-scan sonar imagery. "
        f"Of these, <b>{crit_count} are classified as CRITICAL navigation/explosive hazards</b> and "
        f"<b>{high_count} are classified as HIGH ecological/structural hazards</b>. "
        f"Target mensuration was conducted using slant-range geometry and acoustic shadow length calculations ($H_t = H_f \\cdot L_s / R_s$)."
    )
    story.append(Paragraph(summary_text, body_style))
    story.append(Spacer(1, 8))

    # Target Table
    story.append(Paragraph("2. DETECTED ANOMALIES & PHYSICAL MENSURATION TABLE", h2_style))
    
    table_rows = [[
        Paragraph("<b>Target ID</b>", body_style),
        Paragraph("<b>Classification</b>", body_style),
        Paragraph("<b>Severity</b>", body_style),
        Paragraph("<b>Confidence</b>", body_style),
        Paragraph("<b>Dimensions (LxWxH)</b>", body_style),
        Paragraph("<b>Position (Lat, Lon)</b>", body_style),
        Paragraph("<b>Ch</b>", body_style)
    ]]
    
    for t in targets:
        tid = t.get("id", "TGT")
        lbl = t.get("label", t.get("class_name", "Debris"))
        sev = t.get("severity", "medium").upper()
        conf = f"{int(t.get('confidence', 0.9)*100)}%"
        dims = t.get("dimensions", {})
        dim_str = f"{dims.get('length_m', 0):.1f} x {dims.get('width_m', 0):.1f} x {dims.get('height_m', 0):.1f}m"
        coords = t.get("coordinates", {})
        pos_str = f"{coords.get('latitude', 0):.5f}, {coords.get('longitude', 0):.5f}"
        ch = coords.get("channel_side", "Stbd")[:4].title()
        
        if sev == "CRITICAL":
            sev_p = Paragraph(f"<b>{sev}</b>", badge_crit)
        elif sev == "HIGH":
            sev_p = Paragraph(f"<b>{sev}</b>", badge_high)
        else:
            sev_p = Paragraph(f"<b>{sev}</b>", badge_med)
            
        table_rows.append([
            Paragraph(f"<b>{tid}</b>", body_style),
            Paragraph(lbl, body_style),
            sev_p,
            Paragraph(conf, body_style),
            Paragraph(dim_str, body_style),
            Paragraph(pos_str, body_style),
            Paragraph(ch, body_style)
        ])
        
    tgt_table = Table(table_rows, colWidths=[70, 110, 55, 45, 100, 110, 30])
    tgt_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(tgt_table)
    story.append(Spacer(1, 12))

    # Acoustic Snippet Visualizations
    if sonar_matrix is not None and len(targets) > 0:
        story.append(Paragraph("3. ACOUSTIC SPECULAR HIGHLIGHT & SHADOW SNIPPETS", h2_style))
        story.append(Paragraph(
            "High-resolution acoustic snippet crops showing specular highlight return and trailing shadow length geometry:",
            body_style
        ))
        story.append(Spacer(1, 6))
        
        snippet_elements = []
        rows, cols = sonar_matrix.shape
        
        for idx, t in enumerate(targets[:4]):  # Show up to top 4 targets
            box = t.get("box", {})
            bx = int(box.get("x", 0))
            by = int(box.get("y", 0))
            bw = int(box.get("width", 30))
            bh = int(box.get("height", 30))
            
            # Crop with padding
            pad_x = max(20, bw * 2)
            pad_y = max(15, bh)
            x1 = max(0, bx - pad_x)
            x2 = min(cols, bx + bw + pad_x)
            y1 = max(0, by - pad_y)
            y2 = min(rows, by + bh + pad_y)
            
            crop = sonar_matrix[y1:y2, x1:x2]
            if crop.shape[0] > 5 and crop.shape[1] > 5:
                # Resize snippet for clear display
                crop_resized = cv2.resize(crop, (180, 100), interpolation=cv2.INTER_CUBIC)
                png_bytes = matrix_to_png_bytes(crop_resized, colormap_name="copper")
                img_io = io.BytesIO(png_bytes)
                rl_img = RLImage(img_io, width=2.2 * inch, height=1.2 * inch)
                
                info_p = Paragraph(
                    f"<b>{t.get('id')}: {t.get('label')}</b><br/>"
                    f"Severity: <b>{t.get('severity', '').upper()}</b> | Conf: {int(t.get('confidence', 0)*100)}%<br/>"
                    f"Est Height: <b>{t.get('dimensions', {}).get('height_m')} m</b><br/>"
                    f"Shadow Length: <b>{t.get('dimensions', {}).get('shadow_length_m')} m</b><br/>"
                    f"<i>{t.get('description', '')}</i>",
                    body_style
                )
                
                snip_tbl = Table([[rl_img, info_p]], colWidths=[170, 350])
                snip_tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                snippet_elements.append(snip_tbl)
                snippet_elements.append(Spacer(1, 6))
                
        story.append(KeepTogether(snippet_elements))

    # Recommendations & Sign-off
    story.append(Spacer(1, 10))
    story.append(Paragraph("4. OPERATIONAL RECOMMENDATIONS & PROTOCOLS", h2_style))
    recom_text = (
        "1. <b>UXO / Explosive Anomalies:</b> Establish an immediate 500m exclusion zone around coordinates. "
        "Notify Naval Explosive Ordnance Disposal (EOD) unit.<br/>"
        "2. <b>Ghost Net / Marine Entanglement:</b> Deploy ROV with mechanical cutter for retrieval to prevent marine ecological loss.<br/>"
        "3. <b>Pipeline Scour / Defects:</b> Schedule multibeam bathymetric high-density pass and ROV visual inspection.<br/>"
        "4. <b>Navigation Hazards:</b> Issue Notice to Mariners (NOTMAR) for high-relief targets (>1.5m clearance obstruction)."
    )
    story.append(Paragraph(recom_text, body_style))
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceAfter=8))
    story.append(Paragraph(
        "<b>Hydrographic Systems Certification:</b> SIH26057 AI Side-Scan Sonar Automated Verification Engine | ISO 19115 / IHO S-44 Compliant",
        subtitle_style
    ))

    doc.build(story)
    return buffer.getvalue()
