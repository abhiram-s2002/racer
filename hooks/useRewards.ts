import { useState, useEffect, useCallback } from 'react';
import {
  getUserRewardsSafe,
  getUserStreakSafe,
  getUserReferralCodeSafe,
  getUserAchievementsSafe,
  createDailyCheckin,
  updateUserAchievementProgressSafe,
  createRewardTransaction,
  getCompleteRewardsDataSafe,
  initializeUserRewards,
  hasCheckedInToday,
  getRewardTransactions,
  batchUpdateAchievements,
  getRecentActivity,
  getReferralCommissions,
  getReferralCommissionStats,
  purchaseVerificationWithOmni,
  canAffordVerification,
  isUserCurrentlyVerified,
  type UserRewards,
  type UserStreak,
  type UserReferralCode,
  type UserAchievement,
  type DailyCheckin,
  type Referral,
  type RewardTransaction,
  type UserRewardsSummary,
  type OmniVerificationPurchaseResult,
  type OmniVerificationAffordability,
} from '@/utils/rewardsSupabase';
import { processDailyCheckin as unifiedProcessDailyCheckin } from '@/utils/unifiedCheckin';

import { type ReferralCommission } from '@/utils/types';

export function useRewards(username: string, userId?: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Rewards data
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [userReferralCode, setUserReferralCode] = useState<UserReferralCode | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckin[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [rewardsSummary, setRewardsSummary] = useState<UserRewardsSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<RewardTransaction[]>([]);
  const [referralCommissions, setReferralCommissions] = useState<ReferralCommission[]>([]);
  const [commissionStats, setCommissionStats] = useState({ totalCommissions: 0, commissionsByType: {} });

  // Load all rewards data
  const loadRewardsData = useCallback(async () => {
    if (!username || username.trim() === '') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Use the safe function that auto-initializes missing records
      const completeData = await getCompleteRewardsDataSafe(username);
      
      if (completeData) {
        setUserRewards(completeData.userRewards);
        setUserStreak(completeData.userStreak);
        setUserReferralCode(completeData.userReferralCode);
        setUserAchievements(completeData.userAchievements);
        setDailyCheckins(completeData.dailyCheckins);
        setReferrals(completeData.referrals);
        setTransactions(completeData.transactions);
      } else {
        // Fallback: try to initialize rewards data for new user
        const initData = await initializeUserRewards(username);
        if (initData) {
          setUserRewards(initData.userRewards);
          setUserStreak(initData.userStreak);
          setUserReferralCode(initData.userReferralCode);
        }
      }

      // Load recent activity separately for better UX
      const activity = await getRecentActivity(username, 7);
      setRecentActivity(activity);

      // Load referral commissions
      const [commissions, stats] = await Promise.all([
        getReferralCommissions(username),
        getReferralCommissionStats(username)
      ]);
      setReferralCommissions(commissions);
      setCommissionStats(stats);
    } catch (err) {
      setError('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Refresh rewards data
  const refreshRewards = useCallback(async () => {
    if (!username || username.trim() === '') {
      return;
    }

    try {
      setRefreshing(true);
      await loadRewardsData();
    } catch (err) {
      setError('Failed to refresh rewards');
    } finally {
      setRefreshing(false);
    }
  }, [username, loadRewardsData]);

  // Daily check-in with verification bonus
  const performDailyCheckin = useCallback(async () => {
    if (!username) return false;

    try {
      const result = await unifiedProcessDailyCheckin(username, userId);
      
      if (result.success) {
        // Reload data to get updated streak and balance
        await loadRewardsData();
        return true;
      } else {
        // Only log in development
        if (__DEV__) {
          console.error('Daily check-in failed:', result.error);
        }
        return false;
      }
    } catch (error) {
      // Only log in development
      if (__DEV__) {
        console.error('Error in performDailyCheckin:', error);
      }
      return false;
    }
  }, [username, userId, loadRewardsData]);

  // Update achievement progress
  const updateAchievement = useCallback(async (achievementId: string, newProgress: number) => {
    if (!username) return false;

    try {
      const updatedAchievement = await updateUserAchievementProgressSafe(username, achievementId, newProgress);
      if (updatedAchievement) {
        // Reload achievements to get updated data
        const achievements = await getUserAchievementsSafe(username);
        setUserAchievements(achievements);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to update achievement');
      return false;
    }
  }, [username]);

  // Batch update achievements for better performance
  const updateAchievementsBatch = useCallback(async (updates: Array<{achievementId: string, progress: number}>) => {
    if (!username) return false;

    try {
      const batchUpdates = updates.map(update => ({
        username,
        achievementId: update.achievementId,
        progress: update.progress
      }));

      const results = await batchUpdateAchievements(batchUpdates);
      if (results.length > 0) {
        // Reload achievements to get updated data
        const achievements = await getUserAchievementsSafe(username);
        setUserAchievements(achievements);
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to update achievements');
      return false;
    }
  }, [username]);

  // Check and award Power User achievement (7 consecutive days)
  const checkPowerUserAchievement = useCallback(async () => {
    if (!username || !dailyCheckins.length) return false;

    try {
      const powerUserAchievement = userAchievements.find(a => a.achievement_id === 'power_user');
      
      if (powerUserAchievement && !powerUserAchievement.completed) {
        // Sort check-ins by date and find consecutive days (same logic as Loyal User)
        const sortedCheckins = [...dailyCheckins].sort((a, b) => 
          new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
        );

        let maxConsecutiveDays = 0;
        let currentConsecutiveDays = 0;
        let lastDate: Date | null = null;

        for (const checkin of sortedCheckins) {
          const checkinDate = new Date(checkin.checkin_date);
          
          if (lastDate) {
            const dayDiff = Math.floor((checkinDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
              // Consecutive day
              currentConsecutiveDays++;
            } else if (dayDiff > 1) {
              // Gap in days, reset counter
              currentConsecutiveDays = 1;
            }
            // If dayDiff === 0, it's the same day, don't increment
          } else {
            // First check-in
            currentConsecutiveDays = 1;
          }

          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
          lastDate = checkinDate;
        }

        // Update progress and check if completed
        const newProgress = Math.min(maxConsecutiveDays, 7);
        if (newProgress >= 7) {
          const success = await updateAchievement('power_user', 7);
          if (success) {
            return true;
          }
        } else if (newProgress > (powerUserAchievement.progress || 0)) {
          // Update progress even if not completed
          await updateAchievement('power_user', newProgress);
        }
      }
      return false;
    } catch (err) {
      // Intentionally empty - silent error handling for achievement checks
    }
  }, [username, dailyCheckins, userAchievements, updateAchievement]);

  // Check and award Loyal User achievement (30 consecutive days)
  const checkLoyalUserAchievement = useCallback(async () => {
    if (!username || !dailyCheckins.length) return false;

    try {
      const loyalUserAchievement = userAchievements.find(a => a.achievement_id === 'loyal_user');
      
      if (loyalUserAchievement && !loyalUserAchievement.completed) {
        // Sort check-ins by date and find consecutive days
        const sortedCheckins = [...dailyCheckins].sort((a, b) => 
          new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
        );

        let maxConsecutiveDays = 0;
        let currentConsecutiveDays = 0;
        let lastDate: Date | null = null;

        for (const checkin of sortedCheckins) {
          const checkinDate = new Date(checkin.checkin_date);
          
          if (lastDate) {
            const dayDiff = Math.floor((checkinDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dayDiff === 1) {
              // Consecutive day
              currentConsecutiveDays++;
            } else if (dayDiff > 1) {
              // Gap in days, reset counter
              currentConsecutiveDays = 1;
            }
            // If dayDiff === 0, it's the same day, don't increment
          } else {
            // First check-in
            currentConsecutiveDays = 1;
          }

          maxConsecutiveDays = Math.max(maxConsecutiveDays, currentConsecutiveDays);
          lastDate = checkinDate;
        }

        // Update progress and check if completed
        const newProgress = Math.min(maxConsecutiveDays, 30);
        if (newProgress >= 30) {
          const success = await updateAchievement('loyal_user', 30);
          if (success) {
            return true;
          }
        } else if (newProgress > (loyalUserAchievement.progress || 0)) {
          // Update progress even if not completed
          await updateAchievement('loyal_user', newProgress);
        }
      }
      return false;
    } catch (err) {
      return false;
    }
  }, [username, dailyCheckins, userAchievements, updateAchievement]);

  // Check all easy achievements (Power User and Loyal User)
  const checkEasyAchievements = useCallback(async () => {
    if (!username) return;

    try {
      const powerUserAwarded = await checkPowerUserAchievement();
      const loyalUserAwarded = await checkLoyalUserAchievement();
      
      if (powerUserAwarded || loyalUserAwarded) {
        // Reload achievements to show updated state
        const achievements = await getUserAchievementsSafe(username);
        setUserAchievements(achievements);
      }
    } catch (err) {
      // Intentionally empty - silent error handling for achievement checks
    }
  }, [username, checkPowerUserAchievement, checkLoyalUserAchievement]);

  // Get check-in history for calendar
  const getCheckinHistory = useCallback(() => {
    const history: Record<string, boolean> = {};
    dailyCheckins.forEach(checkin => {
      history[checkin.checkin_date] = true;
    });
    return history;
  }, [dailyCheckins]);

  // Get weekly check-in data
  const getWeeklyCheckins = useCallback(() => {
    const today = new Date();
    const weekDays = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const checkedIn = dailyCheckins.some(checkin => checkin.checkin_date === dateString);
      
      weekDays.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateString,
        checkedIn,
        isToday: dateString === today.toISOString().split('T')[0]
      });
    }
    
    return weekDays;
  }, [dailyCheckins]);

  // Get achievement statistics (optimized)
  const getAchievementStats = useCallback(() => {
    if (rewardsSummary) {
      return {
        totalAchievements: rewardsSummary.total_achievements,
        completedAchievements: rewardsSummary.completed_achievements,
        totalRewards: userAchievements
          .filter(a => a.completed)
          .reduce((sum, a) => sum + (a.omni_earned || 0), 0),
        completionRate: rewardsSummary.total_achievements > 0 
          ? (rewardsSummary.completed_achievements / rewardsSummary.total_achievements) * 100 
          : 0
      };
    }

    // Fallback calculation if summary not available
    const totalAchievements = userAchievements.length;
    const completedAchievements = userAchievements.filter(a => a.completed).length;
    const totalRewards = userAchievements
      .filter(a => a.completed)
      .reduce((sum, a) => sum + (a.omni_earned || 0), 0);

    return {
      totalAchievements,
      completedAchievements,
      totalRewards,
      completionRate: totalAchievements > 0 ? (completedAchievements / totalAchievements) * 100 : 0
    };
  }, [rewardsSummary, userAchievements]);

  // Get referral statistics (optimized)
  const getReferralStats = useCallback(() => {
    if (rewardsSummary) {
      return {
        totalReferrals: rewardsSummary.total_referrals,
        completedReferrals: rewardsSummary.completed_referrals,
        totalEarnings: referrals
          .filter(r => r.status === 'completed')
          .reduce((sum, r) => sum + (r.omni_rewarded || 0), 0),
        pendingReferrals: rewardsSummary.total_referrals - rewardsSummary.completed_referrals
      };
    }

    // Fallback calculation if summary not available
    const totalReferrals = referrals.length;
    const completedReferrals = referrals.filter(r => r.status === 'completed').length;
    const totalEarnings = referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.omni_rewarded || 0), 0);

    return {
      totalReferrals,
      completedReferrals,
      totalEarnings,
      pendingReferrals: totalReferrals - completedReferrals
    };
  }, [rewardsSummary, referrals]);

  // Get user balance (optimized)
  const getUserBalance = useCallback(() => {
    return userRewards?.current_balance || 0;
  }, [userRewards]);

  // Get total earned (optimized)
  const getTotalEarned = useCallback(() => {
    return userRewards?.total_omni_earned || 0;
  }, [userRewards]);

  // Check if user has checked in today (optimized)
  const checkTodayCheckedIn = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return dailyCheckins.some(checkin => checkin.checkin_date === today);
  }, [dailyCheckins]);

  // OMNI Verification Purchase
  const purchaseVerificationWithOmniTokens = useCallback(async (userId: string, omniCost = 1000) => {
    if (!username) return { success: false, error: 'Username not available' };

    try {
      const result = await purchaseVerificationWithOmni(userId, username, omniCost);
      
      if (result.success) {
        // Reload rewards data to get updated balance
        await loadRewardsData();
      }
      
      return result;
    } catch (err) {
      setError('Failed to purchase verification with OMNI');
      return { success: false, error: 'Failed to purchase verification' };
    }
  }, [username, loadRewardsData]);

  // Check if user can afford verification
  const checkVerificationAffordability = useCallback(async (omniCost = 1000) => {
    if (!username) return { can_afford: false, current_balance: 0, required_balance: omniCost, shortfall: omniCost };

    try {
      return await canAffordVerification(username, omniCost);
    } catch (err) {
      return { can_afford: false, current_balance: 0, required_balance: omniCost, shortfall: omniCost };
    }
  }, [username]);

  // Load data on mount and when username changes
  useEffect(() => {
    loadRewardsData();
  }, [loadRewardsData]);

  // Check achievements when data loads
  useEffect(() => {
    if (userRewards && userAchievements.length > 0 && dailyCheckins.length > 0) {
      checkEasyAchievements();
    }
  }, [userRewards, userAchievements, dailyCheckins, checkEasyAchievements]);

  return {
    // Data
    userRewards,
    userStreak,
    userReferralCode,
    userAchievements,
    dailyCheckins,
    referrals,
    transactions,
    rewardsSummary,
    recentActivity,
    referralCommissions,
    commissionStats,
    
    // State
    loading,
    error,
    refreshing,
    
    // Actions
    refreshRewards,
    performDailyCheckin,
    updateAchievement,
    updateAchievementsBatch,
    checkEasyAchievements,
    purchaseVerificationWithOmniTokens,
    checkVerificationAffordability,
    
    // Computed values
    getCheckinHistory,
    getWeeklyCheckins,
    getAchievementStats,
    getReferralStats,
    getUserBalance,
    getTotalEarned,
    checkTodayCheckedIn,
    
    // Helper functions
    hasCheckedInToday: () => hasCheckedInToday(username)
  };
} 