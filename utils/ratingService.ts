import { supabase } from './supabaseClient';
import { errorHandler } from './errorHandler';
import { 
  UserRating, 
  UserRatingStats, 
  RatingEligibility, 
  RatingFormData 
} from './types';

/**
 * Rating service for managing user ratings in the marketplace
 * Handles rating submission, retrieval, and eligibility checks
 */
export class RatingService {
  /**
   * Submit a new rating for a user
   */
  static async submitRating(
    raterUsername: string,
    ratedUsername: string,
    pingId: string,
    ratingData: RatingFormData
  ): Promise<{ success: boolean; error?: string; rating?: UserRating }> {
    try {
      // Prevent self-rating
      if (raterUsername === ratedUsername) {
        return { success: false, error: 'You cannot rate yourself' };
      }

      // Validate rating data
      if (ratingData.rating < 1 || ratingData.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      if (ratingData.review_text && (ratingData.review_text.length < 10 || ratingData.review_text.length > 500)) {
        return { success: false, error: 'Review text must be between 10 and 500 characters' };
      }

      // Check if user can rate
      const eligibility = await this.canRateUser(raterUsername, ratedUsername);
      
      if (!eligibility.can_rate) {
        const errorMessage = eligibility.reason || 'You cannot rate this user at this time';
        return { success: false, error: errorMessage };
      }

      // Check if the current user has already rated this specific ping
      // This prevents duplicate ratings by the same user for the same interaction
      const { data: existingRatings, error: checkError } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('ping_id', pingId)
        .eq('rater_username', raterUsername);
      
      if (checkError) {
        console.error('Error checking existing ratings:', checkError);
        return { success: false, error: 'Failed to check existing ratings' };
      }
      
      if (existingRatings && existingRatings.length > 0) {
        return { success: false, error: 'You have already rated this specific interaction' };
      }

      // Insert the rating
      const { data, error } = await supabase
        .from('user_ratings')
        .insert({
          rater_username: raterUsername,
          rated_username: ratedUsername,
          ping_id: pingId,
          rating: ratingData.rating,
          review_text: ratingData.review_text || null,
          category: ratingData.category
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting rating:', error);
        return { success: false, error: 'Failed to submit rating' };
      }

      // Check for Perfect Seller achievement after successful rating submission
      try {
        await RatingService.checkPerfectSellerAchievement(ratedUsername);
      } catch (error) {
        // Silently handle achievement check errors - don't break rating submission
      }

      return { success: true };
    } catch (error) {
      console.error('Error submitting rating:', error);
      return { success: false, error: 'Failed to submit rating' };
    }
  }

  /**
   * Update an existing rating
   */
  static async updateRating(
    ratingId: string,
    raterUsername: string,
    ratingData: RatingFormData
  ): Promise<{ success: boolean; error?: string; rating?: UserRating }> {
    try {
      // Validate rating data
      if (ratingData.rating < 1 || ratingData.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5' };
      }

      if (ratingData.review_text && (ratingData.review_text.length < 10 || ratingData.review_text.length > 500)) {
        return { success: false, error: 'Review text must be between 10 and 500 characters' };
      }

      // Update the rating
      const { data, error } = await supabase
        .from('user_ratings')
        .update({
          rating: ratingData.rating,
          review_text: ratingData.review_text || null,
          category: ratingData.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', ratingId)
        .eq('rater_username', raterUsername)
        .select()
        .single();

      if (error) {
        console.error('Error updating rating:', error);
        return { success: false, error: 'Failed to update rating' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating rating:', error);
      return { success: false, error: 'Failed to update rating' };
    }
  }

  /**
   * Get rating statistics for a user
   */
  static async getUserRatingStats(username: string): Promise<UserRatingStats | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_rating_stats', { target_username: username });

      if (error) {
        console.error('Error getting user rating stats:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return {
          average_rating: 0,
          total_ratings: 0,
          rating_distribution: {}
        };
      }

      const stats = data[0];
      return {
        average_rating: parseFloat(stats.average_rating) || 0,
        total_ratings: parseInt(stats.total_ratings) || 0,
        rating_distribution: stats.rating_distribution || {}
      };
    } catch (error) {
      console.error('Error getting user rating stats:', error);
      return null;
    }
  }

  /**
   * Check if a user can rate another user
   */
  static async canRateUser(
    raterUsername: string, 
    ratedUsername: string
  ): Promise<RatingEligibility> {
    try {
      const { data, error } = await supabase
        .rpc('can_rate_user', {
          rater_username_param: raterUsername,
          rated_username_param: ratedUsername
        });

      if (error) {
        console.error('❌ [RatingService] Error checking rating eligibility:', error);
        return { can_rate: false, pending_pings: [] };
      }

      if (!data || data.length === 0) {
        console.log('⚠️ [RatingService] No data returned from can_rate_user RPC');
        return { can_rate: false, pending_pings: [] };
      }

      const result = data[0];
      
      return {
        can_rate: result.can_rate || false,
        pending_pings: result.pending_pings || []
      };
    } catch (error) {
      console.error('❌ [RatingService] Exception in canRateUser:', error);
      return { can_rate: false, pending_pings: [] };
    }
  }

  /**
   * Get a specific rating by ping ID for a specific user
   */
  static async getRatingByPingId(pingId: string, raterUsername?: string): Promise<UserRating | null> {
    try {
      let query = supabase
        .from('user_ratings')
        .select('*')
        .eq('ping_id', pingId);
      
      // If raterUsername is provided, filter by it to get the specific user's rating
      if (raterUsername) {
        query = query.eq('rater_username', raterUsername);
      }
      
      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('❌ [RatingService] Error getting rating by ping ID:', error);
        return null;
      }

      return data as UserRating;
    } catch (error) {
      console.error('❌ [RatingService] Exception in getRatingByPingId:', error);
      return null;
    }
  }

  /**
   * Get all ratings for a user
   */
  static async getUserRatings(
    username: string, 
    page = 1, 
    pageSize = 20
  ): Promise<{ ratings: UserRating[]; total: number; hasMore: boolean }> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('user_ratings')
        .select('*', { count: 'exact' })
        .eq('rated_username', username)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error getting user ratings:', error);
        return { ratings: [], total: 0, hasMore: false };
      }

      const total = count || 0;
      const hasMore = total > to + 1;

      return {
        ratings: (data as UserRating[]) || [],
        total,
        hasMore
      };
    } catch (error) {
      console.error('Error getting user ratings:', error);
      return { ratings: [], total: 0, hasMore: false };
    }
  }

  /**
   * Delete a rating
   */
  static async deleteRating(ratingId: string, raterUsername: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_ratings')
        .delete()
        .eq('id', ratingId)
        .eq('rater_username', raterUsername);

      if (error) {
        console.error('Error deleting rating:', error);
        return { success: false, error: 'Failed to delete rating' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting rating:', error);
      return { success: false, error: 'Failed to delete rating' };
    }
  }

  /**
   * Get recent ratings for a user (last 5)
   */
  static async getRecentUserRatings(username: string): Promise<UserRating[]> {
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('rated_username', username)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error getting recent user ratings:', error);
        return [];
      }

      return (data as UserRating[]) || [];
    } catch (error) {
      console.error('Error getting recent user ratings:', error);
      return [];
    }
  }

  /**
   * Get rating summary for multiple users (for listing cards)
   */
  static async getUsersRatingSummary(usernames: string[]): Promise<Record<string, UserRatingStats>> {
    try {
      const summaries: Record<string, UserRatingStats> = {};
      
      // Get stats for each user
      await Promise.all(
        usernames.map(async (username) => {
          const stats = await this.getUserRatingStats(username);
          if (stats) {
            summaries[username] = stats;
          }
        })
      );

      return summaries;
    } catch (error) {
      console.error('Error getting users rating summary:', error);
      return {};
    }
  }

  /**
   * Check and award Perfect Seller achievement (10 consecutive 5-star ratings)
   */
  static async checkPerfectSellerAchievement(ratedUsername: string): Promise<void> {
    try {
      // Get user's current achievement status
      const { data: userAchievement } = await supabase
        .from('user_achievements')
        .select('progress, completed')
        .eq('username', ratedUsername)
        .eq('achievement_id', 'perfect_seller')
        .single();

      // If already completed, skip
      if (userAchievement?.completed) {
        return;
      }

      // Get all ratings for this user (ordered by most recent first)
      const { data: allRatings } = await supabase
        .from('user_ratings')
        .select('rating')
        .eq('rated_username', ratedUsername)
        .order('created_at', { ascending: false });

      if (!allRatings || allRatings.length === 0) {
        return;
      }

      // Count consecutive 5-star ratings from the most recent
      let consecutiveFiveStars = 0;
      for (const rating of allRatings) {
        if (rating.rating === 5) {
          consecutiveFiveStars++;
        } else {
          break; // Stop counting when we hit a non-5-star rating
        }
      }

      // Update achievement progress (cap at 10)
      const progress = Math.min(consecutiveFiveStars, 10);
      const { updateUserAchievementProgressSafe } = await import('./rewardsSupabase');
      await updateUserAchievementProgressSafe(ratedUsername, 'perfect_seller', progress);
    } catch (error) {
      console.error('Error in checkPerfectSellerAchievement:', error);
    }
  }
}

export default RatingService;
