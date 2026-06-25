import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch_directml
# pyrefly: ignore [missing-import]
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import pickle

# 1. Hardware Bridge Setup
device = torch_directml.device()
print(f"Initializing training on: {device}")

def train_model(csv_path="training_data.csv"):
    print("Loading and preparing dataset...")
    df = pd.read_csv(csv_path)
    
    # Isolate Features (X) and Target (y)
    X = df[['velocity', 'altitude', 'heading', 'vertical_rate', 'min_dist_to_hub']].values
    y = df['eta_seconds'].values

    # Train/Test Split (80% training, 20% validation)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Save the scaler so the FastAPI server can use it later for live predictions
    with open('scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)

    # Convert to PyTorch Tensors and send to GPU
    X_train_t = torch.FloatTensor(X_train_scaled).to(device)
    y_train_t = torch.FloatTensor(y_train).view(-1, 1).to(device)
    X_test_t = torch.FloatTensor(X_test_scaled).to(device)
    y_test_t = torch.FloatTensor(y_test).view(-1, 1).to(device)

    # Create DataLoaders for batch processing
    train_dataset = TensorDataset(X_train_t, y_train_t)
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)

    # 2. Architect the Multi-Layer Perceptron (MLP)
    model = nn.Sequential(
        nn.Linear(5, 64),
        nn.ReLU(),
        nn.Linear(64, 32),
        nn.ReLU(),
        nn.Linear(32, 16),
        nn.ReLU(),
        nn.Linear(16, 1) # Single continuous output: ETA in seconds
    ).to(device)

    # 3. Define Loss and Optimizer
    criterion = nn.MSELoss() # Mean Squared Error
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # 4. The Training Loop
    epochs = 200
    print("Beginning Training Loop...")
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            predictions = model(batch_X)
            loss = criterion(predictions, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        # Validation check every 20 epochs
        if (epoch + 1) % 20 == 0:
            model.eval()
            with torch.no_grad():
                val_preds = model(X_test_t)
                val_loss = criterion(val_preds, y_test_t)
                
                # Calculate Mean Absolute Error (MAE) for readable seconds
                mae = torch.mean(torch.abs(val_preds - y_test_t)).item()
                
            print(f"Epoch [{epoch+1}/{epochs}] | Training Loss: {total_loss/len(train_loader):.2f} | Val MAE: {mae:.2f} seconds")

    # Save the trained brain
    torch.save(model.state_dict(), 'eta_model.pth')
    print("Training Complete. Saved 'eta_model.pth' and 'scaler.pkl'.")

if __name__ == '__main__':
    train_model()