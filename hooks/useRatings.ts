import { useCallback, useState } from 'react';
import RatingService from '@/utils/ratingService';
import { 
  UserRating, 
  UserRatingStats, 
  RatingEligibility, 
  RatingFormData 
} from '@/utils/types';

interface UseRatingsReturn {
  // User rating stats
  getUserRatingStats: (username: string) => Promise<UserRatingStats | null>;
  ratingStats: Record<string, UserRatingStats>;
  
  // Rating eligibility
  checkRatingEligibility: (raterUsername: string, ratedUsername: string) => Promise<RatingEligibility>;
  eligibilityCache: Record<string, RatingEligibility>;
  
  // Rating submission
  submitRating: (
    raterUsername: string,
    ratedUsername: string,
    pingId: string,
    ratingData: RatingFormData
  ) => Promise<{ success: boolean; error?: string; rating?: UserRating }>;
  
  // Rating management
  getRatingByPingId: (pingId: string) => Promise<UserRating | null>;
  updateRating: (
    ratingId: string,
    raterUsername: string,
    ratingData: RatingFormData
  ) => Promise<{ success: boolean; error?: string; rating?: UserRating }>;
  deleteRating: (ratingId: string, raterUsername: string) => Promise<{ success: boolean; error?: string }>;
  
  // User ratings list
  getUserRatings: (
    username: string,
    page?: number,
    pageSize?: number
  ) => Promise<{ ratings: UserRating[]; total: number; hasMore: boolean }>;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Cache management
  clearCache: () => void;
  refreshRatingStats: (username: string) => Promise<void>;
}

/**
 * Hook for managing ratings functionality
 * Provides rating stats, eligibility checks, and rating operations
 */
export function useRatings(): UseRatingsReturn {
  const [ratingStats, setRatingStats] = useState<Record<string, UserRatingStats>>({});
  const [eligibilityCache, setEligibilityCache] = useState<Record<string, RatingEligibility>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user rating stats with caching
  const getUserRatingStats = useCallback(async (username: string): Promise<UserRatingStats | null> => {
    try {
      setError(null);
      
      // Check cache first
      if (ratingStats[username]) {
        return ratingStats[username];
      }

      const stats = await RatingService.getUserRatingStats(username);
      
      if (stats) {
        setRatingStats(prev => ({
          ...prev,
          [username]: stats
        }));
      }
      
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get rating stats';
      setError(errorMessage);
      return null;
    }
  }, [ratingStats]);

  // Check rating eligibility with caching
  const checkRatingEligibility = useCallback(async (
    raterUsername: string, 
    ratedUsername: string
  ): Promise<RatingEligibility> => {
    try {
      const cacheKey = `${raterUsername}-${ratedUsername}`;
      
      // Check cache first
      if (eligibilityCache[cacheKey]) {
        return eligibilityCache[cacheKey];
      }

      const eligibility = await RatingService.canRateUser(raterUsername, ratedUsername);
      
      // Cache the result
      setEligibilityCache(prev => ({
        ...prev,
        [cacheKey]: eligibility
      }));
      
      return eligibility;
    } catch (err) {
      return { can_rate: false, pending_pings: [] };
    }
  }, [eligibilityCache]);

  // Submit a rating
  const submitRating = useCallback(async (
    raterUsername: string,
    ratedUsername: string,
    pingId: string,
    ratingData: RatingFormData
  ): Promise<{ success: boolean; error?: string; rating?: UserRating }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RatingService.submitRating(
        raterUsername,
        ratedUsername,
        pingId,
        ratingData
      );

      if (result.success) {
        // Clear cached stats for the rated user to force refresh
        setRatingStats(prev => {
          const newStats = { ...prev };
          delete newStats[ratedUsername];
          return newStats;
        });
        
        // Clear eligibility cache for this user pair
        const cacheKey = `${raterUsername}-${ratedUsername}`;
        setEligibilityCache(prev => {
          const newCache = { ...prev };
          delete newCache[cacheKey];
          return newCache;
        });
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit rating';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get rating by ping ID
  const getRatingByPingId = useCallback(async (pingId: string): Promise<UserRating | null> => {
    try {
      return await RatingService.getRatingByPingId(pingId);
    } catch (err) {
      return null;
    }
  }, []);

  // Update a rating
  const updateRating = useCallback(async (
    ratingId: string,
    raterUsername: string,
    ratingData: RatingFormData
  ): Promise<{ success: boolean; error?: string; rating?: UserRating }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RatingService.updateRating(ratingId, raterUsername, ratingData);
      
      if (result.success) {
        // Clear cached stats to force refresh
        setRatingStats({});
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update rating';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a rating
  const deleteRating = useCallback(async (
    ratingId: string,
    raterUsername: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await RatingService.deleteRating(ratingId, raterUsername);
      
      if (result.success) {
        // Clear cached stats to force refresh
        setRatingStats({});
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete rating';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user ratings list
  const getUserRatings = useCallback(async (
    username: string,
    page = 1,
    pageSize = 20
  ): Promise<{ ratings: UserRating[]; total: number; hasMore: boolean }> => {
    try {
      return await RatingService.getUserRatings(username, page, pageSize);
    } catch (err) {
      return { ratings: [], total: 0, hasMore: false };
    }
  }, []);

  // Clear all cached data
  const clearCache = useCallback(() => {
    setRatingStats({});
    setEligibilityCache({});
  }, []);

  // Refresh rating stats for a specific user
  const refreshRatingStats = useCallback(async (username: string) => {
    try {
      const stats = await RatingService.getUserRatingStats(username);
      
      if (stats) {
        setRatingStats(prev => ({
          ...prev,
          [username]: stats
        }));
      }
    } catch (err) {
      // No console.error here
    }
  }, []);

  return {
    getUserRatingStats,
    ratingStats,
    checkRatingEligibility,
    eligibilityCache,
    submitRating,
    getRatingByPingId,
    updateRating,
    deleteRating,
    getUserRatings,
    loading,
    error,
    clearCache,
    refreshRatingStats,
  };
}

export default useRatings;
