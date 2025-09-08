import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MessageCircle, CheckCircle, Star } from 'lucide-react-native';

interface VerificationPricingCardProps {
  onGetVerified?: () => void;
  userName?: string;
}

const VerificationPricingCard: React.FC<VerificationPricingCardProps> = ({ 
  onGetVerified,
  userName = 'Your Name'
}) => {
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
          • Extra Omni Points for every transaction{'\n'}
          • Company shares allocation program{'\n'}
          • Exclusive early access to new features
        </Text>
      </View>

      {/* Pricing Options */}
      <View style={styles.pricingContainer}>
        <Text style={styles.emotionalPrice}>Get verified at just ₹19/month!</Text>
        
        {/* Pricing Row - Two Columns */}
        <View style={styles.pricingRow}>
          {/* Monthly Plan */}
          <View style={styles.pricingColumn}>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>₹100</Text>
              <Text style={styles.currentPrice}>₹19/month</Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>81% OFF!</Text>
            </View>
          </View>

          {/* Annual Plan */}
          <View style={styles.pricingColumn}>
            <View style={styles.priceRow}>
              <Text style={styles.originalPrice}>₹1200</Text>
              <Text style={styles.currentPrice}>₹199/year</Text>
            </View>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>83% OFF!</Text>
            </View>
          </View>
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

      {/* Action Button */}
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={handleWhatsAppContact}
        activeOpacity={0.8}
      >
        <MessageCircle size={20} color="#FFFFFF" />
        <Text style={styles.actionButtonText}>Get Verified Now</Text>
      </TouchableOpacity>
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
});

export default VerificationPricingCard;
