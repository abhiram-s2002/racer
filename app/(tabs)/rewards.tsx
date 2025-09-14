import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
  FlatList,
  StyleSheet,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRewards } from '@/hooks/useRewards';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { type Referral } from '@/utils/rewardsSupabase';
import { type ReferralCommission } from '@/utils/types';
import VerificationBadge from '@/components/VerificationBadge';
import { isUserVerified } from '@/utils/verificationUtils';

import {
  Coins,
  Gift,
  Trophy,
  Users,
  Calendar,
  CheckCircle,
  Copy,
  Share2,
  Flame,
  Star,
  ShoppingBag,
  MessageCircle,
  Heart,
  Camera,
  MapPin,
  Phone,
  TrendingUp,
  Crown,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react-native';
import { useBackHandler } from '@/hooks/useBackHandler';
import { withErrorBoundary } from '@/components/ErrorBoundary';

function RewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const username = user?.username || '';

  // Use the rewards hook for database operations
  const {
    userStreak,
    userReferralCode,
    userAchievements,
    referrals,
    referralCommissions,
    commissionStats,
    loading: rewardsLoading,
    error: rewardsError,
    refreshing,
    refreshRewards,
    performDailyCheckin,
    getWeeklyCheckins,
    getAchievementStats,
    getReferralStats,
    getUserBalance,
    checkTodayCheckedIn
  } = useRewards(username, user?.id);

  // Use the leaderboard hook
  const {
    topUsers,
    currentUserRank,
    lastUpdated,
    loading: leaderboardLoading,
    error: leaderboardError,
    refreshLeaderboard
  } = useLeaderboard(username);

  // Back handler
  useBackHandler();

  // Generate referral code
  function generateReferralCode(username: string) {
    return `OMNI-${username.slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }

  // Copy referral code
  const copyReferralCode = async () => {
    if (userReferralCode?.referral_code) {
      try {
        await Clipboard.setString(userReferralCode.referral_code);
        Alert.alert('Copied!', 'Referral code copied to clipboard');
      } catch (error) {
        // Error copying referral code
        Alert.alert('Error', 'Failed to copy referral code');
      }
    }
  };

  // Share referral code
  const shareReferralCode = async () => {
    if (userReferralCode?.referral_code) {
      try {
        await Share.share({
          message: `Join me on OmniMarketplace! Use my referral code: ${userReferralCode.referral_code} and get 100 OMNI bonus!`,
        });
          } catch (error) {
      // Silent error handling
    }
    }
  };

  // Handle daily check-in
  const handleDailyCheckIn = async () => {
    // If already checked in today, just return silently - no error, no alert
    if (checkTodayCheckedIn()) {
      return;
    }

    const success = await performDailyCheckin();
    if (success) {
      // Check if user is verified to show appropriate message
      const isVerified = isUserVerified(user);
      
      const message = isVerified 
        ? 'You earned 20 OMNI tokens for checking in today! (10 + 10 verified bonus)'
        : 'You earned 10 OMNI tokens for checking in today!';
      
      Alert.alert('Check-in Successful!', message);
    } else {
      Alert.alert('Check-in Failed', 'Please try again later.');
    }
  };

  // Get icon component
  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      ShoppingBag,
      Trophy,
      MessageCircle,
      Heart,
      Camera,
      MapPin,
      Phone,
      TrendingUp,
      Flame,
      Crown,
      Sparkles,
      Star,
    };
    return iconMap[iconName] || Gift;
  };

  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#6B7280';
      case 'rare': return '#3B82F6';
      case 'epic': return '#8B5CF6';
      case 'legendary': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  // Get rarity background
  const getRarityBackground = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#F3F4F6';
      case 'rare': return '#DBEAFE';
      case 'epic': return '#EDE9FE';
      case 'legendary': return '#FEF3C7';
      default: return '#F3F4F6';
    }
  };

  // Render referral item
  const renderReferralItem = ({ item }: { item: Referral }) => {
    // Calculate total activity of this referred user from commission data
    const userCommissions = referralCommissions.filter((comm: ReferralCommission) => 
      comm.referred_username === item.referred_username
    );
    
    // Sum up all source amounts to get total user activity
    const totalUserActivity = userCommissions.reduce((sum: number, comm: ReferralCommission) => sum + comm.source_amount, 0);
    
    // Calculate total commissions earned from this user
    const totalCommissionsFromUser = userCommissions.reduce((sum: number, comm: ReferralCommission) => sum + comm.commission_amount, 0);
    
    return (
      <View style={styles.referralItem}>
        <View style={styles.referralAvatar}>
          <Text style={styles.referralAvatarText}>
            {item.referred_username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.referralDetails}>
          <View style={styles.referralNameRow}>
            <Text style={styles.referralName}>{item.referred_username}</Text>
            {item.referred_user && isUserVerified(item.referred_user) && (
              <VerificationBadge size="small" />
            )}
          </View>
          <Text style={styles.referralDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {/* Show user's total activity */}
          {totalUserActivity > 0 && (
            <Text style={styles.userActivityText}>
              Total Activity: {totalUserActivity} OMNI
            </Text>
          )}
        </View>
        <View style={styles.referralEarnings}>
          <View style={[
            styles.statusBadge,
            item.status === 'completed' ? styles.completedBadge : styles.pendingBadge
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'completed' ? styles.completedText : styles.pendingText
            ]}>
              {item.status === 'completed' ? 'Completed' : 'Pending'}
            </Text>
          </View>
          <Text style={styles.earningsAmount}>
            +{item.omni_rewarded || 0} OMNI
          </Text>
          {/* Show commissions earned from this user */}
          {totalCommissionsFromUser > 0 && (
            <Text style={styles.commissionAmount}>
              +{totalCommissionsFromUser} OMNI commissions
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Check if achievement has logic implemented
  const hasAchievementLogic = (achievementId: string) => {
    const implementedAchievements = [
      'welcome_bonus',
      'power_user',
      'loyal_user',
      'social_butterfly',
      'referral_king',
      'first_list',
      'listing_master',
      'perfect_seller'
    ];
    return implementedAchievements.includes(achievementId);
  };

  // Render achievement
  const renderAchievement = ({ item }: { item: any }) => {
    const IconComponent = getIconComponent(item.achievements?.icon || 'Gift');
    const progress = (item.progress / item.max_progress) * 100;
    const isCompleted = item.completed;
    const hasLogic = hasAchievementLogic(item.achievement_id);

    return (
      <View style={[
        styles.achievementCard,
        !hasLogic && !isCompleted && { opacity: 0.6 }
      ]}>
        <View style={styles.achievementHeader}>
          <View style={[
            styles.achievementIcon,
            { backgroundColor: getRarityBackground(item.achievements?.rarity || 'common') }
          ]}>
            <IconComponent 
              size={20} 
              color={getRarityColor(item.achievements?.rarity || 'common')} 
            />
          </View>
          <View style={styles.achievementInfo}>
            <Text style={styles.achievementTitle}>
              {item.achievements?.title || 'Achievement'}
            </Text>
            <Text style={styles.achievementDescription}>
              {item.achievements?.description || 'Complete this achievement'}
            </Text>
          </View>
          <View style={styles.achievementReward}>
            <Text style={styles.achievementRewardText}>
              +{item.achievements?.omni_reward || 0}
            </Text>
            <Text style={styles.achievementRewardLabel}>OMNI</Text>
          </View>
        </View>
        
        <View style={styles.achievementProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${progress}%`,
                  backgroundColor: isCompleted ? '#22C55E' : '#3B82F6'
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {item.progress}/{item.max_progress}
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.achievementCompletedBadge}>
            <CheckCircle size={12} color="#16A34A" />
            <Text style={styles.achievementCompletedBadgeText}>Completed</Text>
          </View>
        )}

        {!hasLogic && !isCompleted && (
          <View style={styles.comingSoonBadge}>
            <Info size={10} color="#FFFFFF" />
            <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate stats
  const referralStats = getReferralStats();
  const achievementStats = getAchievementStats();
  const weeklyCheckins = getWeeklyCheckins();
  const todayCheckedIn = checkTodayCheckedIn();



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Gift size={24} color="#22C55E" />
            <View style={styles.titleText}>
              <Text style={styles.title}>Rewards</Text>
              <Text style={styles.subtitle}>Earn OMNI tokens</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshRewards} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Coins size={24} color="#22C55E" />
              </View>
              <Text style={styles.statValue}>{getUserBalance()}</Text>
              <Text style={styles.statLabel}>Current $OMNI Balance</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Trophy size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{achievementStats.completedAchievements}</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Flame size={24} color="#EF4444" />
              </View>
              <Text style={styles.statValue}>{userStreak?.current_streak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{referralStats.completedReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
          </View>
        </View>

        {/* Daily Check-in Section */}
        <View style={styles.checkInSection}>
          <View style={styles.checkInHeader}>
            <View style={styles.checkInTitleSection}>
              <Calendar size={24} color="#22C55E" />
              <View style={styles.checkInTitleText}>
                <Text style={styles.checkInTitle}>Daily Check-in</Text>
                <Text style={styles.checkInSubtitle}>Earn rewards every day</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.checkInButton,
                todayCheckedIn && styles.checkedInButton
              ]}
              onPress={handleDailyCheckIn}
              disabled={todayCheckedIn}
            >
              <View style={styles.checkInButtonContent}>
                <Text style={[
                  styles.checkInButtonText,
                  todayCheckedIn && styles.checkedInButtonText
                ]}>
                  {todayCheckedIn ? 'Checked In' : 'Check In'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* OMNI Rewards Info */}
          <View style={styles.rewardsInfo}>
            <View style={styles.rewardsInfoHeader}>
              <Coins size={16} color="#F59E0B" />
              <Text style={styles.rewardsInfoTitle}>Daily OMNI Rewards</Text>
            </View>
            <View style={styles.rewardsComparison}>
              <View style={styles.rewardCard}>
                <View style={styles.rewardIcon}>
                  <Coins size={20} color="#6B7280" />
                </View>
                <Text style={styles.rewardAmount}>10</Text>
                <Text style={styles.rewardLabel}>Non-Verified</Text>
              </View>
              <View style={styles.rewardArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              <View style={[styles.rewardCard, styles.verifiedRewardCard]}>
                <View style={[styles.rewardIcon, styles.verifiedRewardIcon]}>
                  <Crown size={20} color="#10B981" />
                </View>
                <Text style={[styles.rewardAmount, styles.verifiedRewardAmount]}>20</Text>
                <Text style={[styles.rewardLabel, styles.verifiedRewardLabel]}>Verified</Text>
                <View style={styles.bonusBadge}>
                  <Text style={styles.bonusText}>+10 Bonus</Text>
                </View>
              </View>
            </View>
            {!isUserVerified(user) && (
              <TouchableOpacity 
                style={styles.getVerifiedButton}
                onPress={() => router.push('/verification')}
              >
                <Crown size={16} color="#10B981" />
                <Text style={styles.getVerifiedText}>Get Verified for 2x Daily Rewards</Text>
                <Text style={styles.getVerifiedArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Streak Stats */}
          <View style={styles.streakStats}>
            <View style={styles.streakCard}>
              <Flame size={20} color="#EF4444" />
              <Text style={styles.streakValue}>{userStreak?.current_streak || 0}</Text>
              <Text style={styles.streakLabel}>Current</Text>
            </View>
            <View style={styles.streakCard}>
              <Trophy size={20} color="#F59E0B" />
              <Text style={styles.streakValue}>{userStreak?.longest_streak || 0}</Text>
              <Text style={styles.streakLabel}>Longest</Text>
            </View>
            <View style={styles.streakCard}>
              <Calendar size={20} color="#3B82F6" />
              <Text style={styles.streakValue}>{userStreak?.total_checkins || 0}</Text>
              <Text style={styles.streakLabel}>Total</Text>
            </View>
          </View>

          {/* Weekly Calendar */}
          <View style={styles.calendarSection}>
            <Text style={styles.calendarTitle}>This Week</Text>
            <View style={styles.calendarGrid}>
              {weeklyCheckins.map((day, index) => (
                <React.Fragment key={index}>
                  <View style={styles.calendarDay}>
                    <Text style={styles.calendarDayText}>{day.day}</Text>
                    <View style={[
                      styles.calendarDate,
                      day.checkedIn && styles.checkedInDate,
                      day.isToday && styles.todayDate
                    ]}>
                      <Text style={[
                        styles.calendarDateText,
                        day.checkedIn && styles.checkedInDateText,
                        day.isToday && styles.todayDateText
                      ]}>
                        {new Date(day.date).getDate()}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Rewards Summary */}
          <View style={styles.rewardsSummary}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardSummaryLabel}>Today&apos;s Reward</Text>
              <Text style={styles.rewardValue}>+10 OMNI</Text>
            </View>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardSummaryLabel}>Weekly Bonus</Text>
              <Text style={styles.rewardValue}>+200 OMNI</Text>
            </View>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardSummaryLabel}>Monthly Bonus</Text>
              <Text style={styles.rewardValue}>+1000 OMNI</Text>
            </View>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.referralCodeSection}>
          <View style={styles.referralCodeHeader}>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
            <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert(
              'How Cascading Commissions Work',
              'When you refer someone, you earn 10% of all their rewards. When they refer others, you also earn 10% of their referral commissions! This creates a growing network where each new level adds value to your existing referrals.\n\nExample:\n• You refer User B → You get 10% of their rewards\n• User B refers User C → You get 10% of User B\'s commission\n• User C refers User D → You get 10% of User B\'s commission on User C\'s commission\n\nYour network value grows exponentially!'
            )}>
              <Info size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.referralCodeCard}>
            <View style={styles.codeContainer}>
              <Text style={styles.referralCode}>
                {userReferralCode?.referral_code || generateReferralCode(username)}
              </Text>
                                                    <Text style={styles.referralCodeDescription}>
                Share this code with friends to earn 10% of all rewards they earn, including their referral commissions! They get 100 OMNI bonus immediately.
              </Text>
            </View>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.copyButton} onPress={copyReferralCode}>
                <Copy size={16} color="#64748B" />
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={shareReferralCode}>
                <Share2 size={16} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsStats}>
              <View style={styles.achievementStat}>
                <Text style={styles.achievementStatValue}>
                  {achievementStats.completedAchievements}
                </Text>
                <Text style={styles.achievementStatLabel}>Completed</Text>
              </View>
              <View style={styles.achievementStat}>
                <Text style={styles.achievementStatValue}>
                  {achievementStats.totalAchievements}
                </Text>
                <Text style={styles.achievementStatLabel}>Total</Text>
              </View>
              <View style={styles.achievementStat}>
                <Text style={styles.achievementStatValue}>
                  {Math.round(achievementStats.completionRate)}%
                </Text>
                <Text style={styles.achievementStatLabel}>Progress</Text>
              </View>
            </View>
          </View>

          {rewardsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading achievements...</Text>
            </View>
          ) : rewardsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Error loading achievements: {rewardsError}</Text>
            </View>
          ) : userAchievements.length === 0 ? (
            <View style={styles.emptyAchievementsContainer}>
              <Trophy size={48} color="#94A3B8" />
              <Text style={styles.emptyAchievementsText}>No Achievements Yet</Text>
              <Text style={styles.emptyAchievementsSubtext}>
                Start using the app to unlock achievements and earn rewards
              </Text>
            </View>
          ) : (
            <FlatList
              data={userAchievements}
              renderItem={renderAchievement}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.achievementsList}
              contentContainerStyle={styles.achievementsListContent}
            />
          )}
        </View>

        {/* Network Analytics Section */}
        <View style={styles.networkAnalyticsSection}>
          <Text style={styles.sectionTitle}>Network Analytics</Text>
          
          {/* Network Overview Card */}
          <View style={styles.networkOverviewCard}>
            <View style={styles.networkOverviewHeader}>
              <Text style={styles.networkOverviewTitle}>Your Referral Network</Text>
              <View style={styles.networkOverviewStats}>
                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>{referrals.length}</Text>
                  <Text style={styles.networkStatLabel}>Total Referrals</Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>
                    {referrals.filter(r => r.status === 'completed').length}
                  </Text>
                  <Text style={styles.networkStatLabel}>Completed</Text>
                </View>
                <View style={styles.networkStat}>
                  <Text style={styles.networkStatValue}>
                    {Math.round((referrals.filter(r => r.status === 'completed').length / Math.max(referrals.length, 1)) * 100)}%
                  </Text>
                  <Text style={styles.networkStatLabel}>Success Rate</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Network Value Card */}
          <View style={styles.networkValueCard}>
            <View style={styles.networkValueHeader}>
              <Text style={styles.networkValueTitle}>Network Value</Text>
              <Text style={styles.networkValueSubtitle}>Total earnings from your network</Text>
            </View>
            <View style={styles.networkValueContent}>
              <View style={styles.networkValueItem}>
                <Text style={styles.networkValueLabel}>Direct Referrals</Text>
                <Text style={styles.networkValueAmount}>
                  +{referrals.filter(r => r.status === 'completed').reduce((sum: number, r: Referral) => sum + (r.omni_rewarded || 0), 0)} OMNI
                </Text>
              </View>
              <View style={styles.networkValueItem}>
                <Text style={styles.networkValueLabel}>Cascading Commissions</Text>
                <Text style={styles.networkValueAmount}>
                  +{commissionStats.totalCommissions} OMNI
                </Text>
              </View>
              <View style={styles.networkValueDivider} />
              <View style={styles.networkValueItem}>
                <Text style={styles.networkValueLabel}>Total Network Value</Text>
                <Text style={styles.networkValueTotal}>
                  +{referrals.filter(r => r.status === 'completed').reduce((sum: number, r: Referral) => sum + (r.omni_rewarded || 0), 0) + commissionStats.totalCommissions} OMNI
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Share Your Code</Text>
              <Text style={styles.stepDescription}>
                Send your unique referral code to friends
              </Text>
            </View>
          </View>
          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Friend Joins</Text>
              <Text style={styles.stepDescription}>
                They sign up using your referral code
              </Text>
            </View>
          </View>
                     <View style={styles.stepCard}>
             <View style={styles.stepNumber}>
               <Text style={styles.stepNumberText}>3</Text>
             </View>
             <View style={styles.stepContent}>
               <Text style={styles.stepTitle}>You Earn Commissions</Text>
                               <Text style={styles.stepDescription}>
                  You earn 10% of all rewards they earn, including commissions from their referrals! They get 100 OMNI immediately.
                </Text>
             </View>
           </View>
        </View>

        {/* Referral History */}
        {referrals.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Referral History</Text>
              <View style={styles.historyStats}>
                <Text style={styles.historyStatsText}>
                  {referrals.length} total • {referrals.filter(r => r.status === 'completed').length} completed
                </Text>
              </View>
            </View>
            
            {/* Referral Summary Card */}
            <View style={styles.referralSummaryCard}>
              <View style={styles.referralSummaryRow}>
                <View style={styles.referralSummaryItem}>
                  <Text style={styles.referralSummaryLabel}>Total Network Activity</Text>
                  <Text style={styles.referralSummaryValue}>
                    {referralCommissions.reduce((sum, comm) => sum + comm.source_amount, 0)} OMNI
                  </Text>
                </View>
                <View style={styles.referralSummaryItem}>
                  <Text style={styles.referralSummaryLabel}>Avg. Activity per User</Text>
                  <Text style={styles.referralSummaryValue}>
                    {referrals.length > 0 ? Math.round(referralCommissions.reduce((sum, comm) => sum + comm.source_amount, 0) / referrals.length) : 0} OMNI
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Enhanced Referral List */}
            <FlatList
              data={referrals}
              renderItem={renderReferralItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
            
            {/* Commission Breakdown */}
            {commissionStats.totalCommissions > 0 && (
              <View style={styles.commissionBreakdownCard}>
                <Text style={styles.commissionBreakdownTitle}>Commission Breakdown</Text>
                <Text style={styles.commissionBreakdownSubtitle}>
                  Your earnings from cascading commissions
                </Text>
                <View style={styles.commissionBreakdownContent}>
                  <View style={styles.commissionBreakdownItem}>
                    <Text style={styles.commissionBreakdownLabel}>Total Commissions</Text>
                    <Text style={styles.commissionBreakdownAmount}>
                      +{commissionStats.totalCommissions} OMNI
                    </Text>
                  </View>
                  <View style={styles.commissionBreakdownItem}>
                    <Text style={styles.commissionBreakdownLabel}>Network Growth</Text>
                    <Text style={styles.commissionBreakdownValue}>
                      {referralCommissions.length} commission transactions
                    </Text>
                  </View>
                  <View style={styles.commissionBreakdownItem}>
                    <Text style={styles.commissionBreakdownLabel}>Total Network Activity</Text>
                    <Text style={styles.commissionBreakdownAmount}>
                      {referralCommissions.reduce((sum, comm) => sum + comm.source_amount, 0)} OMNI
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Empty State for Referrals */}
        {referrals.length === 0 && (
          <View style={styles.historySection}>
            <View style={styles.emptyHistory}>
              <Users size={48} color="#94A3B8" />
              <Text style={styles.emptyHistoryText}>No Referrals Yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Share your referral code to start earning rewards
              </Text>
            </View>
          </View>
        )}

        {/* Commission Earnings Section */}
        {commissionStats.totalCommissions > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Commission Earnings</Text>
              <View style={styles.historyStats}>
                <Text style={styles.historyStatsText}>
                  +{commissionStats.totalCommissions} OMNI total
                </Text>
              </View>
            </View>
            
            {/* Enhanced Commission Explanation */}
            <View style={styles.commissionCard}>
              <View style={styles.commissionIcon}>
                <DollarSign size={24} color="#10B981" />
              </View>
              <View style={styles.commissionContent}>
                <Text style={styles.commissionTitle}>10% Commission Active</Text>
                <Text style={styles.commissionDescription}>
                  You&apos;re earning 10% of all rewards from your referrals, including their referral commissions!
                </Text>
                <Text style={styles.commissionAmount}>
                  Total earned: {commissionStats.totalCommissions} OMNI
                </Text>
              </View>
            </View>

            {/* Cascading Commission Explanation */}
            <View style={styles.cascadingCard}>
              <View style={styles.cascadingIcon}>
                <TrendingUp size={20} color="#8B5CF6" />
              </View>
              <View style={styles.cascadingContent}>
                <Text style={styles.cascadingTitle}>Cascading Commissions</Text>
                <Text style={styles.cascadingDescription}>
                  When your referrals refer others, you earn from multiple levels automatically. Each level grows your network value!
                </Text>
              </View>
            </View>
          </View>
        )}



        {/* Global Leaderboard Section */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardHeader}>
            <Text style={styles.sectionTitle}> Global Leaderboard</Text>
            <Text style={styles.lastUpdatedText}>{lastUpdated}</Text>
          </View>
          
          {leaderboardLoading ? (
            <View style={styles.leaderboardLoading}>
              <Text style={styles.loadingText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboardError ? (
            <View style={styles.leaderboardError}>
              <Text style={styles.errorText}>Error loading leaderboard</Text>
            </View>
          ) : (
            <>
              {/* Top 20 Users */}
              <View style={styles.leaderboardList}>
                {topUsers.map((user, index) => (
                  <View key={user.username} style={styles.leaderboardItem}>
                    <View style={styles.rankContainer}>
                      <Text style={[
                        styles.rankText,
                        index < 3 ? styles.topRankText : styles.regularRankText
                      ]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.usernameText}>{user.username}</Text>
                    </View>
                    <View style={styles.omniEarned}>
                      <Text style={styles.omniAmount}>{user.total_omni_earned.toLocaleString()} OMNI</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Current User Rank */}
              {currentUserRank && (
                <View style={styles.currentUserSection}>
                  <View style={styles.currentUserHeader}>
                    <Text style={styles.currentUserTitle}>Your Position</Text>
                  </View>
                  <View style={styles.currentUserCard}>
                    <View style={styles.currentUserRank}>
                      <Text style={styles.currentUserRankText}>#{currentUserRank.rank}</Text>
                    </View>
                    <View style={styles.currentUserInfo}>
                      <Text style={styles.currentUserUsername}>{currentUserRank.username}</Text>
                      <Text style={styles.currentUserOmni}>{currentUserRank.total_omni_earned.toLocaleString()} OMNI</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Verification Rewards Information */}
        <View style={styles.disclaimerSection}>
          <View style={styles.verificationRewardsCard}>
            <View style={styles.verificationRewardsContent}>
              <View style={styles.verificationRewardsHeader}>
                <Crown size={20} color="#F59E0B" />
                <Text style={styles.verificationRewardsTitle}>Verified User Benefits</Text>
              </View>
              <Text style={styles.verificationRewardsText}>
                🎁 <Text style={styles.verificationRewardsBold}>Extra Allocation for Verified Users:</Text>
              </Text>
              <Text style={styles.verificationRewardsDetails}>
                • <Text style={styles.verificationRewardsBold}>Future App Features:</Text> Verified users get early access to new app features and premium functionality
              </Text>
              <Text style={styles.verificationRewardsDetails}>
                • <Text style={styles.verificationRewardsBold}>Multiplier Effect:</Text> Each month of verified status increases your OMNI earning multiplier
              </Text>
              <Text style={styles.verificationRewardsDetails}>
                • <Text style={styles.verificationRewardsBold}>Bonus OMNI Points:</Text> 2x OMNI points for all transactions when verified
              </Text>
              <Text style={styles.verificationRewardsFormula}>
                <Text style={styles.verificationRewardsBold}>Formula:</Text> Base OMNI × (1 + 0.1 × Verified Months)
              </Text>
              <Text style={styles.verificationRewardsNote}>
                💡 The longer you stay verified, the more OMNI you earn for future features!
              </Text>
              <View style={styles.verificationRewardsDisclaimer}>
                <Text style={styles.verificationRewardsDisclaimerText}>
                  <Text style={styles.verificationRewardsBold}>Important:</Text> OMNI tokens are virtual currency for gamification and engagement. Future app features may allow spending OMNI tokens, but they have no current monetary value.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.disclaimerSection}>
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerContent}>
              <Text style={styles.disclaimerTitle}>Important Information</Text>
              <Text style={styles.disclaimerText}>
                OMNI tokens are virtual currency used for gamification and user engagement within the app. They have no monetary value and cannot be converted to real currency or company shares. Future app features may allow spending OMNI tokens for in-app benefits, but they are currently used only for tracking user engagement and achievements.
              </Text>
              <Text style={styles.disclaimerLegal}>
                This is not a securities offering. Please consult with legal and financial advisors regarding your specific situation.
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
      {/* Bottom safe area padding */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  statsContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  referralCodeSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  referralCodeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    letterSpacing: 2,
  },
  referralCodeDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  shareButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  howItWorksSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  checkInSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkInTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkInTitleText: {
    marginLeft: 12,
  },
  checkInTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  checkInSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  checkInButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkedInButton: {
    backgroundColor: '#E2E8F0',
  },
  checkInButtonContent: {
    alignItems: 'center',
  },
  checkInButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  checkedInButtonText: {
    color: '#64748B',
  },
  rewardAmountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardAmountText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  rewardsInfo: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  rewardsInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardsInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 8,
  },
  rewardsComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifiedRewardCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    position: 'relative',
  },
  rewardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  verifiedRewardIcon: {
    backgroundColor: '#DCFCE7',
  },
  rewardAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  verifiedRewardAmount: {
    color: '#10B981',
  },
  rewardLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  verifiedRewardLabel: {
    color: '#10B981',
  },
  bonusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bonusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  rewardArrow: {
    marginHorizontal: 12,
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#94A3B8',
  },
  getVerifiedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  getVerifiedText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
  getVerifiedArrow: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  streakStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 4,
    marginBottom: 2,
  },
  streakLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  calendarSection: {
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    alignItems: 'center',
    flex: 1,
  },
  calendarDayText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 6,
  },
  calendarDate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedInDate: {
    backgroundColor: '#22C55E',
  },
  todayDate: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  calendarDateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  checkedInDateText: {
    color: '#FFFFFF',
  },
  todayDateText: {
    color: '#D97706',
  },
  rewardsSummary: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rewardSummaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  rewardValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  achievementsSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementsStats: {
    flexDirection: 'row',
    gap: 16,
  },
  achievementStat: {
    alignItems: 'center',
  },
  achievementStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  achievementStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  achievementReward: {
    alignItems: 'flex-end',
  },
  achievementRewardText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  achievementRewardLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    minWidth: 40,
    textAlign: 'right',
  },
  achievementCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  achievementCompletedBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#16A34A',
  },

  achievementsList: {
  },
  achievementsListContent: {
    paddingBottom: 16,
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatsText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
  },
  referralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  referralAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#64748B',
  },
  referralDetails: {
    flex: 1,
  },
  referralNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  referralName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  referralDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  referralEarnings: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    gap: 2,
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  completedText: {
    color: '#16A34A',
  },
  pendingText: {
    color: '#D97706',
  },
  earningsAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  commissionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  commissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  commissionContent: {
    flex: 1,
  },
  commissionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#065F46',
    marginBottom: 4,
  },
  commissionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#047857',
    marginBottom: 8,
  },
  commissionAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  cascadingCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDE9FE',
    marginTop: 12,
  },
  cascadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cascadingContent: {
    flex: 1,
  },
  cascadingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#5B21B6',
    marginBottom: 4,
  },
  cascadingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#7C3AED',
    lineHeight: 18,
  },
  networkAnalyticsSection: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  networkOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  networkOverviewHeader: {
    marginBottom: 16,
  },
  networkOverviewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  networkOverviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  networkStat: {
    alignItems: 'center',
    flex: 1,
  },
  networkStatValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
    marginBottom: 4,
  },
  networkStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  networkValueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  networkValueHeader: {
    marginBottom: 16,
  },
  networkValueTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  networkValueSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  networkValueContent: {
    gap: 12,
  },
  networkValueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkValueLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  networkValueAmount: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  networkValueDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  networkValueTotal: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  leaderboardSection: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  leaderboardLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  leaderboardError: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  leaderboardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  topRankText: {
    color: '#F59E0B',
  },
  regularRankText: {
    color: '#64748B',
  },
  userInfo: {
    flex: 1,
  },
  usernameText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  omniEarned: {
    alignItems: 'flex-end',
  },
  omniAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  currentUserSection: {
    marginTop: 16,
  },
  currentUserHeader: {
    marginBottom: 12,
  },
  currentUserTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  currentUserCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  currentUserRank: {
    marginRight: 16,
  },
  currentUserRankText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#059669',
  },
  currentUserInfo: {
    flex: 1,
  },
  currentUserUsername: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#065F46',
    marginBottom: 4,
  },
  currentUserOmni: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#047857',
  },
  commissionBreakdownCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commissionBreakdownTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  commissionBreakdownSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 16,
  },
  commissionBreakdownContent: {
    gap: 12,
  },
  commissionBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commissionBreakdownLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  commissionBreakdownAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  commissionBreakdownValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  referralCodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  userActivityText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginTop: 2,
  },

  referralSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  referralSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  referralSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  referralSummaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
    textAlign: 'center',
  },
  referralSummaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  bonusSection: {
    margin: 16,
    marginBottom: 30,
  },
  bonusCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bonusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bonusContent: {
    flex: 1,
  },
  bonusTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 2,
  },
  bonusDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#A16207',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyAchievementsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyAchievementsText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyAchievementsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comingSoonBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  disclaimerSection: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  disclaimerCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  disclaimerLegal: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  verificationRewardsCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  verificationRewardsContent: {
    flex: 1,
  },
  verificationRewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verificationRewardsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginLeft: 8,
  },
  verificationRewardsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  verificationRewardsBold: {
    fontFamily: 'Inter-Bold',
    color: '#92400E',
  },
  verificationRewardsDetails: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    marginBottom: 6,
    lineHeight: 18,
  },
  verificationRewardsFormula: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FEF7CD',
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  verificationRewardsNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verificationRewardsDisclaimer: {
    backgroundColor: '#FEF7CD',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  verificationRewardsDisclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default withErrorBoundary(RewardsScreen, 'RewardsScreen');