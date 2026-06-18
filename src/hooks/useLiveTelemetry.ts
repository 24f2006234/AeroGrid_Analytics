import { useState, useEffect, useCallback } from 'react';
import { Flight } from '../types';

export const useLiveTelemetry = (intervalMs = 30000) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  const fetchTelemetry = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/telemetry');
      if (response.ok) {
        const data: Flight[] = await response.json();
        setFlights(data);
        setIsError(false);
      } else {
        setIsError(true);
      }
    } catch (error) {
      // Intentionally omitting console.error for clean logs
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    setIsLoading(true);
    fetchTelemetry().then(() => {
      setLastRefreshed(Date.now());
    });
  }, [fetchTelemetry]);

  // Initial load
  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Background polling interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTelemetry();
    }, intervalMs);

    // This cleanup runs when intervalMs or lastRefreshed changes, effectively resetting the interval timer
    return () => clearInterval(intervalId);
  }, [fetchTelemetry, intervalMs, lastRefreshed]);

  return { flights, isLoading, isError, refreshData };
};
