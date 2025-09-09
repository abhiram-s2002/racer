import { supabase } from './supabaseClient';

export interface ReportData {
  listing_id?: string;
  request_id?: string;
  seller_username: string;
  reason: string;
  description?: string;
}

export interface HiddenListing {
  id: string;
  listing_id: string;
  created_at: string;
}

export interface HiddenRequest {
  id: string;
  request_id: string;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Report a listing or request for inappropriate content
 */
export const reportListing = async (reportData: ReportData): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        listing_id: reportData.listing_id,
        request_id: reportData.request_id,
        seller_username: reportData.seller_username,
        reason: reportData.reason,
        description: reportData.description,
        status: 'confirmed',
      });

    if (error) {
      console.error('Error reporting content:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error reporting content:', error);
    return { success: false, error: 'Failed to report content' };
  }
};

/**
 * Hide a listing from user's feed
 */
export const hideListing = async (listingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('hidden_listings')
      .upsert({
        user_id: user.id,
        listing_id: listingId,
      }, {
        onConflict: 'user_id,listing_id'
      });

    if (error) {
      console.error('Error hiding listing:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error hiding listing:', error);
    return { success: false, error: 'Failed to hide listing' };
  }
};

/**
 * Hide a request from user's feed
 */
export const hideRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('hidden_requests')
      .upsert({
        user_id: user.id,
        request_id: requestId,
      }, {
        onConflict: 'user_id,request_id'
      });

    if (error) {
      console.error('Error hiding request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error hiding request:', error);
    return { success: false, error: 'Failed to hide request' };
  }
};

/**
 * Block a user
 */
export const blockUser = async (blockedUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('blocked_users')
      .upsert({
        blocker_id: user.id,
        blocked_id: blockedUserId,
      }, {
        onConflict: 'blocker_id,blocked_id'
      });

    if (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, error: 'Failed to block user' };
  }
};

/**
 * Unhide a listing
 */
export const unhideListing = async (listingId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('hidden_listings')
      .delete()
      .eq('user_id', user.id)
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error unhiding listing:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unhiding listing:', error);
    return { success: false, error: 'Failed to unhide listing' };
  }
};

/**
 * Unblock a user
 */
export const unblockUser = async (blockedUserId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedUserId);

    if (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, error: 'Failed to unblock user' };
  }
};

/**
 * Get user's hidden listings
 */
export const getHiddenListings = async (): Promise<{ success: boolean; data?: HiddenListing[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('hidden_listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching hidden listings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching hidden listings:', error);
    return { success: false, error: 'Failed to fetch hidden listings' };
  }
};

/**
 * Get user's blocked users
 */
export const getBlockedUsers = async (): Promise<{ success: boolean; data?: BlockedUser[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked users:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return { success: false, error: 'Failed to fetch blocked users' };
  }
};

/**
 * Check if a user is blocked by the current user
 */
export const isUserBlocked = async (blockedUserId: string): Promise<{ success: boolean; isBlocked?: boolean; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('is_user_blocked', {
        blocker_user_id: user.id,
        blocked_user_id: blockedUserId
      });

    if (error) {
      console.error('Error checking if user is blocked:', error);
      return { success: false, error: error.message };
    }

    return { success: true, isBlocked: data || false };
  } catch (error) {
    console.error('Error checking if user is blocked:', error);
    return { success: false, error: 'Failed to check if user is blocked' };
  }
};

/**
 * Get hidden listing IDs for filtering
 */
export const getHiddenListingIds = async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('get_hidden_listing_ids', {
        user_id: user.id
      });

    if (error) {
      console.error('Error fetching hidden listing IDs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching hidden listing IDs:', error);
    return { success: false, error: 'Failed to fetch hidden listing IDs' };
  }
};

/**
 * Get blocked user IDs for filtering
 */
export const getBlockedUserIds = async (): Promise<{ success: boolean; data?: string[]; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('get_blocked_user_ids', {
        user_id: user.id
      });

    if (error) {
      console.error('Error fetching blocked user IDs:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching blocked user IDs:', error);
    return { success: false, error: 'Failed to fetch blocked user IDs' };
  }
};
