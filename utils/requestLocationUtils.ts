import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key for location data
const LOCATION_CACHE_KEY = 'request_location_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  location_name?: string;
  location_district?: string;
  location_state?: string;
  formatted_address?: string;
  timestamp: number;
}

export interface LocationPickerResult {
  success: boolean;
  data?: LocationData;
  error?: string;
}

/**
 * Enhanced location picker utility for requests
 * Reuses and improves upon the existing CreateRequestModal location functionality
 */
export class RequestLocationUtils {
  
  /**
   * Get current location using GPS with reverse geocoding
   * Enhanced version of the existing CreateRequestModal functionality
   */
  static async getCurrentLocation(): Promise<LocationPickerResult> {
    try {
      // Check cache first
      const cached = await this.getCachedLocation();
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return { success: true, data: cached };
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { 
          success: false, 
          error: 'Location permission is required to use your current location. Please enable it in your device settings.' 
        };
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      // Get address information using reverse geocoding
      const addressData = await this.getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationData: LocationData = {
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        ...addressData,
        timestamp: Date.now(),
      };

      // Cache the location
      await this.cacheLocation(locationData);
      
      return { success: true, data: locationData };
    } catch (error) {
      console.error('Error getting current location:', error);
      return { 
        success: false, 
        error: 'Unable to get your current location. Please try again or select a location manually.' 
      };
    }
  }

  /**
   * Get address from coordinates using reverse geocoding
   * Enhanced version with better error handling and parsing
   */
  static async getAddressFromCoordinates(
    latitude: number, 
    longitude: number
  ): Promise<Partial<LocationData>> {
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (!place) {
        return {
          formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        };
      }

      // Parse location hierarchy from place data (India-specific)
      const location_name = place.name || place.district || place.city || '';
      const location_district = place.district || place.subregion || '';
      const location_state = place.region || '';

      // Create formatted address (India-specific: city, district, state)
      const addressParts = [
        place.name,
        place.street,
        place.city,
        place.region
      ].filter(Boolean);
      
      const formatted_address = addressParts.join(', ');

      return {
        location_name,
        location_district,
        location_state,
        formatted_address,
      };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return {
        formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };
    }
  }

  /**
   * Parse location text into hierarchical components
   * Useful for manual location input
   */
  static parseLocationText(locationText: string): Partial<LocationData> {
    if (!locationText || locationText.trim() === '') {
      return {};
    }

    const parts = locationText.split(',').map(part => part.trim());
    const partCount = parts.length;

    switch (partCount) {
      case 1:
        return {
          location_name: parts[0],
          formatted_address: parts[0],
        };
      case 2:
        return {
          location_name: parts[0],
          location_state: parts[1],
          formatted_address: locationText,
        };
      case 3:
        return {
          location_name: parts[0],
          location_district: parts[1],
          location_state: parts[2],
          formatted_address: locationText,
        };
      default:
        return {
          location_name: parts[0],
          location_district: parts[1] || '',
          location_state: parts[2] || '',
          formatted_address: locationText,
        };
    }
  }

  /**
   * Cache location data to reduce API calls
   */
  static async cacheLocation(locationData: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        LOCATION_CACHE_KEY,
        JSON.stringify(locationData)
      );
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  /**
   * Get cached location data
   */
  static async getCachedLocation(): Promise<LocationData | null> {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }

  /**
   * Clear location cache
   */
  static async clearLocationCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing location cache:', error);
    }
  }

  /**
   * Format location for display
   */
  static formatLocationForDisplay(locationData: Partial<LocationData>): string {
    if (locationData.formatted_address) {
      return locationData.formatted_address;
    }

    const parts = [
      locationData.location_name,
      locationData.location_district,
      locationData.location_state
    ].filter(Boolean);

    return parts.join(', ') || 'Location not specified';
  }

  /**
   * Get location hierarchy for database storage
   */
  static getLocationHierarchy(locationData: Partial<LocationData>) {
    return {
      location: locationData.formatted_address || '',
      location_name: locationData.location_name || null,
      location_district: locationData.location_district || null,
      location_state: locationData.location_state || null,
      latitude: locationData.coordinates?.latitude || null,
      longitude: locationData.coordinates?.longitude || null,
    };
  }

  /**
   * Check if location data is valid
   */
  static isValidLocationData(locationData: Partial<LocationData>): boolean {
    return !!(
      locationData.coordinates?.latitude && 
      locationData.coordinates?.longitude &&
      locationData.formatted_address
    );
  }

  /**
   * Get location status for UI display
   */
  static getLocationStatus(locationData?: Partial<LocationData>) {
    if (!locationData) {
      return {
        status: 'none',
        message: 'No location set',
        color: '#F59E0B',
      };
    }

    if (this.isValidLocationData(locationData)) {
      return {
        status: 'valid',
        message: `Location: ${this.formatLocationForDisplay(locationData)}`,
        color: '#22C55E',
      };
    }

    return {
      status: 'partial',
      message: 'Location partially set',
      color: '#F59E0B',
    };
  }
}
