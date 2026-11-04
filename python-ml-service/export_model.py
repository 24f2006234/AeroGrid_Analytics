"""Export the trained PyTorch model + scaler to lightweight files for serving.

Training uses PyTorch (DirectML on AMD GPUs); serving only needs NumPy, which keeps
the deployed bundle small (~50 MB instead of ~1 GB with torch + scikit-learn).

Run after train.py:  python export_model.py
Produces: eta_model.npz (layer weights) and scaler.json (StandardScaler mean/scale).
"""
import json
import pickle
import numpy as np
import torch

state = torch.load("eta_model.pth", map_location="cpu", weights_only=True)
# nn.Sequential linear layers live at indices 0, 2, 4, 6 (ReLUs in between)
arrays = {}
for i, idx in enumerate((0, 2, 4, 6)):
    arrays[f"w{i}"] = state[f"{idx}.weight"].numpy().astype(np.float32)
    arrays[f"b{i}"] = state[f"{idx}.bias"].numpy().astype(np.float32)
np.savez("eta_model.npz", **arrays)

with open("scaler.pkl", "rb") as f:
    scaler = pickle.load(f)
with open("scaler.json", "w") as f:
    json.dump({"mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist()}, f, indent=2)

print("Exported eta_model.npz and scaler.json")
