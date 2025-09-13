/**
 * Phone Sharing Utility Functions
 * Handles phone number sharing using the new unlock system
 */

import { supabase } from './supabaseClient';

export type PhoneAccessInfo = {
  phone: string | null;
  canShare: boolean;
  unlockedAt?: string;
};

export type PhoneAccessUser = {
  unlocked_by_id: string;
  unlocked_by_username: string;
  unlocked_by_name: string;
  unlocked_at: string;
};

/**
 * Check if a user can see another user's phone using the unlock system
 * @param phoneOwnerId - The user whose phone we want to access
 * @param requestingUserId - The user requesting access
 * @returns Promise<boolean> - Whether the phone can be shared
 */
export async function canSeePhone(
  phoneOwnerId: string,
  requestingUserId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('can_see_phone', {
        phone_owner_id_param: phoneOwnerId,
        requesting_user_id_param: requestingUserId
      });

    if (error) {
      console.error('Error checking phone access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in canSeePhone:', error);
    return false;
  }
}

/**
 * Grant phone access to a user (when ping is accepted)
 * @param phoneOwnerId - The user whose phone is being shared
 * @param unlockedById - The user who gets access
 * @returns Promise<boolean> - Whether access was granted successfully
 */
export async function grantPhoneAccess(
  phoneOwnerId: string,
  unlockedById: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('grant_phone_access', {
        phone_owner_id_param: phoneOwnerId,
        unlocked_by_id_param: unlockedById
      });

    if (error) {
      console.error('Error granting phone access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in grantPhoneAccess:', error);
    return false;
  }
}

/**
 * Revoke phone access from a user
 * @param phoneOwnerId - The user whose phone access is being revoked
 * @param unlockedById - The user losing access
 * @returns Promise<boolean> - Whether access was revoked successfully
 */
export async function revokePhoneAccess(
  phoneOwnerId: string,
  unlockedById: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('revoke_phone_access', {
        phone_owner_id_param: phoneOwnerId,
        unlocked_by_id_param: unlockedById
      });

    if (error) {
      console.error('Error revoking phone access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in revokePhoneAccess:', error);
    return false;
  }
}

/**
 * Get list of users who have access to a phone
 * @param phoneOwnerId - The user whose phone access list we want
 * @returns Promise<PhoneAccessUser[]> - List of users with access
 */
export async function getPhoneAccessList(phoneOwnerId: string): Promise<PhoneAccessUser[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_phone_access_list', {
        phone_owner_id_param: phoneOwnerId
      });

    if (error) {
      console.error('Error getting phone access list:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPhoneAccessList:', error);
    return [];
  }
}

/**
 * Get user's phone number with sharing permission check using unlock system
 * @param phoneOwnerId - The user ID whose phone we want to access
 * @param requestingUserId - The user requesting the phone number
 * @returns Promise<PhoneAccessInfo> - Phone access information
 */
export async function getPhoneWithPermission(
  phoneOwnerId: string,
  requestingUserId: string
): Promise<PhoneAccessInfo> {
  try {
    // Check if the requesting user can see the phone
    const canShare = await canSeePhone(phoneOwnerId, requestingUserId);
    
    if (!canShare) {
      return { phone: null, canShare: false };
    }

    // Get the phone number
    const { data: user, error } = await supabase
      .from('users')
      .select('phone')
      .eq('id', phoneOwnerId)
      .single();

    if (error || !user) {
      console.error('Error fetching user phone:', error);
      return { phone: null, canShare: false };
    }

    return { phone: user.phone, canShare: true };
  } catch (error) {
    console.error('Error in getPhoneWithPermission:', error);
    return { phone: null, canShare: false };
  }
}
