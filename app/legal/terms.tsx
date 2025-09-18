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
import { withErrorBoundary } from '@/components/ErrorBoundary';

function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Welcome to GeoMart</Text>
          <Text style={styles.paragraph}>
            These Terms of Service (&quot;Terms&quot;) govern your use of the GeoMart mobile application and services. By using GeoMart, you agree to these Terms.
          </Text>
          <Text style={styles.paragraph}>
            Last updated: September 18, 2025
          </Text>
        </View>

        {/* Acceptance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By downloading, installing, or using the GeoMart app, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the app.
          </Text>
        </View>

        {/* Service Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.paragraph}>
            GeoMart is a comprehensive local marketplace platform that connects buyers and sellers in your community. Users can:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Create, manage, and browse listings for items and services</Text>
            <Text style={styles.bullet}>• Communicate with other users through secure messaging and pings</Text>
            <Text style={styles.bullet}>• Access location-based features and sorting</Text>
            <Text style={styles.bullet}>• Earn rewards, achievements, and leaderboard recognition</Text>
            <Text style={styles.bullet}>• Utilize verification systems for enhanced trust and safety</Text>
            <Text style={styles.bullet}>• Participate in community ratings and feedback systems</Text>
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
          <Text style={styles.paragraph}>
            You must be at least 18 years old or have parental consent to use our services. You must verify your phone number and email address.
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
            <Text style={styles.bullet}>• Create fake accounts or use multiple accounts</Text>
            <Text style={styles.bullet}>• Manipulate ratings, reviews, or feedback systems</Text>
            <Text style={styles.bullet}>• Share account credentials with others</Text>
            <Text style={styles.bullet}>• Use deceptive, infringing, profane, or hateful usernames</Text>
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
            <Text style={styles.bullet}>• Include clear, high-quality images when applicable</Text>
            <Text style={styles.bullet}>• Comply with local and international trade regulations</Text>
            <Text style={styles.bullet}>• Not contain copyrighted material without permission</Text>
            <Text style={styles.bullet}>• For requests: clearly describe the wanted item/service and terms</Text>
          </View>
          <Text style={styles.paragraph}>
            GeoMart reserves the right to remove listings that violate these guidelines.
          </Text>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Transactions</Text>
          <Text style={styles.paragraph}>
            GeoMart facilitates connections between buyers and sellers but is not a party to transactions. Users are responsible for:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Negotiating terms and conditions</Text>
            <Text style={styles.bullet}>• Arranging payment and delivery</Text>
            <Text style={styles.bullet}>• Resolving disputes between parties</Text>
            <Text style={styles.bullet}>• Complying with local laws and regulations</Text>
            <Text style={styles.bullet}>• All tax obligations related to transactions</Text>
            <Text style={styles.bullet}>• Ensuring items comply with safety standards</Text>
            <Text style={styles.bullet}>• Verifying the legal right to sell items</Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
          </Text>
          <Text style={styles.paragraph}>
            We process your data based on legitimate interests, contractual necessity, and legal obligations. You have rights regarding your personal data including access, correction, deletion, and portability.
          </Text>
        </View>

        {/* Intellectual Property */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            GeoMart and its content are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our content without permission.
          </Text>
          <Text style={styles.paragraph}>
            You retain ownership of content you create and post, but grant us a worldwide, non-exclusive, royalty-free license to use your content to provide and improve our services.
          </Text>
        </View>

        {/* Limitation of Liability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            GeoMart is provided &quot;as is&quot; without warranties. We are not liable for any damages arising from your use of the service, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Transaction disputes between users</Text>
            <Text style={styles.bullet}>• Loss of data or information</Text>
            <Text style={styles.bullet}>• Service interruptions or errors</Text>
            <Text style={styles.bullet}>• Third-party actions or content</Text>
            <Text style={styles.bullet}>• Any loss of profits, business, or opportunities</Text>
            <Text style={styles.bullet}>• Damages arising from your violation of these Terms</Text>
            <Text style={styles.bullet}>• Changes applied to non-compliant usernames for safety or legality</Text>
          </View>
        </View>

        {/* Termination */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for violations of these Terms. You may also delete your account at any time.
          </Text>
          <Text style={styles.paragraph}>
            Upon termination, your access to the service will cease, your content may be removed, and we may retain certain data as required by law. Repeated use of non-compliant usernames or refusal to remedy policy violations may result in suspension.
          </Text>
        </View>

        {/* Changes to Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. We will notify you of significant changes through the app or email. Continued use of the service constitutes acceptance of updated Terms.
          </Text>
          <Text style={styles.paragraph}>
            For material changes, we will provide at least 30 days&apos; notice before the changes take effect. We also update in-app legal screens when relevant.
          </Text>
        </View>

        {/* Governing Law */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of India. Any disputes will be resolved in the courts of Kozhikode, Kerala, India.
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us:
          </Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
            <Mail size={16} color="#10B981" />
            <Text style={styles.contactText}>risingsoup76@gmail.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <Phone size={16} color="#10B981" />
            <Text style={styles.contactText}>+91 7306 51 9350</Text>
          </TouchableOpacity>
          
          <View style={styles.contactItem}>
            <MapPin size={16} color="#10B981" />
            <Text style={styles.contactText}>Kozhikode, Kerala, India</Text>
          </View>
          
          <Text style={styles.paragraph}>
            Business Hours: Monday to Friday, 9:00 AM to 6:00 PM IST
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

export default withErrorBoundary(TermsScreen, 'TermsScreen'); 