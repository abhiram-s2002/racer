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
  Users, 
  Award,
  Info,
  ExternalLink
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_PRODUCTS } from '@/utils/subscriptionService';
import { useCachedProfile } from '@/hooks/useCachedProfile';
import { isUserVerified } from '@/utils/verificationUtils';
import VerificationBadge from '@/components/VerificationBadge';

const VerificationPage = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profileData } = useCachedProfile();
  
  const {
    isLoading,
    hasActiveSubscription,
    purchaseSubscription,
    restorePurchases,
    subscriptions,
    isVerified,
    verificationStatus,
    verificationExpiresAt,
    refreshVerificationStatus,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const [refreshing, setRefreshing] = useState(false);

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


  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

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
            <Text style={styles.successTitle}>You're Verified! 🎉</Text>
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
          <Text style={styles.sectionTitle}>How You'll Appear to Others</Text>
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
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentContainer}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          
          <TouchableOpacity 
            style={styles.paymentMethod}
            onPress={handlePurchase}
            disabled={isLoading}
          >
            <View style={styles.paymentMethodIcon}>
              <CreditCard size={24} color="#22C55E" />
            </View>
            <View style={styles.paymentMethodContent}>
              <Text style={styles.paymentMethodTitle}>Google Play Billing</Text>
              <Text style={styles.paymentMethodSubtitle}>Secure payment through Google Play</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color="#22C55E" />
            ) : (
              <ExternalLink size={20} color="#64748B" />
            )}
          </TouchableOpacity>

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
            • Contact support if you have any issues
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handlePurchase}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <CreditCard size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Processing...' : 'Subscribe with Google Play'}
            </Text>
          </TouchableOpacity>

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

  // Payment Methods
  paymentContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentMethodIcon: {
    marginRight: 16,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
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
});

export default VerificationPage;
