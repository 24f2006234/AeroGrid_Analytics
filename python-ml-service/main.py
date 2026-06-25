from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
import torch_directml
import pickle
import numpy as np

app = FastAPI(title="AeroGrid ML Engine (AMD Compute)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize Hardware & Model State
device = torch_directml.device()
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
        with open('scaler.pkl', 'rb') as f:
            scaler = pickle.load(f)
        
        model = get_model()
        model.load_state_dict(torch.load('eta_model.pth'))
        model.eval() # Set to evaluation mode (no training)
        print("ML Assets loaded successfully on DirectML.")
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
    if not model or not scaler:
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
        "eta_seconds": max(0, round(eta_seconds)), # Prevent negative time
        "eta_minutes": max(0, round(eta_seconds / 60, 2))
    }

@app.get("/system-check")
def system_check():
    return {
        "status": "ONLINE",
        "gpu_acceleration": torch_directml.is_available(),
        "model_loaded": model is not None
    }