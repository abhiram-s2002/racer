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
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleContact = () => {
    Linking.openURL('mailto:support@omnimart.com');
  };

  const handleCall = () => {
    Linking.openURL('tel:+1234567890');
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to OmniMart</Text>
          <Text style={styles.paragraph}>
            These Terms of Service (&quot;Terms&quot;) govern your use of the OmniMart mobile application and services. By using OmniMart, you agree to these Terms.
          </Text>
          <Text style={styles.paragraph}>
            Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Acceptance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By downloading, installing, or using the OmniMart app, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the app.
          </Text>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.paragraph}>
            OmniMart is a local marketplace platform that connects buyers and sellers in your community. Users can:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• List items for sale</Text>
            <Text style={styles.bullet}>• Browse and purchase items</Text>
            <Text style={styles.bullet}>• Communicate with other users</Text>
            <Text style={styles.bullet}>• Earn rewards through referrals</Text>
          </View>
        </View>

        {/* User Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your account information and for all activities under your account.
          </Text>
          <Text style={styles.paragraph}>
            You must provide accurate and complete information when creating your account. You may not use another person&apos;s account or share your account credentials.
          </Text>
        </View>

        {/* User Conduct */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree not to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Post illegal, harmful, or inappropriate content</Text>
            <Text style={styles.bullet}>• Harass, threaten, or abuse other users</Text>
            <Text style={styles.bullet}>• Post counterfeit or stolen items</Text>
            <Text style={styles.bullet}>• Use the service for commercial purposes without permission</Text>
            <Text style={styles.bullet}>• Attempt to gain unauthorized access to the service</Text>
            <Text style={styles.bullet}>• Violate any applicable laws or regulations</Text>
          </View>
        </View>

        {/* Listing Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Listing Guidelines</Text>
          <Text style={styles.paragraph}>
            When creating listings, you must:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Provide accurate descriptions and photos</Text>
            <Text style={styles.bullet}>• Set fair and reasonable prices</Text>
            <Text style={styles.bullet}>• Respond promptly to buyer inquiries</Text>
            <Text style={styles.bullet}>• Complete transactions in good faith</Text>
          </View>
          <Text style={styles.paragraph}>
            OmniMart reserves the right to remove listings that violate these guidelines.
          </Text>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Transactions</Text>
          <Text style={styles.paragraph}>
            OmniMart facilitates connections between buyers and sellers but is not a party to transactions. Users are responsible for:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Negotiating terms and conditions</Text>
            <Text style={styles.bullet}>• Arranging payment and delivery</Text>
            <Text style={styles.bullet}>• Resolving disputes between parties</Text>
            <Text style={styles.bullet}>• Complying with local laws and regulations</Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            OmniMart and its content are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without permission.
          </Text>
        </View>

        {/* Limitation of Liability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            OmniMart is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from your use of the service, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Transaction disputes between users</Text>
            <Text style={styles.bullet}>• Loss of data or information</Text>
            <Text style={styles.bullet}>• Service interruptions or errors</Text>
            <Text style={styles.bullet}>• Third-party actions or content</Text>
          </View>
        </View>

        {/* Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for violations of these Terms. You may also delete your account at any time.
          </Text>
        </View>

        {/* Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. We will notify you of significant changes through the app or email. Continued use of the service constitutes acceptance of updated Terms.
          </Text>
        </View>

        {/* Governing Law */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved in the courts of [Your Jurisdiction].
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us:
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
            <Mail size={16} color="#22C55E" />
            <Text style={styles.contactText}>support@omnimart.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <Phone size={16} color="#22C55E" />
            <Text style={styles.contactText}>+1 (234) 567-8900</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <MapPin size={16} color="#22C55E" />
            <Text style={styles.contactText}>123 Market Street, City, State 12345</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} OmniMart. All rights reserved.
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
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