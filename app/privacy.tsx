import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Phone, Shield, Eye, Lock, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { withErrorBoundary } from '@/components/ErrorBoundary';

function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleContact = () => {
    Linking.openURL('mailto:risingsoup76@gmail.com');
  };

  const handleCall = () => {
    Linking.openURL('tel:+917306519350');
  };

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Shield size={24} color="#22C55E" />
          </View>
          <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
          <Text style={styles.paragraph}>
            At GeoMart, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.
          </Text>
          <Text style={styles.paragraph}>
            Last updated: January 25, 2025
          </Text>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Name and contact information</Text>
            <Text style={styles.bullet}>• Phone number and email address</Text>
            <Text style={styles.bullet}>• Profile pictures and avatars</Text>
            <Text style={styles.bullet}>• Location information (with your consent)</Text>
            <Text style={styles.bullet}>• Verification data and documents</Text>
            <Text style={styles.bullet}>• App settings and preferences</Text>
          </View>

          <Text style={styles.subsectionTitle}>Usage Information</Text>
          <Text style={styles.paragraph}>
            We automatically collect certain information when you use our app:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Device information and app usage</Text>
            <Text style={styles.bullet}>• Search queries and browsing history</Text>
            <Text style={styles.bullet}>• Communication data (messages, pings)</Text>
            <Text style={styles.bullet}>• Transaction history and preferences</Text>
            <Text style={styles.bullet}>• Ratings, reviews, and leaderboard participation</Text>
            <Text style={styles.bullet}>• Security events and login attempts</Text>
          </View>
        </View>

        {/* How We Use Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Provide and improve our marketplace services</Text>
            <Text style={styles.bullet}>• Connect buyers and sellers in your area</Text>
            <Text style={styles.bullet}>• Process transactions and manage accounts</Text>
            <Text style={styles.bullet}>• Send notifications and updates</Text>
            <Text style={styles.bullet}>• Prevent fraud and ensure security</Text>
            <Text style={styles.bullet}>• Analyze usage patterns and trends</Text>
            <Text style={styles.bullet}>• Implement verification systems</Text>
            <Text style={styles.bullet}>• Manage rewards and leaderboard systems</Text>
            <Text style={styles.bullet}>• Provide customer support</Text>
          </View>
        </View>

        {/* Information Sharing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in these limited circumstances:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• With other users (as part of marketplace functionality)</Text>
            <Text style={styles.bullet}>• With service providers who help us operate the app</Text>
            <Text style={styles.bullet}>• When required by law or to protect our rights</Text>
            <Text style={styles.bullet}>• With your explicit consent</Text>
            <Text style={styles.bullet}>• With identity verification services</Text>
            <Text style={styles.bullet}>• With security and fraud detection services</Text>
          </View>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Lock size={24} color="#22C55E" />
          </View>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Encryption of data in transit and at rest</Text>
            <Text style={styles.bullet}>• Secure authentication and access controls</Text>
            <Text style={styles.bullet}>• Regular security audits and updates</Text>
            <Text style={styles.bullet}>• Limited access to personal information</Text>
            <Text style={styles.bullet}>• Multi-factor authentication where appropriate</Text>
            <Text style={styles.bullet}>• Intrusion detection and prevention systems</Text>
            <Text style={styles.bullet}>• Data backup and disaster recovery procedures</Text>
          </View>
        </View>

        {/* Data Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your information for as long as necessary to provide our services and comply with legal obligations:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Account information: Until account deletion</Text>
            <Text style={styles.bullet}>• Transaction data: 7 years for tax purposes</Text>
            <Text style={styles.bullet}>• Communication data: Until account deletion</Text>
            <Text style={styles.bullet}>• Usage analytics: 2 years (anonymized)</Text>
            <Text style={styles.bullet}>• Location data: 1 year after last use</Text>
            <Text style={styles.bullet}>• Verification data: 3 years after verification</Text>
            <Text style={styles.bullet}>• Support data: 2 years after resolution</Text>
          </View>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Eye size={24} color="#22C55E" />
          </View>
          <Text style={styles.sectionTitle}>6. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the following rights regarding your personal information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Access your personal data</Text>
            <Text style={styles.bullet}>• Correct inaccurate information</Text>
            <Text style={styles.bullet}>• Delete your account and data</Text>
            <Text style={styles.bullet}>• Export your data</Text>
            <Text style={styles.bullet}>• Opt out of marketing communications</Text>
            <Text style={styles.bullet}>• Restrict data processing</Text>
            <Text style={styles.bullet}>• Object to processing</Text>
            <Text style={styles.bullet}>• Withdraw consent at any time</Text>
            <Text style={styles.bullet}>• Lodge complaints with supervisory authorities</Text>
          </View>
        </View>

        {/* Cookies and Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Cookies and Tracking</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Remember your preferences and settings</Text>
            <Text style={styles.bullet}>• Analyze app usage and performance</Text>
            <Text style={styles.bullet}>• Provide personalized content</Text>
            <Text style={styles.bullet}>• Ensure security and prevent fraud</Text>
            <Text style={styles.bullet}>• Enable essential app functionality</Text>
            <Text style={styles.bullet}>• Monitor app performance</Text>
          </View>
          <Text style={styles.paragraph}>
            You can control cookie settings through your device settings. We provide cookie preferences in our app settings.
          </Text>
        </View>

        {/* Third-Party Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Our app may integrate with third-party services:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Payment processors (for future features)</Text>
            <Text style={styles.bullet}>• Analytics services (Google Analytics)</Text>
            <Text style={styles.bullet}>• Cloud storage providers</Text>
            <Text style={styles.bullet}>• Communication services</Text>
            <Text style={styles.bullet}>• Identity verification services</Text>
            <Text style={styles.bullet}>• Location services and map providers</Text>
            <Text style={styles.bullet}>• Security and fraud detection services</Text>
          </View>
          <Text style={styles.paragraph}>
            These services have their own privacy policies, which we encourage you to review.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children&apos;s Privacy</Text>
          <Text style={styles.paragraph}>
            GeoMart is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are between 13 and 18 years old, you must have parental consent to use our services.
          </Text>
          <Text style={styles.paragraph}>
            If you believe we have collected information from a child under 13, please contact us immediately. We will take steps to delete such information and prevent further collection.
          </Text>
        </View>

        {/* International Transfers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.
          </Text>
          <Text style={styles.paragraph}>
            We use Standard Contractual Clauses for EU to non-EU transfers and maintain data processing agreements with all third-party service providers.
          </Text>
        </View>

        {/* Changes to Privacy Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or email. Your continued use of the service constitutes acceptance of the updated policy.
          </Text>
          <Text style={styles.paragraph}>
            For material changes, we will provide at least 30 days&apos; notice before the changes take effect.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Users size={24} color="#22C55E" />
          </View>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
            <Mail size={16} color="#22C55E" />
            <Text style={styles.contactText}>risingsoup76@gmail.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <Phone size={16} color="#22C55E" />
            <Text style={styles.contactText}>+91 7306 51 9350</Text>
          </TouchableOpacity>
          
          <Text style={styles.paragraph}>
            Business Hours: Monday to Friday, 9:00 AM to 6:00 PM IST
          </Text>
          <Text style={styles.paragraph}>
            Response Time: We aim to respond to privacy inquiries within 48 hours
          </Text>
          <Text style={styles.paragraph}>
            Data Protection Officer: risingsoup76@gmail.com
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} GeoMart. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
  },
});

export default withErrorBoundary(PrivacyScreen);