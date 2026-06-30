import pandas as pd
import numpy as np

# Vectorized Haversine formula for fast Pandas execution
def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in kilometers
    dLat = np.radians(lat2 - lat1)
    dLon = np.radians(lon2 - lon1)
    a = (np.sin(dLat/2)**2 + 
         np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon/2)**2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return R * c

def prepare_dataset(input_csv="flight_dataset.csv", output_csv="training_data.csv"):
    print("Loading raw flight data...")
    try:
        df = pd.read_csv(input_csv)
    except FileNotFoundError:
        print(f"Error: {input_csv} not found. Let the harvester run a bit longer!")
        return

    # Sort chronologically by aircraft and time
    df = df.sort_values(by=['icao24', 'timestamp'])
    
    # Drop rows with missing critical positional data
    df = df.dropna(subset=['latitude', 'longitude', 'altitude', 'velocity'])

    # Major Indian Airspace Hubs (Lat, Lon)
    hubs = {
        'DEL': (28.5562, 77.1000),
        'BOM': (19.0896, 72.8656),
        'BLR': (13.1986, 77.7066),
        'CCU': (22.6520, 88.4467) # Kolkata/Barrackpore Sector
    }

    print("Calculating geospatial distances...")
    dist_columns = []
    for hub, (lat, lon) in hubs.items():
        col_name = f'dist_{hub}'
        df[col_name] = haversine_distance(df['latitude'], df['longitude'], lat, lon)
        dist_columns.append(col_name)

    # Find the distance to the closest hub for each ping
    df['min_dist_to_hub'] = df[dist_columns].min(axis=1)

    # Group into individual flights by checking for timestamp gaps > 30 minutes
    df['time_diff'] = df.groupby('icao24')['timestamp'].diff()
    df['new_flight'] = (df['time_diff'] > 1800) | df['time_diff'].isnull()
    df['flight_id'] = df.groupby('icao24')['new_flight'].cumsum()
    df['flight_key'] = df['icao24'] + "_" + df['flight_id'].astype(str)

    print("Identifying arrival events...")
    # OpenSky altitude is in meters. 3048m is roughly 10,000 ft.
    # An aircraft is "arriving" if it is below 10,000 ft and descending (vertical_rate < 0)
    df['is_arriving'] = (df['altitude'] < 3048) & (df['vertical_rate'] < 0)

    # Find the exact timestamp when each flight crossed the arrival threshold
    arrivals = df[df['is_arriving']].groupby('flight_key')['timestamp'].min().reset_index()
    arrivals.rename(columns={'timestamp': 'arrival_time'}, inplace=True)

    # Merge this target arrival time back into the main dataset
    df = pd.merge(df, arrivals, on='flight_key', how='inner')

    # Filter out data AFTER they arrived (we only want to train on the approach)
    df = df[df['timestamp'] < df['arrival_time']]

    # TARGET VARIABLE: How many seconds until they hit the arrival threshold?
    df['eta_seconds'] = df['arrival_time'] - df['timestamp']

    # Select only the features the Neural Network needs
    ml_features = [
        'velocity', 
        'altitude', 
        'heading', 
        'vertical_rate', 
        'min_dist_to_hub', 
        'eta_seconds'
    ]
    
    ml_df = df[ml_features].dropna()
    ml_df.to_csv(output_csv, index=False)
    
    print(f"Success! Extracted {len(ml_df)} viable training samples to {output_csv}.")
    print("Ready for PyTorch ingestion.")

if __name__ == '__main__':
    prepare_dataset()