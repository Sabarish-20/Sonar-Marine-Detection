"""
FastAPI Main Application Entrypoint for Marine Debris and Sonar Anomaly Detection System.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router as sonar_router

app = FastAPI(
    title="Side-Scan Sonar (SSS) Marine Debris & Anomaly Detection API",
    description="Automated Hydrographic Preprocessing, AI Detection, Acoustic Shadow Mensuration, and GIS Reporting",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sonar_router)


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "SIH26057 Hydrographic Sonar AI Detection Pipeline",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8000, reload=True)
