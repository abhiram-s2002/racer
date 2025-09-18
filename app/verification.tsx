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

    const omniAmount = selectedPlan === 'monthly' ? 1000 : 10000;
    setOmniPurchaseLoading(true);
    try {
      const result = await purchaseVerificationWithOmniTokens(user.id, omniAmount);
      
      if (result.success) {
        Alert.alert(
          'Success!',
          `Verification extended successfully with ${omniAmount} OMNI tokens!`,
          [{ text: 'OK', onPress: () => refreshVerificationStatus() }]
        );
      } else {
        Alert.alert('Purchase Failed', result.error || 'Failed to extend verification');
      }
    } catch (error) {
      console.error('OMNI purchase error:', error);
      Alert.alert('Error', 'Failed to extend verification');
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

  // Check OMNI affordability when component loads or plan changes
  useEffect(() => {
    const checkAffordability = async () => {
      if (profileData?.username) {
        const omniAmount = selectedPlan === 'monthly' ? 1000 : 10000;
        const affordability = await checkVerificationAffordability(omniAmount);
        setOmniAffordability(affordability);
      }
    };
    
    checkAffordability();
  }, [profileData?.username, selectedPlan, checkVerificationAffordability]);

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
              <CheckCircle size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>You&apos;re Verified</Text>
            <Text style={styles.successSubtitle}>
              Active verification subscription
            </Text>
          </View>

          {/* Verification Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.sectionTitle}>Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Shield size={20} color="#10B981" />
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
            <Text style={styles.sectionTitle}>Profile Preview</Text>
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
            <Text style={styles.sectionTitle}>Benefits</Text>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.benefitText}>Verified badge on profile</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.benefitText}>Higher buyer response rates</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.benefitText}>Extra OMNI tokens per transaction</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <CheckCircle size={16} color="#10B981" />
              <Text style={styles.benefitText}>Early access to new features</Text>
            </View>
          </View>

          {/* Renewal/Upgrade Section */}
          <View style={styles.renewalContainer}>
            <Text style={styles.sectionTitle}>Extend or Switch Plan</Text>
            
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
                    {monthlySubscription?.title || '₹19'}
                  </Text>
                  <Text style={styles.priceUnit}>/month</Text>
                </View>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>81% OFF</Text>
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
                    {annualSubscription?.title || '₹199'}
                  </Text>
                  <Text style={styles.priceUnit}>/year</Text>
                </View>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>83% OFF</Text>
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
                {isLoading ? 'Processing...' : 'Extend with Google Play'}
              </Text>
            </TouchableOpacity>

            {/* Auto-Renewal Notice */}
            <View style={styles.autoRenewalNotice}>
              <Text style={styles.autoRenewalText}>
                Auto-renewal: Cancel anytime in Google Play settings
              </Text>
            </View>
          </View>

          {/* OMNI Renewal Section */}
          <View style={styles.omniContainer}>
            <Text style={styles.sectionTitle}>Extend with OMNI Tokens</Text>
            <Text style={styles.omniSubtitle}>
              Use earned OMNI tokens to extend verification
            </Text>
            
            <View style={styles.omniCard}>
              <View style={styles.omniHeader}>
                <View style={styles.omniIcon}>
                  <Award size={28} color="#10B981" />
                </View>
                <View style={styles.omniContent}>
                  <Text style={styles.omniTitle}>OMNI Extension</Text>
                  <Text style={styles.omniDescription}>
                    {selectedPlan === 'monthly' ? '1 Month Extension' : '1 Year Extension'}
                  </Text>
                </View>
                <View style={styles.omniPrice}>
                  <Text style={styles.omniPriceText}>
                    {selectedPlan === 'monthly' ? '1,000' : '10,000'}
                  </Text>
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
                    Need {omniAffordability.shortfall} more OMNI tokens
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
                      ? 'Extend with OMNI' 
                      : 'Earn More OMNI'
                  }
                </Text>
              </TouchableOpacity>
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
            <Shield size={40} color="#10B981" />
          </View>
          <Text style={styles.heroTitle}>Get Verified</Text>
          <Text style={styles.heroSubtitle}>
            Build trust and increase sales
          </Text>
        </View>

        {/* Preview */}
        <View style={styles.appearanceContainer}>
          <Text style={styles.sectionTitle}>Preview</Text>
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
          <Text style={styles.sectionTitle}>Benefits</Text>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#10B981" />
            <Text style={styles.benefitText}>Verified badge on profile</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#10B981" />
            <Text style={styles.benefitText}>Higher buyer response rates</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#10B981" />
            <Text style={styles.benefitText}>Extra OMNI tokens per transaction</Text>
          </View>
          
          <View style={styles.benefitItem}>
            <Star size={16} color="#10B981" />
            <Text style={styles.benefitText}>Early access to new features</Text>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingContainer}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          
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
                  {monthlySubscription?.title || '₹19'}
                </Text>
                <Text style={styles.priceUnit}>/month</Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>81% OFF</Text>
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
                  {annualSubscription?.title || '₹199'}
                </Text>
                <Text style={styles.priceUnit}>/year</Text>
              </View>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>83% OFF</Text>
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
              Auto-renewal: Cancel anytime in Google Play settings
            </Text>
          </View>
        </View>

        {/* OMNI Verification Section */}
        <View style={styles.omniContainer}>
          <Text style={styles.sectionTitle}>Pay with OMNI Tokens</Text>
          <Text style={styles.omniSubtitle}>
            Use earned OMNI tokens - no real money required
          </Text>
          
          <View style={styles.omniCard}>
            <View style={styles.omniHeader}>
              <View style={styles.omniIcon}>
                <Award size={28} color="#10B981" />
              </View>
              <View style={styles.omniContent}>
                <Text style={styles.omniTitle}>OMNI Verification</Text>
                <Text style={styles.omniDescription}>1 Month Verification</Text>
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
                  Need {omniAffordability.shortfall} more OMNI tokens
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
                    ? 'Purchase with OMNI' 
                    : 'Earn More OMNI'
                }
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.omniInfo}>
            <Text style={styles.omniInfoText}>
              • Instant verification with OMNI tokens{'\n'}
              • Earn OMNI through daily check-ins{'\n'}
              • Same benefits as paid verification
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <Info size={20} color="#64748B" />
            <Text style={styles.infoTitle}>Important</Text>
          </View>
          <Text style={styles.infoText}>
            • Verification processed immediately{'\n'}
            • Cancel anytime in Google Play{'\n'}
            • OMNI purchases are final{'\n'}
            • Contact support for issues
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Verified Status
  verifiedContainer: {
    backgroundColor: '#F0FDF4',
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section Styling
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },

  // Details Section
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },

  // Appearance Section
  appearanceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginRight: 8,
  },
  demoUsername: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  demoVerificationBadge: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  demoTick: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    marginRight: 4,
  },
  demoVerifiedText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // Benefits Section
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },

  // Renewal Section
  renewalContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },

  // Pricing Section
  pricingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  planOptionSelected: {
    backgroundColor: '#10B981',
  },
  planOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  planOptionTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 12,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  pricingCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pricingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  selectedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  pricingAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginRight: 8,
  },
  currentPrice: {
    color: '#10B981',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  priceUnit: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
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
    fontFamily: 'Inter-SemiBold',
  },
  purchaseButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  autoRenewalNotice: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
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
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },

  // Info Section
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },

  // Action Buttons
  actionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 13,
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
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },

  // OMNI Verification Styles - Positive & Appealing
  omniContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  omniSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    marginBottom: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  omniCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  omniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#064E3B',
    marginBottom: 4,
  },
  omniDescription: {
    fontSize: 13,
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  omniPriceLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginTop: -2,
    opacity: 0.9,
  },
  omniBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  omniBalanceLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#065F46',
  },
  omniBalanceValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  omniInsufficient: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  omniInsufficientText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#D97706',
    textAlign: 'center',
  },
  omniButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
  omniInfo: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  omniInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#065F46',
    lineHeight: 18,
  },
  omniInfoBold: {
    fontFamily: 'Inter-SemiBold',
    color: '#064E3B',
  },
});

export default VerificationPage;
