import { supabase } from './supabaseClient';

// ============================================================================
// TYPES (OPTIMIZED)
// ============================================================================

export interface UserRewards {
  id: string;
  username: string;
  total_omni_earned: number;
  total_omni_spent: number;
  current_balance: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  username: string;
  checkin_date: string;
  omni_earned: number;
  streak_day: number;
  created_at: string;
}

export interface UserStreak {
  id: string;
  username: string;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  weekly_rewards: number;
  monthly_rewards: number;
  last_weekly_reset: string;
  last_monthly_reset: string;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_username: string;
  referred_username: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired';
  omni_rewarded: number;
  completed_at: string | null;
  created_at: string;
}

export interface UserReferralCode {
  id: string;
  username: string;
  referral_code: string;
  total_referrals: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  max_progress: number;
  omni_reward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  username: string;
  achievement_id: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  omni_earned: number;
  created_at: string;
  updated_at: string;
}

export interface RewardTransaction {
  id: string;
  username: string;
  transaction_type: 'earned' | 'spent' | 'bonus' | 'referral' | 'achievement' | 'checkin';
  amount: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface UserRewardsSummary {
  total_omni_earned: number;
  current_balance: number;
  current_streak: number;
  longest_streak: number;
  total_achievements: number;
  completed_achievements: number;
  total_referrals: number;
  completed_referrals: number;
}

// ============================================================================
// USER REWARDS (OPTIMIZED)
// ============================================================================

export async function getUserRewards(username: string): Promise<UserRewards | null> {
  try {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user rewards:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserRewards:', error);
    return null;
  }
}

export async function createUserRewards(username: string): Promise<UserRewards | null> {
  try {
    const { data, error } = await supabase
      .from('user_rewards')
      .insert([{ username }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user rewards:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserRewards:', error);
    return null;
  }
}

// ============================================================================
// DAILY CHECK-INS (OPTIMIZED)
// ============================================================================

export async function getDailyCheckins(username: string, limit = 30): Promise<DailyCheckin[]> {
  try {
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('username', username)
      .order('checkin_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching daily checkins:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDailyCheckins:', error);
    return [];
  }
}

export async function createDailyCheckin(username: string, checkinDate: string, omniEarned: number): Promise<DailyCheckin | null> {
  try {
    const { data, error } = await supabase
      .from('daily_checkins')
      .insert([{
        username,
        checkin_date: checkinDate,
        omni_earned: omniEarned
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating daily checkin:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDailyCheckin:', error);
    return null;
  }
}

export async function hasCheckedInToday(username: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('id')
      .eq('username', username)
      .eq('checkin_date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking daily checkin:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasCheckedInToday:', error);
    return false;
  }
}

// ============================================================================
// USER STREAKS (OPTIMIZED)
// ============================================================================

export async function getUserStreak(username: string): Promise<UserStreak | null> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user streak:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserStreak:', error);
    return null;
  }
}

export async function createUserStreak(username: string): Promise<UserStreak | null> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .insert([{ username }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user streak:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserStreak:', error);
    return null;
  }
}

// ============================================================================
// REFERRALS (OPTIMIZED)
// ============================================================================

export async function getUserReferralCode(username: string): Promise<UserReferralCode | null> {
  try {
    const { data, error } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('Error fetching user referral code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserReferralCode:', error);
    return null;
  }
}

export async function createUserReferralCode(username: string, referralCode: string): Promise<UserReferralCode | null> {
  try {
    const { data, error } = await supabase
      .from('user_referral_codes')
      .insert([{
        username,
        referral_code: referralCode
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user referral code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserReferralCode:', error);
    return null;
  }
}

export async function getReferralsByUser(username: string): Promise<Referral[]> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getReferralsByUser:', error);
    return [];
  }
}

export async function createReferral(referrerUsername: string, referredUsername: string, referralCode: string): Promise<Referral | null> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .insert([{
        referrer_username: referrerUsername,
        referred_username: referredUsername,
        referral_code: referralCode
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating referral:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createReferral:', error);
    return null;
  }
}

export async function getReferralByCode(referralCode: string): Promise<UserReferralCode | null> {
  try {
    const { data, error } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('referral_code', referralCode)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching referral by code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getReferralByCode:', error);
    return null;
  }
}

// ============================================================================
// ACHIEVEMENTS (OPTIMIZED)
// ============================================================================

export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllAchievements:', error);
    return [];
  }
}

export async function getUserAchievements(username: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (
          id,
          title,
          description,
          icon,
          max_progress,
          omni_reward,
          rarity
        )
      `)
      .eq('username', username)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    return [];
  }
}

export async function getUserAchievementsSafe(username: string): Promise<UserAchievement[]> {
  try {
    const achievements = await getUserAchievements(username);
    
    // If no achievements exist, initialize them
    if (achievements.length === 0) {
      console.log('No user achievements found, initializing...');
      return await initializeUserAchievements(username);
    }
    
    return achievements;
  } catch (error) {
    console.error('Error in getUserAchievementsSafe:', error);
    return [];
  }
}

export async function createUserAchievement(username: string, achievementId: string): Promise<UserAchievement | null> {
  try {
    // Get achievement details
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('max_progress, omni_reward')
      .eq('id', achievementId)
      .single();

    if (achievementError) {
      console.error('Error fetching achievement:', achievementError);
      return null;
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .insert([{
        username,
        achievement_id: achievementId,
        max_progress: achievement.max_progress
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating user achievement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserAchievement:', error);
    return null;
  }
}

export async function updateUserAchievementProgress(username: string, achievementId: string, newProgress: number): Promise<UserAchievement | null> {
  try {
    // First, ensure the user has all achievements initialized
    await initializeUserAchievements(username);
    
    // Get current achievement progress
    const { data: currentAchievement, error: fetchError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('username', username)
      .eq('achievement_id', achievementId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching current achievement:', fetchError);
      return null;
    }

    if (!currentAchievement) {
      console.error('Achievement record not found after initialization:', achievementId);
      return null;
    }

    // Get achievement details for max progress
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('max_progress, omni_reward')
      .eq('id', achievementId)
      .single();

    if (achievementError) {
      console.error('Error fetching achievement details:', achievementError);
      return null;
    }

    const updatedProgress = Math.min(newProgress, achievement.max_progress);
    const newlyCompleted = !currentAchievement.completed && updatedProgress >= achievement.max_progress;

    const { data, error } = await supabase
      .from('user_achievements')
      .update({
        progress: updatedProgress,
        completed: updatedProgress >= achievement.max_progress,
        omni_earned: newlyCompleted ? achievement.omni_reward : currentAchievement.omni_earned,
        updated_at: new Date().toISOString()
      })
      .eq('username', username)
      .eq('achievement_id', achievementId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user achievement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserAchievementProgress:', error);
    return null;
  }
}

// Safe version that handles missing achievements gracefully
export async function updateUserAchievementProgressSafe(username: string, achievementId: string, newProgress: number): Promise<UserAchievement | null> {
  try {
    // Get achievement details for max progress first
    const { data: achievement, error: achievementError } = await supabase
      .from('achievements')
      .select('max_progress, omni_reward')
      .eq('id', achievementId)
      .single();

    if (achievementError) {
      console.error('Error fetching achievement details:', achievementError);
      return null;
    }

    const updatedProgress = Math.min(newProgress, achievement.max_progress);

    // Use UPSERT to handle both insert and update cases
    const { data, error } = await supabase
      .from('user_achievements')
      .upsert({
        username,
        achievement_id: achievementId,
        progress: updatedProgress,
        max_progress: achievement.max_progress,
        completed: updatedProgress >= achievement.max_progress,
        omni_earned: updatedProgress >= achievement.max_progress ? achievement.omni_reward : 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'username,achievement_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user achievement:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateUserAchievementProgressSafe:', error);
    return null;
  }
}

// ============================================================================
// REWARD TRANSACTIONS (OPTIMIZED)
// ============================================================================

export async function getRewardTransactions(username: string, limit = 50): Promise<RewardTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reward transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRewardTransactions:', error);
    return [];
  }
}

export async function createRewardTransaction(
  username: string,
  transactionType: RewardTransaction['transaction_type'],
  amount: number,
  description: string,
  referenceId?: string,
  referenceType?: string
): Promise<RewardTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('reward_transactions')
      .insert([{
        username,
        transaction_type: transactionType,
        amount,
        description,
        reference_id: referenceId,
        reference_type: referenceType
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reward transaction:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createRewardTransaction:', error);
    return null;
  }
}

// ============================================================================
// OPTIMIZED COMPOSITE FUNCTIONS
// ============================================================================

export async function getCompleteRewardsData(username: string) {
  try {
    // Get all rewards data in parallel with optimized queries
    const [
      userRewards,
      userStreak,
      userReferralCode,
      userAchievements,
      dailyCheckins,
      referrals,
      transactions
    ] = await Promise.all([
      getUserRewards(username),
      getUserStreak(username),
      getUserReferralCode(username),
      getUserAchievements(username),
      getDailyCheckins(username, 7), // Last 7 days only
      getReferralsByUser(username),
      getRewardTransactions(username, 10) // Last 10 transactions only
    ]);

    return {
      userRewards,
      userStreak,
      userReferralCode,
      userAchievements,
      dailyCheckins,
      referrals,
      transactions
    };
  } catch (error) {
    console.error('Error in getCompleteRewardsData:', error);
    return null;
  }
}

export async function initializeUserRewards(username: string) {
  try {
    // Validate username is not empty
    if (!username || username.trim() === '') {
      console.error('Cannot initialize rewards - username is empty');
      return null;
    }

    console.log('Initializing rewards for user:', username);
    
    // Check if user exists in users table first
    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();
    
    if (userError || !userExists) {
      console.error('User does not exist:', username);
      return null;
    }

    // Initialize all rewards tables in parallel
    const [userRewards, userStreak, userReferralCode] = await Promise.allSettled([
      initializeUserRewardsRecord(username),
      initializeUserStreakRecord(username),
      initializeUserReferralCodeRecord(username),
      initializeUserAchievements(username)
    ]);

    // Handle results
    const rewards = userRewards.status === 'fulfilled' ? userRewards.value : null;
    const streak = userStreak.status === 'fulfilled' ? userStreak.value : null;
    const referralCode = userReferralCode.status === 'fulfilled' ? userReferralCode.value : null;

    // Don't create welcome bonus transaction - new users start with 0 OMNI
    // if (rewards) {
    //   await createRewardTransaction(
    //     username,
    //     'bonus',
    //     50,
    //     'Welcome bonus for new user',
    //     undefined,
    //     'welcome'
    //   );
    // }

    return {
      userRewards: rewards,
      userStreak: streak,
      userReferralCode: referralCode
    };
  } catch (error) {
    console.error('Error initializing user rewards:', error);
    return null;
  }
}

async function initializeUserRewardsRecord(username: string): Promise<UserRewards | null> {
  try {
    // Try to get existing record first
    const existing = await getUserRewards(username);
    if (existing) {
      return existing;
    }

    // Create new record
    return await createUserRewards(username);
  } catch (error) {
    console.error('Error initializing user rewards record:', error);
    return null;
  }
}

async function initializeUserStreakRecord(username: string): Promise<UserStreak | null> {
  try {
    // Try to get existing record first
    const existing = await getUserStreak(username);
    if (existing) {
      return existing;
    }

    // Create new record
    return await createUserStreak(username);
  } catch (error) {
    console.error('Error initializing user streak record:', error);
    return null;
  }
}

async function initializeUserReferralCodeRecord(username: string): Promise<UserReferralCode | null> {
  try {
    // Try to get existing record first
    const existing = await getUserReferralCode(username);
    if (existing) {
      return existing;
    }

    // Generate referral code
    const referralCode = `OMNI-${username.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    // Create new record
    return await createUserReferralCode(username, referralCode);
  } catch (error) {
    console.error('Error initializing user referral code record:', error);
    return null;
  }
}

async function initializeUserAchievements(username: string): Promise<UserAchievement[]> {
  try {
    // Get all active achievements
    const achievements = await getAllAchievements();
    if (!achievements.length) {
      console.log('No achievements found to initialize');
      return [];
    }

    // Get existing user achievements
    const existingAchievements = await getUserAchievements(username);
    const existingIds = new Set(existingAchievements.map(ua => ua.achievement_id));

    // Find achievements that need to be initialized
    const achievementsToCreate = achievements.filter(achievement => 
      achievement.is_active && !existingIds.has(achievement.id)
    );

    if (achievementsToCreate.length === 0) {
      return existingAchievements;
    }

    // Create missing achievements in parallel
    const creationPromises = achievementsToCreate.map(achievement =>
      createUserAchievement(username, achievement.id)
    );

    const newAchievements = await Promise.allSettled(creationPromises);
    const createdAchievements = newAchievements
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => (result as PromiseFulfilledResult<UserAchievement>).value);

    return [...existingAchievements, ...createdAchievements];
  } catch (error) {
    console.error('Error initializing user achievements:', error);
    return [];
  }
}

// ============================================================================
// IMPROVED FETCH FUNCTIONS WITH AUTO-INITIALIZATION
// ============================================================================

export async function getUserRewardsSafe(username: string): Promise<UserRewards | null> {
  try {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record doesn't exist, initialize it
        console.log('User rewards record not found, initializing...');
        return await initializeUserRewardsRecord(username);
      }
      console.error('Error fetching user rewards:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserRewardsSafe:', error);
    return null;
  }
}

export async function getUserStreakSafe(username: string): Promise<UserStreak | null> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record doesn't exist, initialize it
        console.log('User streak record not found, initializing...');
        return await initializeUserStreakRecord(username);
      }
      console.error('Error fetching user streak:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserStreakSafe:', error);
    return null;
  }
}

export async function getUserReferralCodeSafe(username: string): Promise<UserReferralCode | null> {
  try {
    const { data, error } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record doesn't exist, initialize it
        console.log('User referral code record not found, initializing...');
        return await initializeUserReferralCodeRecord(username);
      }
      console.error('Error fetching user referral code:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserReferralCodeSafe:', error);
    return null;
  }
}

// ============================================================================
// COMPLETE DATA FETCHING WITH AUTO-INITIALIZATION
// ============================================================================

export async function getCompleteRewardsDataSafe(username: string) {
  try {
    // Validate username is not empty
    if (!username || username.trim() === '') {
      console.error('Cannot get complete rewards data - username is empty');
      return null;
    }

    // Use safe functions that auto-initialize missing records
    const [userRewards, userStreak, userReferralCode, userAchievements, dailyCheckins, referrals, transactions] = await Promise.allSettled([
      getUserRewardsSafe(username),
      getUserStreakSafe(username),
      getUserReferralCodeSafe(username),
      getUserAchievementsSafe(username),
      getDailyCheckins(username),
      getReferralsByUser(username),
      getRewardTransactions(username)
    ]);

    return {
      userRewards: userRewards.status === 'fulfilled' ? userRewards.value : null,
      userStreak: userStreak.status === 'fulfilled' ? userStreak.value : null,
      userReferralCode: userReferralCode.status === 'fulfilled' ? userReferralCode.value : null,
      userAchievements: userAchievements.status === 'fulfilled' ? userAchievements.value : [],
      dailyCheckins: dailyCheckins.status === 'fulfilled' ? dailyCheckins.value : [],
      referrals: referrals.status === 'fulfilled' ? referrals.value : [],
      transactions: transactions.status === 'fulfilled' ? transactions.value : []
    };
  } catch (error) {
    console.error('Error in getCompleteRewardsDataSafe:', error);
    return null;
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZED FUNCTIONS
// ============================================================================

export async function getUserRewardsSummary(username: string): Promise<UserRewardsSummary | null> {
  try {
    // Get all rewards data in parallel
    const [
      userRewards,
      userStreak,
      userAchievements,
      referrals
    ] = await Promise.all([
      getUserRewards(username),
      getUserStreak(username),
      getUserAchievements(username),
      getReferralsByUser(username)
    ]);

    return {
      total_omni_earned: userRewards?.total_omni_earned || 0,
      current_balance: userRewards?.current_balance || 0,
      current_streak: userStreak?.current_streak || 0,
      longest_streak: userStreak?.longest_streak || 0,
      total_achievements: userAchievements?.length || 0,
      completed_achievements: userAchievements?.filter(ua => ua.completed).length || 0,
      total_referrals: referrals?.length || 0,
      completed_referrals: referrals?.filter(r => r.status === 'completed').length || 0
    };
  } catch (error) {
    console.error('Error in getUserRewardsSummary:', error);
    return null;
  }
}

export async function batchUpdateAchievements(updates: Array<{username: string, achievementId: string, progress: number}>) {
  try {
    // Batch update achievements for better performance
    const promises = updates.map(update => 
      updateUserAchievementProgressSafe(update.username, update.achievementId, update.progress)
    );
    
    const results = await Promise.all(promises);
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Error in batchUpdateAchievements:', error);
    return [];
  }
}

export async function getRecentActivity(username: string, days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('reward_transactions')
      .select('*')
      .eq('username', username)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return [];
  }
}

// ============================================================================
// WELCOME ACHIEVEMENTS
// ============================================================================

export async function awardWelcomeAchievements(username: string) {
  try {
    // Check if user already has these achievements
    const { data: existingAchievements, error } = await supabase
      .from('user_achievements')
      .select('achievement_id, completed')
      .eq('username', username)
      .in('achievement_id', ['welcome_bonus', 'early_adopter']);

    if (error) {
      console.error('Error checking existing achievements:', error);
      return false;
    }

    const existingIds = new Set(existingAchievements?.map(a => a.achievement_id) || []);
    const completedIds = new Set(existingAchievements?.filter(a => a.completed).map(a => a.achievement_id) || []);

    // Award Welcome Bonus if not completed (but don't give extra OMNI since it's already given as direct bonus)
    if (!completedIds.has('welcome_bonus')) {
      await updateUserAchievementProgressSafe(username, 'welcome_bonus', 1);
      // Don't create reward transaction since welcome bonus is already given in initializeUserRewards
      console.log('Welcome Bonus achievement marked as completed for:', username);
    }

    // Early Adopter achievement - only mark as completed, don't award OMNI automatically
    // Check if user joined in the first month (assuming app launched in July 2025)
    const userJoinDate = new Date();
    const isEarlyAdopter = userJoinDate.getTime() <= new Date('2025-07-31').getTime();

    // Mark Early Adopter as completed if applicable, but don't give OMNI automatically
    if (isEarlyAdopter && !completedIds.has('early_adopter')) {
      await updateUserAchievementProgressSafe(username, 'early_adopter', 1);
      // Don't create reward transaction - let users earn this through gameplay
      console.log('Early Adopter achievement marked as completed for:', username);
    }

    return true;
  } catch (error) {
    console.error('Error awarding welcome achievements:', error);
    return false;
  }
}

// ============================================================================
// CACHE MANAGEMENT (FOR FUTURE SCALING)
// ============================================================================

// Cache keys for future Redis implementation
export const CACHE_KEYS = {
  USER_REWARDS: (username: string) => `rewards:${username}`,
  USER_STREAK: (username: string) => `streak:${username}`,
  USER_ACHIEVEMENTS: (username: string) => `achievements:${username}`,
  USER_REFERRALS: (username: string) => `referrals:${username}`,
  DAILY_CHECKINS: (username: string) => `checkins:${username}`,
  REWARDS_SUMMARY: (username: string) => `summary:${username}`,
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  USER_REWARDS: 300, // 5 minutes
  USER_STREAK: 60,   // 1 minute
  USER_ACHIEVEMENTS: 600, // 10 minutes
  USER_REFERRALS: 300, // 5 minutes
  DAILY_CHECKINS: 60, // 1 minute
  REWARDS_SUMMARY: 300, // 5 minutes
} as const; 