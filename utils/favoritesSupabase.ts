import { supabase } from './supabaseClient';

export interface FavoriteListing {
  id: string;
  title: string;
  description: string;
  price: number;
  price_unit: string;
  category: string;
  username: string;
  name: string;
  avatar_url: string;
  location_display: string;
  latitude: number;
  longitude: number;
  thumbnail_images: string[];
  preview_images: string[];
  created_at: string;
  view_count: number;
  ping_count: number;
  expires_at: string;
  favorited_at: string;
}

export interface FavoritesResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface FavoritesStatusResult {
  success: boolean;
  favorites?: { [listingId: string]: boolean };
  error?: string;
}

/**
 * Add a listing to user's favorites
 */
export const addToFavorites = async (
  userId: string,
  username: string,
  listingId: string
): Promise<FavoritesResult> => {
  try {
    const { data, error } = await supabase.rpc('add_to_favorites', {
      p_user_id: userId,
      p_username: username,
      p_listing_id: listingId
    });

    if (error) {
      console.error('Error adding to favorites:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      message: data?.message || 'Listing added to favorites'
    };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add to favorites'
    };
  }
};

/**
 * Remove a listing from user's favorites
 */
export const removeFromFavorites = async (
  userId: string,
  listingId: string
): Promise<FavoritesResult> => {
  try {
    const { data, error } = await supabase.rpc('remove_from_favorites', {
      p_user_id: userId,
      p_listing_id: listingId
    });

    if (error) {
      console.error('Error removing from favorites:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      message: data?.message || 'Listing removed from favorites'
    };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove from favorites'
    };
  }
};

/**
 * Check if a listing is favorited by user
 */
export const isListingFavorited = async (
  userId: string,
  listingId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_listing_favorited', {
      p_user_id: userId,
      p_listing_id: listingId
    });

    if (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};

/**
 * Get user's favorite listings
 */
export const getUserFavorites = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ success: boolean; favorites?: FavoriteListing[]; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('get_user_favorites', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Error fetching favorites:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      favorites: data || []
    };
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch favorites'
    };
  }
};

/**
 * Get favorite status for multiple listings (optimized for home feed)
 */
export const getFavoritesStatus = async (
  userId: string,
  listingIds: string[]
): Promise<FavoritesStatusResult> => {
  try {
    if (listingIds.length === 0) {
      return {
        success: true,
        favorites: {}
      };
    }

    const { data, error } = await supabase.rpc('get_favorites_status', {
      p_user_id: userId,
      p_listing_ids: listingIds
    });

    if (error) {
      console.error('Error fetching favorites status:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Convert array to object for easier lookup
    const favoritesMap: { [listingId: string]: boolean } = {};
    if (data) {
      data.forEach((item: { listing_id: string; is_favorited: boolean }) => {
        favoritesMap[item.listing_id] = item.is_favorited;
      });
    }

    return {
      success: true,
      favorites: favoritesMap
    };
  } catch (error) {
    console.error('Error fetching favorites status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch favorites status'
    };
  }
};

/**
 * Toggle favorite status for a listing
 */
export const toggleFavorite = async (
  userId: string,
  username: string,
  listingId: string,
  currentStatus: boolean
): Promise<FavoritesResult> => {
  if (currentStatus) {
    return await removeFromFavorites(userId, listingId);
  } else {
    return await addToFavorites(userId, username, listingId);
  }
};
