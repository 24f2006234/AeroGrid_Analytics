"""AeroGrid ML Engine: serves ETA predictions from the trained MLP.

The model is trained in PyTorch (train.py, DirectML on AMD GPUs) and exported to
NumPy arrays (export_model.py). Inference here is a plain NumPy forward pass of the
same 5 -> 64 -> 32 -> 16 -> 1 ReLU network, so the service needs no torch/scikit-learn
at runtime and fits comfortably within serverless bundle limits.
"""
import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="AeroGrid ML Engine")

# Only needed when the browser calls this service directly (e.g. separate Render hosting).
# On Vercel Services this service is internal and reached via the backend's binding.
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _load_assets():
    """Load exported weights + scaler once per process (cold start)."""
    try:
        weights = np.load(BASE_DIR / "eta_model.npz")
        layers = [(weights[f"w{i}"], weights[f"b{i}"]) for i in range(4)]
        with open(BASE_DIR / "scaler.json") as f:
            s = json.load(f)
        scaler = (np.asarray(s["mean"], dtype=np.float64), np.asarray(s["scale"], dtype=np.float64))
        print("ML assets loaded (NumPy inference).")
        return layers, scaler
    except Exception as e:  # keep the service up so /system-check can report the problem
        print(f"Warning: Could not load ML assets. Did you run train.py + export_model.py? Error: {e}")
        return None, None


LAYERS, SCALER = _load_assets()


def predict_seconds(features: np.ndarray) -> float:
    """Forward pass: standardize, then Linear+ReLU x3, then final Linear."""
    mean, scale = SCALER
    x = ((features - mean) / scale).astype(np.float32)
    for i, (w, b) in enumerate(LAYERS):
        x = x @ w.T + b
        if i < len(LAYERS) - 1:
            x = np.maximum(x, 0.0)
    return float(x.ravel()[0])


class FlightTelemetry(BaseModel):
    velocity: float
    altitude: float
    heading: float
    vertical_rate: float
    min_dist_to_hub: float


@app.post("/predict-eta")
def predict_eta(flight: FlightTelemetry):
    """Takes live flight telemetry and returns predicted seconds to arrival."""
    if LAYERS is None or SCALER is None:
        return {"error": "Model not loaded"}

    features = np.array([[
        flight.velocity,
        flight.altitude,
        flight.heading,
        flight.vertical_rate,
        flight.min_dist_to_hub,
    ]], dtype=np.float64)

    eta_seconds = predict_seconds(features)
    return {
        "eta_seconds": max(0, round(eta_seconds)),  # Prevent negative time
        "eta_minutes": max(0, round(eta_seconds / 60, 2)),
    }


@app.get("/system-check")
def system_check():
    return {
        "status": "ONLINE",
        "inference": "numpy",
        "model_loaded": LAYERS is not None,
    }
