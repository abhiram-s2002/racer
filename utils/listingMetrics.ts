/**
 * Utility functions for listing engagement metrics
 * Handles view count and ping count tracking efficiently
 */

import { supabase } from './supabaseClient';

/**
 * Increment view count for a listing
 * @param listingId - The ID of the listing to increment views for
 * @returns Promise<boolean> - Success status
 */
export async function incrementViewCount(listingId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_listing_view_count', {
      listing_id_param: listingId
    });

    if (error) {
      console.warn('Failed to increment view count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error incrementing view count:', error);
    return false;
  }
}

/**
 * Increment ping count for a listing
 * @param listingId - The ID of the listing to increment pings for
 * @returns Promise<boolean> - Success status
 */
export async function incrementPingCount(listingId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_listing_ping_count', {
      listing_id_param: listingId
    });

    if (error) {
      console.warn('Failed to increment ping count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error incrementing ping count:', error);
    return false;
  }
}

/**
 * Format engagement metrics for display
 * @param viewCount - Number of views
 * @param pingCount - Number of pings
 * @returns Formatted engagement string
 */
export function formatEngagementMetrics(viewCount = 0, pingCount = 0): string {
  const views = viewCount > 0 ? `${viewCount.toLocaleString()} view${viewCount === 1 ? '' : 's'}` : '';
  const pings = pingCount > 0 ? `${pingCount} ping${pingCount === 1 ? '' : 's'}` : '';
  
  if (views && pings) {
    return `${views} • ${pings}`;
  } else if (views) {
    return views;
  } else if (pings) {
    return pings;
  } else {
    return 'No engagement yet';
  }
}

/**
 * Get urgency indicator based on engagement
 * @param viewCount - Number of views
 * @param pingCount - Number of pings
 * @returns Urgency level
 */
export function getEngagementUrgency(viewCount = 0, pingCount = 0): 'low' | 'medium' | 'high' {
  if (pingCount >= 5 || viewCount >= 100) return 'high';
  if (pingCount >= 2 || viewCount >= 20) return 'medium';
  return 'low';
}
