import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
import pickle
import numpy as np

# DirectML (AMD GPU on Windows) is optional: cloud hosts run Linux without it, so fall back to CPU.
try:
    import torch_directml
    DIRECTML_AVAILABLE = torch_directml.is_available()
except ImportError:
    torch_directml = None
    DIRECTML_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="AeroGrid ML Engine")

# Comma-separated frontend origins, e.g. "https://aerogrid.vercel.app". Unset = allow all (dev only).
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 1. Initialize Hardware & Model State
device = torch_directml.device() if DIRECTML_AVAILABLE else torch.device("cpu")
scaler = None
model = None

# Recreate the exact architecture from train.py
def get_model():
    return nn.Sequential(
        nn.Linear(5, 64),
        nn.ReLU(),
        nn.Linear(64, 32),
        nn.ReLU(),
        nn.Linear(32, 16),
        nn.ReLU(),
        nn.Linear(16, 1)
    ).to(device)

@app.on_event("startup")
def load_ml_assets():
    """Loads the scaler and model weights into memory when the server boots."""
    global scaler, model
    try:
        with open(BASE_DIR / 'scaler.pkl', 'rb') as f:
            loaded_scaler = pickle.load(f)

        loaded_model = get_model()
        state_dict = torch.load(BASE_DIR / 'eta_model.pth', map_location='cpu', weights_only=True)
        loaded_model.load_state_dict(state_dict)
        loaded_model.eval() # Set to evaluation mode (no training)

        # Only publish once everything loaded, so /system-check never reports a half-loaded model
        scaler, model = loaded_scaler, loaded_model
        print(f"ML Assets loaded successfully on {device}.")
    except Exception as e:
        print(f"Warning: Could not load ML assets. Did you run train.py? Error: {e}")

# 2. Define the expected incoming JSON structure
class FlightTelemetry(BaseModel):
    velocity: float
    altitude: float
    heading: float
    vertical_rate: float
    min_dist_to_hub: float

@app.post("/predict-eta")
def predict_eta(flight: FlightTelemetry):
    """Takes live flight telemetry and returns predicted seconds to arrival."""
    if model is None or scaler is None:
        return {"error": "Model not loaded"}

    # Convert incoming JSON to a numpy array matching the training shape
    raw_features = np.array([[
        flight.velocity, 
        flight.altitude, 
        flight.heading, 
        flight.vertical_rate, 
        flight.min_dist_to_hub
    ]])

    # Standardize the numbers using the saved scaler
    scaled_features = scaler.transform(raw_features)
    
    # Convert to PyTorch tensor and send to GPU
    tensor_features = torch.FloatTensor(scaled_features).to(device)

    # Run the prediction
    with torch.no_grad():
        prediction = model(tensor_features)
        
    eta_seconds = float(prediction.item())

    return {
        "eta_seconds": max(0, round(eta_seconds)), # Prevent negative time (updated weights loader)
        "eta_minutes": max(0, round(eta_seconds / 60, 2))
    }

@app.get("/system-check")
def system_check():
    return {
        "status": "ONLINE",
        "gpu_acceleration": DIRECTML_AVAILABLE,
        "device": str(device),
        "model_loaded": model is not None
    }