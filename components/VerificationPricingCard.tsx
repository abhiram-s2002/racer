import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Alert } from 'react-native';
import { MessageCircle, CheckCircle, Star, CreditCard } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';
import { SUBSCRIPTION_PRODUCTS } from '../utils/subscriptionService';

interface VerificationPricingCardProps {
  onGetVerified?: () => void;
  userName?: string;
}

const VerificationPricingCard: React.FC<VerificationPricingCardProps> = ({ 
  onGetVerified,
  userName = 'Your Name'
}) => {
  const { 
    isLoading, 
    hasActiveSubscription, 
    purchaseSubscription, 
    restorePurchases,
    subscriptions 
  } = useSubscription();
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  // Get subscription pricing from loaded subscriptions
  const monthlySubscription = subscriptions.find(sub => sub.productId === SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION);
  const annualSubscription = subscriptions.find(sub => sub.productId === SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION);

  const handlePurchase = async () => {
    try {
      const productId = selectedPlan === 'monthly' 
        ? SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION 
        : SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION;
      
      await purchaseSubscription(productId);
      
      if (onGetVerified) {
        onGetVerified();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  const handleWhatsAppContact = () => {
    const message = "Hi! I'd like to get verified on OmniMarketplace. Please let me know the process and payment details.";
    const phoneNumber = "7306519350";
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      // Fallback to web WhatsApp if app not installed
      const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl);
    });
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      console.error('Restore error:', error);
    }
  };

  // If user already has active subscription, show different UI
  if (hasActiveSubscription) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <CheckCircle size={20} color="#22C55E" />
            </View>
            <Text style={styles.title}>You&apos;re Verified!</Text>
          </View>
        </View>

        <View style={styles.verifiedSection}>
          <Text style={styles.verifiedText}>
            🎉 Congratulations! You have an active verification subscription.
          </Text>
          
          <View style={styles.demoUserRow}>
            <Text style={styles.demoUserName}>{userName}</Text>
            <View style={styles.demoVerificationBadge}>
              <Text style={styles.demoTick}>✓</Text>
              <Text style={styles.demoVerifiedText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestorePurchases}
          activeOpacity={0.8}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <CheckCircle size={20} color="#22C55E" />
          </View>
          <Text style={styles.title}>Get Verified</Text>
        </View>
        <View style={styles.launchBadge}>
          <Text style={styles.launchBadgeText}>🚀 LAUNCH SPECIAL!</Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactSection}>
        <Text style={styles.contactText}>Contact: 7306519350 (WhatsApp)</Text>
      </View>

      {/* Demo Section - Show how verification looks */}
      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>See how you&apos;ll look when verified:</Text>
        <View style={styles.demoUserRow}>
          <Text style={styles.demoUserName}>{userName}</Text>
          <View style={styles.demoVerificationBadge}>
            <Text style={styles.demoTick}>✓</Text>
            <Text style={styles.demoVerifiedText}>VERIFIED</Text>
          </View>
        </View>
      </View>

      {/* Emotional Hook */}
      <Text style={styles.emotionalHook}>Build Trust, Get More Sales!</Text>
      
      {/* Additional Benefits Description */}
      <View style={styles.extraBenefitsSection}>
        <Text style={styles.extraBenefitsTitle}>🎁 Verified Members Get:</Text>
        <Text style={styles.extraBenefitsText}>
          • Extra OMNI tokens for every transaction{'\n'}
          • Early access to future app features{'\n'}
          • Premium gamification benefits
        </Text>
      </View>

      {/* Pricing Options */}
      <View style={styles.pricingContainer}>
        <Text style={styles.emotionalPrice}>Get verified with Google Play!</Text>
        
        {/* Plan Selection */}
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
        
        {/* Pricing Row - Two Columns */}
        <View style={styles.pricingRow}>
          {/* Monthly Plan */}
          <TouchableOpacity 
            style={[
              styles.pricingColumn,
              selectedPlan === 'monthly' && styles.pricingColumnSelected
            ]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>₹100</Text>
              <Text style={styles.currentPrice}>
                {monthlySubscription?.title || '₹19'}/month
              </Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>81% OFF!</Text>
            </View>
            {selectedPlan === 'monthly' && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Annual Plan */}
          <TouchableOpacity 
            style={[
              styles.pricingColumn,
              selectedPlan === 'annual' && styles.pricingColumnSelected
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>₹1200</Text>
              <Text style={styles.currentPrice}>
                {annualSubscription?.title || '₹199'}/year
              </Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>83% OFF!</Text>
            </View>
            {selectedPlan === 'annual' && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.selectedText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <Star size={14} color="#22C55E" />
          <Text style={styles.benefitText}>Build trust with buyers & sellers</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Star size={14} color="#22C55E" />
          <Text style={styles.benefitText}>Verified badge on your profile</Text>
        </View>
        <View style={styles.benefitItem}>
          <Star size={14} color="#22C55E" />
          <Text style={styles.benefitText}>Higher response rates</Text>
        </View>
        
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handlePurchase}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <CreditCard size={20} color="#FFFFFF" />
          )}
          <Text style={styles.actionButtonText}>
            {isLoading ? 'Processing...' : 'Subscribe with Google Play'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleWhatsAppContact}
          activeOpacity={0.8}
        >
          <MessageCircle size={16} color="#22C55E" />
          <Text style={styles.secondaryButtonText}>Contact via WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.restoreButton} 
          onPress={handleRestorePurchases}
          activeOpacity={0.8}
        >
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  contactSection: {
    marginBottom: 12,
  },
  contactText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  launchBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  launchBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  demoSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  demoUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoUserName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginRight: 8,
  },
  demoVerificationBadge: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  demoTick: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginRight: 3,
  },
  demoVerifiedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emotionalHook: {
    color: '#1E293B',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  extraBenefitsSection: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  extraBenefitsTitle: {
    color: '#16A34A',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  extraBenefitsText: {
    color: '#15803D',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 16,
  },
  pricingContainer: {
    marginBottom: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  pricingColumn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'center',
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginRight: 8,
  },
  currentPrice: {
    color: '#22C55E',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  emotionalPrice: {
    color: '#22C55E',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 12,
  },
  savingsBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'center',
  },
  savingsText: {
    color: '#EF4444',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 6,
  },
  verifiedSection: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedText: {
    color: '#15803D',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 12,
  },
  planSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  planOptionSelected: {
    backgroundColor: '#22C55E',
  },
  planOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  planOptionTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
  },
  pricingColumnSelected: {
    borderColor: '#22C55E',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  actionButtonsContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#22C55E',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginLeft: 6,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  secondaryButtonText: {
    color: '#22C55E',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  restoreButton: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },
});

export default VerificationPricingCard;
