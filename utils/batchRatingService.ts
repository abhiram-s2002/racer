import { supabase } from './supabaseClient';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface UserRatingStats {
  username: string;
  average_rating: number;
  total_ratings: number;
}

interface BatchRatingResult {
  [username: string]: {
    rating: string;
    reviewCount: number;
  } | null;
}

/**
 * Batch rating service for efficient user rating queries
 */
export class BatchRatingService {
  private static instance: BatchRatingService;
  private cache = new Map<string, { data: BatchRatingResult; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): BatchRatingService {
    if (!BatchRatingService.instance) {
      BatchRatingService.instance = new BatchRatingService();
    }
    return BatchRatingService.instance;
  }

  /**
   * Get ratings for multiple users in a single batch request
   */
  async getBatchUserRatings(usernames: string[]): Promise<BatchRatingResult> {
    if (usernames.length === 0) {
      return {};
    }

    // Remove duplicates and filter out empty usernames
    const uniqueUsernames = [...new Set(usernames.filter(username => username && username.trim()))];
    
    if (uniqueUsernames.length === 0) {
      return {};
    }

    // Check cache first
    const cacheKey = `batch_ratings_${uniqueUsernames.sort().join('_')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      // Optimized: Use batch function for 100k+ users
      // This reduces 6 individual function calls to 1 batch query per page load
      // For 100k users: 600k queries/day → 100k queries/day (83% cost reduction)
      const { data, error } = await supabase
        .rpc('get_batch_user_rating_stats', { usernames: uniqueUsernames });

      if (error) {
        await errorHandler.handleError(error, {
          operation: 'batch_rating_query',
          component: 'BatchRatingService',
        });
        return {};
      }

      // Process results into the expected format
      const result: BatchRatingResult = {};
      
      // Initialize all usernames as null (no ratings)
      uniqueUsernames.forEach(username => {
        result[username] = null;
      });

      // Map the batch results directly
      if (data && data.length > 0) {
        data.forEach((item: { 
          rated_username: string; 
          average_rating: number; 
          total_ratings: number 
        }) => {
          if (item.total_ratings > 0) {
            result[item.rated_username] = {
              rating: item.average_rating.toFixed(1),
              reviewCount: item.total_ratings
            };
          }
        });
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      await errorHandler.handleError(error, {
        operation: 'batch_rating_error',
        component: 'BatchRatingService',
      });
      return {};
    }
  }

  /**
   * Get individual user rating (fallback for single requests)
   */
  async getUserRating(username: string): Promise<{ rating: string; reviewCount: number } | null> {
    const result = await this.getBatchUserRatings([username]);
    return result[username] || null;
  }

  /**
   * Clear cache for specific usernames
   */
  clearCache(usernames?: string[]): void {
    if (usernames) {
      // Clear specific cache entries
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        usernames.some(username => key.includes(username))
      );
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const batchRatingService = BatchRatingService.getInstance();
