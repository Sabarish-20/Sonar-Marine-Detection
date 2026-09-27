# AQUASCAN AI: Automated Underwater Marine Debris & Anomaly Detection System

> **Problem Statement SIH26057:** AI-Powered Automated Underwater Marine Debris and Anomaly Detection System using Side-Scan Sonar (SSS) Imagery.

---

## 🌊 System Architecture Overview

```
+-------------------------------------------------------------------------------+
|                      HYDROGRAPHIC OPERATIONS DASHBOARD                        |
|                     (React 18 + Vite + Tailwind + Leaflet)                    |
|                                                                               |
|  +--------------------------------+   +------------------------------------+  |
|  |    Waterfall Canvas (2D)       |   |      Geospatial GIS Map View       |  |
|  |  * Port & Starboard Split      |   |  * Vessel Trajectory Polyline      |  |
|  |  * Highlight/Shadow Overlays   |   |  * Swath Footprint & Target Pins   |  |
|  |  * Rulers & Colormap Switcher  |   |  * Live Inspection Sync            |  |
|  +--------------------------------+   +------------------------------------+  |
|  +-------------------------------------------------------------------------+  |
|  |               Real-Time Target Catalog & Mensuration Table              |  |
|  +-------------------------------------------------------------------------+  |
+---------------------------------------^---------------------------------------+
                                        | REST / GeoJSON / Data URIs
+---------------------------------------v---------------------------------------+
|                       FASTAPI BACKEND PROCESSING ENGINE                       |
|                                                                               |
|  +-----------------------------+     +-------------------------------------+  |
|  |   Acoustic Preprocessing    |     |    Dual-Branch AI Mensuration       |  |
|  |  * Bottom Tracking (Nadir)  |     |  * 7 Anomaly Target Classes         |  |
|  |  * Slant-Range (SRC)        | --> |  * Highlight-Shadow Association     |  |
|  |  * TVG Gain Equalization    |     |  * Acoustic Trigonometry (Ht)       |  |
|  |  * Lee Speckle Filter       |     |  * WGS84 Geodetic Projection        |  |
|  +-----------------------------+     +-------------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |       Export Service: Hydrographic PDF Inspection Report / GeoJSON      |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 📐 Acoustic Physics & Mathematical Foundations

### 1. Slant-Range Correction (SRC)
In raw Side-Scan Sonar records, pixel indices represent slant range ($R_s$) from the transducer rather than true horizontal distance along the seabed ($R_g$). Given the towfish altitude ($H_f$):

$$R_g = \sqrt{R_s^2 - H_f^2} \quad \text{for } R_s \ge H_f$$

$$R_s = \sqrt{R_g^2 + H_f^2}$$

The preprocessing engine interpolates slant-range rows onto a uniform horizontal ground-range grid, eliminating the nadir blind water column zone and rectifying geometric compression.

### 2. Time-Varying Gain (TVG) Equalization
Acoustic energy drops radially from nadir outward due to geometric spreading loss ($20 \log R$) and acoustic absorption ($\alpha R$). The TVG filter computes the cross-track empirical mean intensity profile:

$$\text{Gain}(x) = \frac{\mu_{\text{target}}}{\text{Profile}_{\text{smoothed}}(x)}$$

### 3. Lee Speckle Reduction Filter
Acoustic imagery exhibits multiplicative Rayleigh speckle noise. The Lee filter dampens noise while preserving high-contrast target boundaries:

$$\hat{I} = \bar{I} + W \cdot (I - \bar{I}) \quad \text{where} \quad W = \frac{\sigma^2}{\sigma^2 + \sigma_{\text{noise}}^2}$$

### 4. Acoustic Shadow Trigonometry & Physical Mensuration
When an acoustic pulse strikes an elevated object of height $H_t$, it reflects a specular highlight and casts an acoustic shadow of length $L_s$ along the sound propagation direction. Using similar triangles:

$$H_t = \frac{H_f \cdot L_s}{R_s}$$

Where:
- $H_t$: Estimated physical target height above seabed (meters).
- $H_f$: Towfish altitude above seabed (meters).
- $L_s$: Shadow length across track (meters).
- $R_s$: Slant range from transducer to the far tip of the shadow ($R_s = \sqrt{(R_{\text{target}} + L_s)^2 + H_f^2}$).

---

## 🎯 Target Classification Hierarchy

| Target Class | Category | Severity | Typical $H_t$ | Acoustic Signature |
| :--- | :--- | :--- | :--- | :--- |
| `ghost_net` | Marine Debris | **HIGH** | 0.4 – 2.5 m | Diffuse high-backscatter mesh with ragged acoustic shadow |
| `sunken_container` | Navigation Hazard | **CRITICAL** | 2.2 – 2.9 m | Rectangular specular highlight box with long rectangular shadow |
| `metallic_debris` | Industrial Debris | **MEDIUM** | 0.6 – 2.0 m | High specular corner return with distinct geometric shadow |
| `sunken_tyre` | Polymer Debris | **LOW** | 0.2 – 0.6 m | Toroidal/circular ring with crescent shadow |
| `unexploded_ordnance_uxo` | Defense Hazard | **CRITICAL** | 0.4 – 1.5 m | High-intensity apex with tapered cylindrical trailing shadow |
| `pipeline_anomaly` | Infrastructure | **HIGH** | 0.5 – 3.0 m | Linear highlight track with scour gap / free-spanning break |
| `natural_seabed_clutter` | Natural Geology | **INFO** | 0.5 – 4.0 m | Rounded moderate backscatter boulder / rock outcropping |

---

## 🚀 Quickstart & Launch Guide

### Method 1: Docker Compose (Recommended)

Run the full stack with a single command:

```bash
docker-compose up --build
```

- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Method 2: Local Development

#### 1. Backend Setup (Python 3.11+)
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/sonar/scenarios` | Lists pre-configured synthetic survey test scenarios. |
| `POST` | `/api/sonar/process` | Runs bottom tracking, TVG, Lee filter, SRC, and AI mensuration. |
| `POST` | `/api/sonar/upload` | Ingests custom GeoTIFF/PNG/JPEG sonar strips with telemetry metadata. |
| `GET` | `/api/sonar/targets` | Returns detected anomalies as GeoJSON FeatureCollection. |
| `GET` | `/api/sonar/export/report` | Generates a publication-grade Hydrographic Survey PDF Inspection Report. |
| `GET` | `/api/sonar/export/geojson` | Downloads standard GeoJSON for QGIS / ArcGIS import. |
| `GET` | `/api/sonar/export/csv` | Downloads tabular anomaly records in CSV format. |

---

## 📊 Pre-Configured Test Scenarios

1. **Scenario 1: Shallow Continental Sand Ripples & Gravel**
   - Seabed: Sand ripple sinusoidal dunes + gravel substrate
   - Anomalies: Abandoned nylon ghost net, sunken industrial steel drum, discarded vehicle tyre
   - Altitude: 8.5 m | Range Scale: 50 m/channel

2. **Scenario 2: Deep Estuarine Silt Trench & Subsea Pipeline**
   - Seabed: Smooth fine silt / mud
   - Anomalies: Unexploded Ordnance (UXO naval bomb), subsea pipeline scour anomaly, sunken ISO shipping container
   - Altitude: 10.2 m | Range Scale: 60 m/channel
