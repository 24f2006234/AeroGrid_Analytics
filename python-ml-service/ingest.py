import time
import requests
import pandas as pd
import os
from datetime import datetime

# OpenSky API endpoint and India Bounding Box (matching your frontend)
OPENSKY_URL = "https://opensky-network.org/api/states/all"
PARAMS = {
    "lamin": 6.0,
    "lomin": 68.0,
    "lamax": 36.0,
    "lomax": 98.0
}
CSV_FILENAME = "flight_dataset.csv"

def fetch_and_save():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Fetching telemetry...")
    try:
        response = requests.get(OPENSKY_URL, params=PARAMS, timeout=10)
        
        if response.status_code == 429:
            print("Rate limited by OpenSky. Sleeping...")
            return
            
        data = response.json()
        
        if data and data['states']:
            # Extract relevant columns for our future ML model
            parsed_data = []
            for flight in data['states']:
                parsed_data.append({
                    "timestamp": data['time'],
                    "icao24": flight[0],
                    "callsign": str(flight[1]).strip() if flight[1] else "UNK",
                    "origin_country": flight[2],
                    "longitude": flight[5],
                    "latitude": flight[6],
                    "altitude": flight[7],
                    "velocity": flight[9],
                    "heading": flight[10],
                    "vertical_rate": flight[11],
                    "on_ground": flight[8]
                })
            
            df = pd.DataFrame(parsed_data)
            
            # Append to CSV, write headers only if the file doesn't exist
            file_exists = os.path.isfile(CSV_FILENAME)
            df.to_csv(CSV_FILENAME, mode='a', index=False, header=not file_exists)
            
            print(f"Successfully appended {len(df)} aircraft states to {CSV_FILENAME}")
            
    except Exception as e:
        print(f"Error fetching data: {e}")

if __name__ == "__main__":
    print("Starting AeroGrid Data Harvester...")
    print("Press Ctrl+C to stop.")
    
    # Run a continuous loop, fetching every 5 minutes
    while True:
        fetch_and_save()
        time.sleep(300) # 300 seconds = 5 minutes