import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  CheckCircle, 
  Star, 
  CreditCard, 
  Shield, 
  Clock, 
  Award,
  Info,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_PRODUCTS } from '@/utils/subscriptionService';
import { useCachedProfile } from '@/hooks/useCachedProfile';
import VerificationBadge from '@/components/VerificationBadge';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/hooks/useAuth';

const VerificationPage = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profileData } = useCachedProfile();
  const { user } = useAuth();
  
  const {
    isLoading,
    hasActiveSubscription,
    purchaseSubscription,
    restorePurchases,
    subscriptions,
    isVerified,
    // verificationStatus,
    verificationExpiresAt,
    refreshVerificationStatus,
  } = useSubscription();

  const {
    userRewards,
    purchaseVerificationWithOmniTokens,
    checkVerificationAffordability,
    // loading: rewardsLoading,
  } = useRewards(profileData?.username || '');

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [refreshing, setRefreshing] = useState(false);
  const [omniPurchaseLoading, setOmniPurchaseLoading] = useState(false);
  const [omniAffordability, setOmniAffordability] = useState({ can_afford: false, current_balance: 0, required_balance: 1000, shortfall: 1000 });

  // Get subscription pricing from loaded subscriptions
  const monthlySubscription = subscriptions.find(sub => sub.productId === SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION);
  const annualSubscription = subscriptions.find(sub => sub.productId === SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshVerificationStatus();
    setRefreshing(false);
  };

  const handlePurchase = async () => {
    try {
      const productId = selectedPlan === 'monthly' 
        ? SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION 
        : SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION;
      
      await purchaseSubscription(productId);
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  const handleOmniPurchase = async () => {
    if (!user?.id || !profileData?.username) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    setOmniPurchaseLoading(true);
    try {
      const result = await purchaseVerificationWithOmniTokens(user.id, 1000);
      
      if (result.success) {
        Alert.alert(
          'Success! 🎉',
          'Verification purchased successfully with OMNI tokens!',
          [{ text: 'OK', onPress: () => refreshVerificationStatus() }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Failed to purchase verification');
      }
    } catch (error) {
      console.error('OMNI purchase error:', error);
      Alert.alert('Error', 'Failed to purchase verification');
    } finally {
      setOmniPurchaseLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

  // Check OMNI affordability when component loads
  useEffect(() => {
    const checkAffordability = async () => {
      if (profileData?.username) {
        const affordability = await checkVerificationAffordability(1000);
        setOmniAffordability(affordability);
      }
    };
    
    checkAffordability();
  }, [profileData?.username, checkVerificationAffordability]);

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // If user is verified, show verification status
  if (isVerified || hasActiveSubscription) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Verification Success Section */}
          <View style={styles.verifiedContainer}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color="#22C55E" />
            </View>
            <Text style={styles.successTitle}>You&apos;re Verified! 🎉</Text>
            <Text style={styles.successSubtitle}>
              Congratulations! You have an active verification subscription.
            </Text>
          </View>

          {/* Verification Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Verification Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Shield size={20} color="#22C55E" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>Verified</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Clock size={20} color="#64748B" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Expires</Text>
                <Text style={styles.detailValue}>
                  {verificationExpiresAt ? formatExpiryDate(verificationExpiresAt) : 'No expiry'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Award size={20} color="#F59E0B" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Benefits</Text>
                <Text style={styles.detailValue}>All premium features active</Text>
              </View>
            </View>
          </View>

          {/* How You Appear */}
          <View style={styles.appearanceContainer}>
            <Text style={styles.sectionTitle}>How You Appear to Others</Text>
            <View style={styles.demoProfile}>
              <View style={styles.demoProfileInfo}>
                <Text style={styles.demoName}>{profileData.name || 'Your Name'}</Text>
                <VerificationBadge size="medium" />
              </View>
              <Text style={styles.demoUsername}>@{profileData.username || 'username'}</Text>
            </View>
          </View>

          {/* Benefits List */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.sectionTitle}>Your Verification Benefits</Text>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#22C55E" />
              <Text style={styles.benefitText}>Verified badge on your profile</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#22C55E" />
              <Text style={styles.benefitText}>Higher response rates from buyers</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#22C55E" />
              <Text style={styles.benefitText}>Extra OMNI tokens for transactions</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#22C55E" />
              <Text style={styles.benefitText}>Early access to new features</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#22C55E" />
              <Text style={styles.benefitText}>Premium gamification benefits</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.restoreButton} 
              onPress={handleRestorePurchases}
              activeOpacity={0.8}
            >
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Get Verified</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <Shield size={48} color="#22C55E" />
          </View>
          <Text style={styles.heroTitle}>Build Trust, Get More Sales!</Text>
          <Text style={styles.heroSubtitle}>
            Get verified and stand out from the crowd with a trusted verification badge
          </Text>
        </View>

        {/* How You'll Appear */}
        <View style={styles.appearanceContainer}>
          <Text style={styles.sectionTitle}>How You&apos;ll Appear to Others</Text>
          <View style={styles.demoProfile}>
            <View style={styles.demoProfileInfo}>
              <Text style={styles.demoName}>{profileData.name || 'Your Name'}</Text>
              <View style={styles.demoVerificationBadge}>
                <Text style={styles.demoTick}>✓</Text>
                <Text style={styles.demoVerifiedText}>VERIFIED</Text>
              </View>
            </View>
            <Text style={styles.demoUsername}>@{profileData.username || 'username'}</Text>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionTitle}>Verification Benefits</Text>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Build trust with buyers & sellers</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Verified badge on your profile</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Higher response rates from buyers</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Extra OMNI tokens for every transaction</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Early access to future app features</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#22C55E" />
            <Text style={styles.benefitText}>Premium gamification benefits</Text>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingContainer}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          {/* Plan Selector */}
          <View style={styles.planSelector}>
            <TouchableOpacity
              style={[
                styles.planOption,
                selectedPlan === 'monthly' && styles.planOptionSelected
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text style={[
                styles.planOptionText,
                selectedPlan === 'monthly' && styles.planOptionTextSelected
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.planOption,
                selectedPlan === 'annual' && styles.planOptionSelected
              ]}
              onPress={() => setSelectedPlan('annual')}
            >
              <Text style={[
                styles.planOptionText,
                selectedPlan === 'annual' && styles.planOptionTextSelected
              ]}>
                Annual
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Pricing Cards */}
          <View style={styles.pricingCards}>
            {/* Monthly Plan */}
            <TouchableOpacity 
              style={[
                styles.pricingCard,
                selectedPlan === 'monthly' && styles.pricingCardSelected
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingTitle}>Monthly</Text>
                {selectedPlan === 'monthly' && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </View>
              <View style={styles.pricingAmount}>
                <Text style={styles.originalPrice}>₹100</Text>
                <Text style={styles.currentPrice}>
                  {monthlySubscription?.title || '₹19'}/month
                </Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>81% OFF!</Text>
              </View>
            </TouchableOpacity>

            {/* Annual Plan */}
            <TouchableOpacity 
              style={[
                styles.pricingCard,
                selectedPlan === 'annual' && styles.pricingCardSelected
              ]}
              onPress={() => setSelectedPlan('annual')}
            >
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingTitle}>Annual</Text>
                {selectedPlan === 'annual' && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Selected</Text>
                  </View>
                )}
              </View>
              <View style={styles.pricingAmount}>
                <Text style={styles.originalPrice}>₹1200</Text>
                <Text style={styles.currentPrice}>
                  {annualSubscription?.title || '₹199'}/year
                </Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>83% OFF!</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Purchase Button */}
          <TouchableOpacity 
            style={styles.purchaseButton} 
            onPress={handlePurchase}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CreditCard size={20} color="#FFFFFF" />
            )}
            <Text style={styles.purchaseButtonText}>
              {isLoading ? 'Processing...' : 'Subscribe with Google Play'}
            </Text>
          </TouchableOpacity>

          {/* Auto-Renewal Notice */}
          <View style={styles.autoRenewalNotice}>
            <Text style={styles.autoRenewalText}>
              🔄 <Text style={styles.autoRenewalBold}>Auto-renewal:</Text> Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. You can manage or cancel your subscription in your Google Play account settings.
            </Text>
          </View>
        </View>

        {/* OMNI Verification Section */}
        <View style={styles.omniContainer}>
          <Text style={styles.sectionTitle}>🎮 Pay with OMNI Tokens</Text>
          <Text style={styles.omniSubtitle}>
            Use your earned OMNI tokens to get verified instantly! No real money required.
          </Text>
          
          <View style={styles.omniCard}>
            <View style={styles.omniHeader}>
              <View style={styles.omniIcon}>
                <Award size={28} color="#10B981" />
              </View>
              <View style={styles.omniContent}>
                <Text style={styles.omniTitle}>OMNI Verification</Text>
                <Text style={styles.omniDescription}>1 Month Premium Verification</Text>
              </View>
              <View style={styles.omniPrice}>
                <Text style={styles.omniPriceText}>1,000</Text>
                <Text style={styles.omniPriceLabel}>OMNI</Text>
              </View>
            </View>
            
            <View style={styles.omniBalance}>
              <Text style={styles.omniBalanceLabel}>Your Balance:</Text>
              <Text style={styles.omniBalanceValue}>
                {userRewards?.current_balance || 0} OMNI
              </Text>
            </View>
            
            {!omniAffordability.can_afford && (
              <View style={styles.omniInsufficient}>
                <Text style={styles.omniInsufficientText}>
                  💡 You need {omniAffordability.shortfall} more OMNI tokens
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[
                styles.omniButton,
                (!omniAffordability.can_afford || omniPurchaseLoading) && styles.omniButtonDisabled
              ]}
              onPress={handleOmniPurchase}
              disabled={!omniAffordability.can_afford || omniPurchaseLoading}
            >
              {omniPurchaseLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Award size={20} color="#FFFFFF" />
              )}
              <Text style={styles.omniButtonText}>
                {omniPurchaseLoading 
                  ? 'Processing...' 
                  : omniAffordability.can_afford 
                    ? '✨ Purchase with OMNI' 
                    : 'Earn More OMNI'
                }
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.omniInfo}>
            <Text style={styles.omniInfoText}>
              🚀 <Text style={styles.omniInfoBold}>Instant verification</Text> with OMNI tokens{'\n'}
              🎯 <Text style={styles.omniInfoBold}>Earn OMNI</Text> through daily check-ins and achievements{'\n'}
              💰 <Text style={styles.omniInfoBold}>No real money</Text> required - pure gamification{'\n'}
              ⭐ <Text style={styles.omniInfoBold}>Same benefits</Text> as paid verification
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Info size={20} color="#64748B" />
            <Text style={styles.infoTitle}>Important Information</Text>
          </View>
          <Text style={styles.infoText}>
            • Verification is processed immediately after successful payment{'\n'}
            • You can cancel your subscription anytime through Google Play{'\n'}
            • All payments are secure and processed by Google{'\n'}
            • OMNI verification purchases are final and cannot be cancelled or refunded{'\n'}
            • Contact support if you have any issues
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleRestorePurchases}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  
  // Hero Section
  heroContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Verified Status
  verifiedContainer: {
    backgroundColor: '#F0FDF4',
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Section Styling
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
  },

  // Details Section
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },

  // Appearance Section
  appearanceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  demoProfile: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  demoName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginRight: 8,
  },
  demoUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  demoVerificationBadge: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  demoTick: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  demoVerifiedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // Benefits Section
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },

  // Pricing Section
  pricingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  planOptionSelected: {
    backgroundColor: '#22C55E',
  },
  planOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  planOptionTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  pricingCardSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pricingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  selectedBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginRight: 8,
  },
  currentPrice: {
    color: '#22C55E',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  savingsBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  purchaseButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  autoRenewalNotice: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoRenewalText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 16,
  },
  autoRenewalBold: {
    fontFamily: 'Inter-Bold',
    color: '#374151',
  },

  // Info Section
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },

  // Action Buttons
  actionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },
  restoreButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },

  // OMNI Verification Styles - Positive & Appealing
  omniContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  omniSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginBottom: 20,
    lineHeight: 22,
    textAlign: 'center',
  },
  omniCard: {
    backgroundColor: '#ECFDF5',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  omniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  omniIcon: {
    marginRight: 16,
    backgroundColor: '#D1FAE5',
    padding: 8,
    borderRadius: 12,
  },
  omniContent: {
    flex: 1,
  },
  omniTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#064E3B',
    marginBottom: 4,
  },
  omniDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
  },
  omniPrice: {
    alignItems: 'flex-end',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  omniPriceText: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  omniPriceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: -2,
    opacity: 0.9,
  },
  omniBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  omniBalanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#065F46',
  },
  omniBalanceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  omniInsufficient: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  omniInsufficientText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#D97706',
    textAlign: 'center',
  },
  omniButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  omniButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  omniButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  omniInfo: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  omniInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#065F46',
    lineHeight: 20,
  },
  omniInfoBold: {
    fontFamily: 'Inter-Bold',
    color: '#064E3B',
  },
});

export default VerificationPage;
