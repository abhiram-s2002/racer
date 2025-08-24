import { supabase } from './supabaseClient';
import { errorHandler } from './errorHandler';

// Define rating types locally since they're not exported from types
interface UserRating {
  id: string;
  rater_username: string;
  rated_username: string;
  ping_id: string;
  rating: number;
  review_text?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface UserRatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: Record<string, number>;
}

interface RatingEligibility {
  can_rate: boolean;
  pending_pings: Array<{
    ping_id: string;
    listing_title: string;
    created_at: string;
  }>;
}

interface RatingFormData {
  rating: number;
  review_text?: string;
  category: 'overall' | 'communication' | 'responsiveness' | 'helpfulness';
}

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
        return { success: false, error: 'You cannot rate this user at this time' };
      }

      // Check if rating already exists for this ping
      const existingRating = await this.getRatingByPingId(pingId);
      if (existingRating) {
        return { success: false, error: 'You have already rated this interaction' };
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
          rater_username: raterUsername, 
          rated_username: ratedUsername 
        });

      if (error) {
        console.error('Error checking rating eligibility:', error);
        return { can_rate: false, pending_pings: [] };
      }

      if (!data || data.length === 0) {
        return { can_rate: false, pending_pings: [] };
      }

      const result = data[0];
      return {
        can_rate: result.can_rate || false,
        pending_pings: result.pending_pings || []
      };
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
      return { can_rate: false, pending_pings: [] };
    }
  }

  /**
   * Get a specific rating by ping ID
   */
  static async getRatingByPingId(pingId: string): Promise<UserRating | null> {
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select('*')
        .eq('ping_id', pingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error getting rating by ping ID:', error);
        return null;
      }

      return data as UserRating;
    } catch (error) {
      console.error('Error getting rating by ping ID:', error);
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
}

export default RatingService;
