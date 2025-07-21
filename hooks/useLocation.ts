import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'user_location_cache';
const LOCATION_CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
  timestamp: number | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
    timestamp: null,
  });

  // Function to request and update location
  const updateLocation = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setState(prev => ({
          ...prev,
          error: 'Permission to access location was denied',
          loading: false,
        }));
        return;
      }

      // Get current location
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const timestamp = Date.now();

      // Save to state
      setState({
        latitude,
        longitude,
        error: null,
        loading: false,
        timestamp,
      });

      // Cache the location
      await AsyncStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify({ latitude, longitude, timestamp })
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  };

  // Get location on mount
  useEffect(() => {
    async function getLocationWithCache() {
      try {
        // Try to get cached location first
        const cachedLocationJson = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
        
        if (cachedLocationJson) {
          const cachedLocation = JSON.parse(cachedLocationJson);
          const now = Date.now();
          
          // Use cached location if it's recent enough
          if (now - cachedLocation.timestamp < LOCATION_CACHE_EXPIRY) {
            setState({
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
              error: null,
              loading: false,
              timestamp: cachedLocation.timestamp,
            });
            return;
          }
        }
        
        // If no valid cache, get fresh location
        await updateLocation();
      } catch {
        // If cache reading fails, get fresh location
        await updateLocation();
      }
    }

    getLocationWithCache();
  }, []);

  return {
    ...state,
    updateLocation, // Expose function to manually update location
  };
} 