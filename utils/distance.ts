/**
 * Utilities for formatting distance display
 */

/**
 * Format distance for display with readable units
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string (e.g., "5km", "50m", "2.5km")
 */
export function formatDistance(distanceKm: number): string {
  if (!distanceKm || distanceKm === Number.MAX_VALUE || distanceKm < 0) {
    return 'Unknown';
  }
  
  // Convert to meters for more precise formatting
  const distanceM = distanceKm * 1000;
  
  if (distanceM < 100) {
    // Less than 100m - show in meters
    return `${Math.round(distanceM)}m`;
  } else if (distanceM < 1000) {
    // 100m to 1km - show in meters
    return `${Math.round(distanceM)}m`;
  } else if (distanceKm < 10) {
    // 1km to 10km - show with one decimal if needed
    const rounded = Math.round(distanceKm * 10) / 10;
    return rounded % 1 === 0 ? `${Math.round(rounded)}km` : `${rounded}km`;
  } else {
    // 10km and above - show as whole kilometers
    return `${Math.round(distanceKm)}km`;
  }
}

/**
 * Format distance for display with more detailed units
 * @param distanceKm Distance in kilometers
 * @returns Formatted distance string with appropriate precision
 */
export function formatDistanceDetailed(distanceKm: number): string {
  if (!distanceKm || distanceKm === Number.MAX_VALUE || distanceKm < 0) {
    return 'Unknown';
  }
  
  const distanceM = distanceKm * 1000;
  
  if (distanceM < 50) {
    // Very close - show exact meters
    return `${Math.round(distanceM)}m`;
  } else if (distanceM < 500) {
    // Close - show in 10m increments
    return `${Math.round(distanceM / 10) * 10}m`;
  } else if (distanceM < 1000) {
    // Near - show in 50m increments
    return `${Math.round(distanceM / 50) * 50}m`;
  } else if (distanceKm < 5) {
    // Local - show with one decimal
    const rounded = Math.round(distanceKm * 10) / 10;
    return rounded % 1 === 0 ? `${Math.round(rounded)}km` : `${rounded}km`;
  } else if (distanceKm < 50) {
    // Regional - show whole kilometers
    return `${Math.round(distanceKm)}km`;
  } else {
    // Distant - show in 5km increments
    return `${Math.round(distanceKm / 5) * 5}km`;
  }
}

/**
 * Get distance category for styling
 * @param distanceKm Distance in kilometers
 * @returns Distance category string
 */
export function getDistanceCategory(distanceKm: number): 'very-near' | 'near' | 'local' | 'regional' | 'distant' {
  if (!distanceKm || distanceKm < 0) return 'distant';
  
  if (distanceKm < 0.1) return 'very-near';    // < 100m
  if (distanceKm < 1) return 'near';           // < 1km
  if (distanceKm < 5) return 'local';          // < 5km
  if (distanceKm < 25) return 'regional';      // < 25km
  return 'distant';                            // 25km+
} 