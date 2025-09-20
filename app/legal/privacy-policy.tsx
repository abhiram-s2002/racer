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
import { ArrowLeft, Mail, Phone, Shield, Eye, Lock, Users, MapPin, PhoneCall, CheckCircle2 } from 'lucide-react-native';
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

  const openWebPolicy = () => {
    Linking.openURL('https://abhiram-s2002.github.io/geomart-privacy/privacy-policy.html');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Shield size={24} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
          <Text style={styles.paragraph}>
            At GeoMart, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.
          </Text>
          <Text style={styles.paragraph}>Last updated: September 18, 2025</Text>

          <TouchableOpacity style={styles.linkButton} onPress={openWebPolicy}>
            <Text style={styles.linkButtonText}>View Full Policy on the Web</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.subsectionTitle}>Personal Information</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Name, username, display name</Text>
            <Text style={styles.bullet}>• Email address and phone number</Text>
            <Text style={styles.bullet}>• Profile photos, avatars, bios</Text>
            <Text style={styles.bullet}>• Verification data (phone verification, identity signals)</Text>
            <Text style={styles.bullet}>• Privacy preferences (phone sharing, location visibility)</Text>
          </View>

          <Text style={styles.subsectionTitle}>Marketplace & Requests</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Listings and requests content, images, categories</Text>
            <Text style={styles.bullet}>• Pings and messages between users</Text>
            <Text style={styles.bullet}>• Ratings, reviews, and reports</Text>
            <Text style={styles.bullet}>• Favorites, hidden items, blocked users</Text>
          </View>

          <Text style={styles.subsectionTitle}>Usage & Device</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Device and app info (model, OS, version)</Text>
            <Text style={styles.bullet}>• Logs, errors, and performance metrics</Text>
            <Text style={styles.bullet}>• Analytics on features used and engagement</Text>
          </View>

          <Text style={styles.subsectionTitle}>Location</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Approximate or precise location (with permission)</Text>
            <Text style={styles.bullet}>• Derived distances to listings/requests</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Provide and improve marketplace and request features</Text>
            <Text style={styles.bullet}>• Facilitate messaging, pings, and notifications</Text>
            <Text style={styles.bullet}>• Show nearby items using your location</Text>
            <Text style={styles.bullet}>• Implement verification and trust indicators</Text>
            <Text style={styles.bullet}>• Enforce policies by moderating usernames, listings, and requests</Text>
            <Text style={styles.bullet}>• Detect fraud, abuse, and security incidents</Text>
            <Text style={styles.bullet}>• Measure performance and improve UX</Text>
            <Text style={styles.bullet}>• Manage OMNI rewards, achievements, leaderboards (no monetary value)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Phone Sharing & Visibility</Text>
          <View style={styles.inlineIcon}><PhoneCall size={18} color="#10B981" /><Text style={styles.inlineIconText}>Granular user control</Text></View>
          <Text style={styles.paragraph}>
            You control whether your phone number is visible to others. Phone sharing settings can be changed any time. When enabled, your phone number may be shown to buyers/sellers in relevant interactions; when disabled, it remains hidden.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Toggle in Settings → Privacy → Phone Sharing</Text>
            <Text style={styles.bullet}>• We store your preference and last-updated time</Text>
            <Text style={styles.bullet}>• We never sell your phone number</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Location Sharing & Visibility</Text>
          <View style={styles.inlineIcon}><MapPin size={18} color="#10B981" /><Text style={styles.inlineIconText}>Opt-in location features</Text></View>
          <Text style={styles.paragraph}>
            Location access is optional and used to power nearby search and relevance. You can disable precise location in device settings; the app will fall back to approximate location or manual selection.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Used to sort listings/requests by distance</Text>
            <Text style={styles.bullet}>• Never shared with third parties for advertising</Text>
            <Text style={styles.bullet}>• Can be disabled at any time in system settings</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Verification & Trust</Text>
          <View style={styles.inlineIcon}><CheckCircle2 size={18} color="#10B981" /><Text style={styles.inlineIconText}>Strengthening platform safety</Text></View>
          <Text style={styles.paragraph}>
            We process verification data (e.g., phone verification and identity signals) to show badges and improve trust. Your verification status may be visible on your profile and content.
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Limited retention of verification records</Text>
            <Text style={styles.bullet}>• Used only for safety and Trust & Safety reviews</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Information Sharing</Text>
          <Text style={styles.paragraph}>We do not sell personal data. We may share limited data:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• With other users as part of marketplace functionality</Text>
            <Text style={styles.bullet}>• With service providers (Supabase, Sentry, Analytics, Maps)</Text>
            <Text style={styles.bullet}>• When required by law or to enforce policies</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Lock size={24} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>7. Security</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Encryption in transit and at rest</Text>
            <Text style={styles.bullet}>• RLS policies to isolate user data</Text>
            <Text style={styles.bullet}>• Access controls and audit logging</Text>
            <Text style={styles.bullet}>• Regular reviews and updates</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Retention</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Account data: until deletion</Text>
            <Text style={styles.bullet}>• Communications: while account is active</Text>
            <Text style={styles.bullet}>• Verification: typically up to 3 years</Text>
            <Text style={styles.bullet}>• Analytics logs: time-limited and aggregated</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Eye size={24} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>9. Your Rights</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>• Access, rectify, delete, export your data</Text>
            <Text style={styles.bullet}>• Withdraw consent and manage preferences</Text>
            <Text style={styles.bullet}>• Request updates to non-compliant identifiers (including usernames)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children’s Privacy</Text>
          <Text style={styles.paragraph}>Not for children under 13. If collected inadvertently, we will delete.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.paragraph}>We will notify you of material changes in-app or by email. Continued use means acceptance.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.iconContainer}>
            <Users size={24} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>Questions or privacy requests:</Text>
          <TouchableOpacity style={styles.contactItem} onPress={handleContact}>
            <Mail size={16} color="#10B981" />
            <Text style={styles.contactText}>risingsoup76@gmail.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
            <Phone size={16} color="#10B981" />
            <Text style={styles.contactText}>+91 7306 51 9350</Text>
          </TouchableOpacity>
          <Text style={styles.paragraph}>Address: Kozhikode, Kerala, India</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} GeoMart. All rights reserved.</Text>
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
  inlineIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inlineIconText: {
    fontSize: 13,
    color: '#0F766E',
  },
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#059669',
    fontFamily: 'Inter-Medium',
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