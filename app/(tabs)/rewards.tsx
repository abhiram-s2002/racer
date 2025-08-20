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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRewards } from '@/hooks/useRewards';
import { awardWelcomeAchievements } from '@/utils/rewardsSupabase';

import {
  Coins,
  Gift,
  Trophy,
  Users,
  Calendar,
  CheckCircle,
  Copy,
  Share2,
  ArrowLeft,
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
} from 'lucide-react-native';
import { useBackHandler } from '@/hooks/useBackHandler';

export default function RewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const username = user?.username || '';

  // Use the rewards hook for database operations
  const {
    userRewards,
    userStreak,
    userReferralCode,
    userAchievements,
    dailyCheckins,
    referrals,
    transactions,
    rewardsSummary,
    recentActivity,
    loading: rewardsLoading,
    error: rewardsError,
    refreshing,
    refreshRewards,
    performDailyCheckin,
    updateAchievement,
    updateAchievementsBatch,
    checkEasyAchievements,
    getWeeklyCheckins,
    getAchievementStats,
    getReferralStats,
    getUserBalance,
    getTotalEarned,
    checkTodayCheckedIn,
    hasCheckedInToday
  } = useRewards(username);

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
        await Share.share({
          message: `Join me on OmniMarketplace! Use my referral code: ${userReferralCode.referral_code}`,
        });
      } catch (error) {
        console.error('Error sharing referral code:', error);
      }
    }
  };

  // Share referral code
  const shareReferralCode = async () => {
    if (userReferralCode?.referral_code) {
      try {
        await Share.share({
          message: `Join me on OmniMarketplace! Use my referral code: ${userReferralCode.referral_code}`,
        });
      } catch (error) {
        console.error('Error sharing referral code:', error);
      }
    }
  };

  // Handle daily check-in
  const handleDailyCheckIn = async () => {
    if (checkTodayCheckedIn()) {
      Alert.alert('Already Checked In', 'You have already checked in today!');
      return;
    }

    const success = await performDailyCheckin();
    if (success) {
      Alert.alert('Check-in Successful!', 'You earned OMNI tokens for checking in today!');
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
  const renderReferralItem = ({ item }: { item: any }) => (
    <View style={styles.referralItem}>
      <View style={styles.referralAvatar}>
        <Text style={styles.referralAvatarText}>
          {item.referred_username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.referralDetails}>
        <Text style={styles.referralName}>{item.referred_username}</Text>
        <Text style={styles.referralDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
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
      </View>
    </View>
  );

  // Check if achievement has logic implemented
  const hasAchievementLogic = (achievementId: string) => {
    const implementedAchievements = [
      'welcome_bonus',
      'early_adopter', 
      'power_user',
      'loyal_user',
      'social_butterfly',
      'referral_king',
      'first_list',
      'listing_master'
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.titleSection}>
            <Gift size={24} color="#22C55E" />
            <View style={styles.titleText}>
              <Text style={styles.title}>Rewards</Text>
              <Text style={styles.subtitle}>Earn OMNI tokens</Text>
            </View>
          </View>
          <View style={{ width: 24 }} />
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
              <Text style={[
                styles.checkInButtonText,
                todayCheckedIn && styles.checkedInButtonText
              ]}>
                {todayCheckedIn ? 'Checked In' : 'Check In'}
              </Text>
            </TouchableOpacity>
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
                <View key={index} style={styles.calendarDay}>
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
              ))}
            </View>
          </View>

          {/* Rewards Summary */}
          <View style={styles.rewardsSummary}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardLabel}>Today&apos;s Reward</Text>
              <Text style={styles.rewardValue}>+10 OMNI</Text>
            </View>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardLabel}>Weekly Bonus</Text>
              <Text style={styles.rewardValue}>+25 OMNI</Text>
            </View>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardLabel}>Monthly Bonus</Text>
              <Text style={styles.rewardValue}>+50 OMNI</Text>
            </View>
          </View>
        </View>

        {/* Referral Code Section */}
        <View style={styles.referralCodeSection}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>
          <View style={styles.referralCodeCard}>
            <View style={styles.codeContainer}>
              <Text style={styles.referralCode}>
                {userReferralCode?.referral_code || generateReferralCode(username)}
              </Text>
              <Text style={styles.referralCodeDescription}>
                Share this code with friends to earn rewards together
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
              <Text style={styles.stepTitle}>Both Earn Rewards</Text>
              <Text style={styles.stepDescription}>
                You both get 100 OMNI tokens when they create their first listing
              </Text>
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

        {/* Referral History */}
        {referrals.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Referral History</Text>
              <View style={styles.historyStats}>
                <Text style={styles.historyStatsText}>
                  {referralStats.totalReferrals} total
                </Text>
              </View>
            </View>
            <FlatList
              data={referrals}
              renderItem={renderReferralItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
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

        {/* Bonus Section */}
        <View style={styles.bonusSection}>
          <View style={styles.bonusCard}>
            <View style={styles.bonusIcon}>
              <Gift size={24} color="#F59E0B" />
            </View>
            <View style={styles.bonusContent}>
              <Text style={styles.bonusTitle}>Welcome Bonus</Text>
              <Text style={styles.bonusDescription}>
                New users get 50 OMNI tokens just for joining! Complete your profile to claim.
              </Text>
            </View>
          </View>
        </View>

        {/* Manual Welcome Achievement Award (for testing) */}
        <View style={styles.bonusSection}>
          <TouchableOpacity 
            style={styles.bonusCard}
            onPress={async () => {
              try {
                const success = await awardWelcomeAchievements(username);
                if (success) {
                  Alert.alert('Success', 'Welcome achievements awarded! Refresh to see them.');
                  await refreshRewards();
                } else {
                  Alert.alert('Error', 'Failed to award welcome achievements.');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to award welcome achievements.');
              }
            }}
          >
            <View style={styles.bonusIcon}>
              <Gift size={24} color="#F59E0B" />
            </View>
            <View style={styles.bonusContent}>
              <Text style={styles.bonusTitle}>Claim Welcome Achievements</Text>
              <Text style={styles.bonusDescription}>
                Tap to claim your welcome bonus and early adopter achievements
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Manual Easy Achievement Check (for testing) */}
        <View style={styles.bonusSection}>
          <TouchableOpacity 
            style={styles.bonusCard}
            onPress={async () => {
              try {
                await checkEasyAchievements();
                Alert.alert('Success', 'Easy achievements checked! Refresh to see any updates.');
                await refreshRewards();
              } catch (error) {
                Alert.alert('Error', 'Failed to check easy achievements.');
              }
            }}
          >
            <View style={styles.bonusIcon}>
              <Crown size={24} color="#3B82F6" />
            </View>
            <View style={styles.bonusContent}>
              <Text style={styles.bonusTitle}>Check Easy Achievements</Text>
              <Text style={styles.bonusDescription}>
                Tap to check Power User and Loyal User achievements
              </Text>
            </View>
          </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  referralCodeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  checkInButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  checkedInButtonText: {
    color: '#64748B',
  },
  streakStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
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
    marginBottom: 20,
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
  rewardLabel: {
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    color: '#94A3B8',
    textAlign: 'center',
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
});