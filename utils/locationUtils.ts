import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDistance } from './distance';

// Location interfaces
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData {
  coordinates: Coordinates;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timestamp: number;
}

export interface ListingWithLocation {
  id: string;
  title: string;
  price: string;
  category: string;
  description?: string;
  images: string[];
  isActive: boolean;
  sellerId: string;
  location: LocationData;
  distance?: number; // Calculated distance in meters
  createdAt: Date;
}

// Sorting options
export type SortOption = 
  | 'distance_asc' 
  | 'distance_desc' 
  | 'price_asc' 
  | 'price_desc' 
  | 'date_newest' 
  | 'date_oldest'
  | 'relevance';

// Cache keys
const LOCATION_CACHE_KEY = 'user_location_cache';
const LOCATION_PERMISSION_KEY = 'location_permission_status';

export class LocationUtils {
  // Haversine formula for accurate distance calculation
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Format distance for display (delegates to distance.ts utility)
  static formatDistance(meters: number): string {
    const distanceKm = meters / 1000;
    return formatDistance(distanceKm);
  }

  // Get user's current location with caching
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      // Check cache first
      const cached = await this.getCachedLocation();
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        await this.savePermissionStatus('denied');
        return null;
      }

      await this.savePermissionStatus('granted');

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      // Get address information
      const address = await this.getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationData: LocationData = {
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        ...address,
        timestamp: Date.now(),
      };

      // Cache the location
      await this.cacheLocation(locationData);
      return locationData;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Get address from coordinates using reverse geocoding
  static async getAddressFromCoordinates(
    latitude: number, 
    longitude: number
  ): Promise<Partial<LocationData>> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const result = results[0];
        return {
          address: result.street ? `${result.street}, ${result.city || ''}` : result.city || '',
          city: result.city || '',
          state: result.region || '',
          country: result.country || '',
        };
      }
      return {};
    } catch (error) {
      console.error('Error getting address:', error);
      return {};
    }
  }

  // Calculate distances for all listings
  static calculateDistances(
    listings: ListingWithLocation[], 
    userLocation: LocationData
  ): ListingWithLocation[] {
    return listings.map(listing => ({
      ...listing,
      distance: this.calculateDistance(
        userLocation.coordinates.latitude,
        userLocation.coordinates.longitude,
        listing.location.coordinates.latitude,
        listing.location.coordinates.longitude
      ),
    }));
  }

  // Sort listings based on various criteria
  static sortListings(
    listings: ListingWithLocation[], 
    sortOption: SortOption,
    userLocation?: LocationData
  ): ListingWithLocation[] {
    const sorted = [...listings];

    switch (sortOption) {
      case 'distance_asc':
        if (!userLocation) return sorted;
        return this.calculateDistances(sorted, userLocation)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      case 'distance_desc':
        if (!userLocation) return sorted;
        return this.calculateDistances(sorted, userLocation)
          .sort((a, b) => (b.distance || 0) - (a.distance || 0));

      case 'price_asc':
        return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      case 'price_desc':
        return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      case 'date_newest':
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      case 'date_oldest':
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      case 'relevance':
        // Combine distance and recency for relevance
        if (!userLocation) return sorted;
        {
          const withDistances = this.calculateDistances(sorted, userLocation);
          return withDistances.sort((a, b) => {
            const distanceScore = (a.distance || 0) - (b.distance || 0);
            const recencyScore = b.createdAt.getTime() - a.createdAt.getTime();
            // Weight: 70% distance, 30% recency
            return distanceScore * 0.7 + (recencyScore / 86400000) * 0.3; // Normalize recency to days
          });
        }

      default:
        return sorted;
    }
  }

  // Filter listings by distance range
  static filterByDistance(
    listings: ListingWithLocation[], 
    userLocation: LocationData, 
    maxDistanceKm: number
  ): ListingWithLocation[] {
    const maxDistanceM = maxDistanceKm * 1000;
    const withDistances = this.calculateDistances(listings, userLocation);
    return withDistances.filter(listing => (listing.distance || 0) <= maxDistanceM);
  }

  // Geospatial bounding box for efficient queries
  static getBoundingBox(
    center: Coordinates, 
    radiusKm: number
  ): { north: number; south: number; east: number; west: number } {
    const latDelta = radiusKm / 111.32; // 1 degree ≈ 111.32 km
    const lonDelta = radiusKm / (111.32 * Math.cos(center.latitude * Math.PI / 180));

    return {
      north: center.latitude + latDelta,
      south: center.latitude - latDelta,
      east: center.longitude + lonDelta,
      west: center.longitude - lonDelta,
    };
  }

  // Check if coordinates are within bounding box
  static isWithinBoundingBox(
    coords: Coordinates, 
    bounds: { north: number; south: number; east: number; west: number }
  ): boolean {
    return coords.latitude >= bounds.south &&
           coords.latitude <= bounds.north &&
           coords.longitude >= bounds.west &&
           coords.longitude <= bounds.east;
  }

  // Cache management
  static async cacheLocation(location: LocationData): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }

  static async getCachedLocation(): Promise<LocationData | null> {
    try {
      const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }

  static async clearLocationCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing location cache:', error);
    }
  }

  // Permission management
  static async savePermissionStatus(status: 'granted' | 'denied' | 'undetermined'): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, status);
    } catch (error) {
      console.error('Error saving permission status:', error);
    }
  }

  static async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const status = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
      return (status as any) || 'undetermined';
    } catch (error) {
      console.error('Error getting permission status:', error);
      return 'undetermined';
    }
  }

  // Performance optimization: Batch distance calculations
  static async batchCalculateDistances(
    listings: ListingWithLocation[], 
    userLocation: LocationData,
    batchSize = 100
  ): Promise<ListingWithLocation[]> {
    const results: ListingWithLocation[] = [];
    
    for (let i = 0; i < listings.length; i += batchSize) {
      const batch = listings.slice(i, i + batchSize);
      const batchWithDistances = this.calculateDistances(batch, userLocation);
      results.push(...batchWithDistances);
      
      // Yield control to prevent blocking UI
      if (i + batchSize < listings.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }

  // Generate random coordinates within a radius (for testing)
  static generateRandomCoordinates(
    center: Coordinates, 
    radiusKm: number
  ): Coordinates {
    const r = Math.sqrt(Math.random()) * radiusKm;
    const theta = Math.random() * 2 * Math.PI;
    
    const latDelta = r / 111.32;
    const lonDelta = r / (111.32 * Math.cos(center.latitude * Math.PI / 180));
    
    return {
      latitude: center.latitude + latDelta * Math.cos(theta),
      longitude: center.longitude + lonDelta * Math.sin(theta),
    };
  }

  // Format location display for listings (remove country and state)
  static formatLocationDisplay(locationDisplay: string): string {
    if (!locationDisplay) return '';
    
    // Split by commas and filter out country and state
    const parts = locationDisplay.split(',').map(part => part.trim());
    
    // Keep only the first two parts (usually street/area and city)
    // This removes country and state which are typically at the end
    const filteredParts = parts.slice(0, 2);
    
    return filteredParts.join(', ');
  }
} 