// Unified Daily Check-in System
// This replaces the complex verified/non-verified logic with a single, clean function

import { supabase } from './supabaseClient';

export interface UnifiedCheckinResult {
  success: boolean;
  reward_amount: number;
  base_reward: number;
  streak_bonus: number;
  is_verified: boolean;
  new_balance: number;
  message: string;
  already_checked_in: boolean;
  error?: string;
}

/**
 * Process daily check-in for any user (verified or non-verified)
 * This is the single function that handles all check-in logic
 */
export async function processDailyCheckin(
  username: string,
  userId?: string
): Promise<UnifiedCheckinResult> {
  try {
    const { data, error } = await supabase.rpc('process_daily_checkin', {
      p_username: username,
      p_user_id: userId || null
    });

    if (error) {
      // Only log in development
      if (__DEV__) {
        console.error('Error processing daily check-in:', error);
      }
      return {
        success: false,
        reward_amount: 0,
        base_reward: 0,
        streak_bonus: 0,
        is_verified: false,
        new_balance: 0,
        message: 'Failed to process check-in',
        already_checked_in: false,
        error: error.message
      };
    }

    return data;
  } catch (error) {
    // Only log in development
    if (__DEV__) {
      console.error('Error in processDailyCheckin:', error);
    }
    return {
      success: false,
      reward_amount: 0,
      base_reward: 0,
      streak_bonus: 0,
      is_verified: false,
      new_balance: 0,
      message: 'Failed to process check-in',
      already_checked_in: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if user has already checked in today
 */
export async function hasCheckedInToday(username: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('id')
      .eq('username', username)
      .eq('checkin_date', new Date().toISOString().split('T')[0])
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking daily check-in:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasCheckedInToday:', error);
    return false;
  }
}
