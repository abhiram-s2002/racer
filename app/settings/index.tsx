import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  BackHandler,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Shield, 
  Trash2, 
  LogOut,
  Eye,
  MapPin,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  Info,
  UserX,
  EyeOff,
  Flag,
  Phone
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { signOut } from '@/utils/auth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { withErrorBoundary } from '@/components/ErrorBoundary';

function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, loading, saving, updateSetting, resetSettings, refreshSettings } = useAppSettings();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Handle back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      router.push('/(tabs)/profile');
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    } catch (error) {
      // Error loading user profile
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/auth');
            } catch (error) {
              // Error during logout
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmation.toLowerCase() !== 'delete') {
      Alert.alert('Error', 'Please type "delete" to confirm account deletion.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use the database function to comprehensively delete user data
        const { error } = await supabase.rpc('delete_user_account', {
          user_id: user.id
        });

        if (error) {
          throw error;
        }
        
        // Sign out the user (this will remove the auth session)
        await signOut();
        
        // Clear any cached data
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (signOutError) {
          // Sign out error is expected in some cases
        }
        
        // Redirect to auth screen
        router.replace('/auth');
        
        Alert.alert('Success', 'Your account has been deleted successfully. You will need to create a new account if you want to use the app again.');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
    } finally {
      setDeleteModalVisible(false);
      setDeleteConfirmation('');
    }
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. The app may take longer to load next time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetSettings();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              // Error clearing cache
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onPress, 
    showSwitch = false,
    switchValue = false,
    onSwitchChange = () => { /* no-op */ },
    showArrow = true 
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    value?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress && !showSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          {icon}
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          {value && <Text style={styles.settingValue}>{value}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: '#E2E8F0', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        ) : showArrow ? (
          <ArrowLeft size={20} color="#94A3B8" style={{ transform: [{ rotate: '180deg' }] }} />
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={{ marginTop: 16, color: '#64748B' }}>Loading settings...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#64748B' }}>Failed to load settings</Text>
        <TouchableOpacity onPress={refreshSettings} style={{ marginTop: 16, padding: 12, backgroundColor: '#22C55E', borderRadius: 8 }}>
          <Text style={{ color: '#FFFFFF' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <SettingItem
            icon={<SettingsIcon size={20} color="#64748B" />}
            title="Auto Refresh"
            subtitle="Automatically refresh listings"
            showSwitch={true}
            switchValue={settings.autoRefresh}
            onSwitchChange={(value) => updateSetting('autoRefresh', value)}
            showArrow={false}
          />
          
          <SettingItem
            icon={<MapPin size={20} color="#64748B" />}
            title="Location Services"
            subtitle="Use location for nearby listings"
            showSwitch={true}
            switchValue={settings.locationServices}
            onSwitchChange={(value) => updateSetting('locationServices', value)}
            showArrow={false}
          />
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          
          <SettingItem
            icon={<Phone size={20} color="#64748B" />}
            title="Phone Privacy"
            subtitle="Manage phone number sharing"
            onPress={() => router.push('/phone-privacy')}
          />
        </View>

        {/* Content Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Management</Text>
          
          <SettingItem
            icon={<UserX size={20} color="#64748B" />}
            title="Blocked Users"
            subtitle="Manage blocked users"
            onPress={() => router.push('/settings/blocked-users')}
          />
          
          <SettingItem
            icon={<EyeOff size={20} color="#64748B" />}
            title="Hidden Listings"
            subtitle="View and manage hidden listings"
            onPress={() => router.push('/settings/hidden-listings')}
          />
          
          <SettingItem
            icon={<Flag size={20} color="#64748B" />}
            title="Reported Content"
            subtitle="View your reported content history"
            onPress={() => router.push('/settings/reported-content')}
          />
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          
          <SettingItem
            icon={<SettingsIcon size={20} color="#64748B" />}
            title="Data Usage"
            value={settings.dataUsage.charAt(0).toUpperCase() + settings.dataUsage.slice(1)}
            onPress={() => {
              const options = ['low', 'medium', 'high'];
              const currentIndex = options.indexOf(settings.dataUsage);
              const nextIndex = (currentIndex + 1) % options.length;
              updateSetting('dataUsage', options[nextIndex] as 'low' | 'medium' | 'high');
            }}
          />
          
          <SettingItem
            icon={<Eye size={20} color="#64748B" />}
            title="Auto Save Images"
            subtitle="Automatically save images to device"
            showSwitch={true}
            switchValue={settings.autoSaveImages}
            onSwitchChange={(value) => updateSetting('autoSaveImages', value)}
            showArrow={false}
          />
          
          <SettingItem
            icon={<SettingsIcon size={20} color="#64748B" />}
            title="Cache Images"
            subtitle="Store images locally for faster loading"
            showSwitch={true}
            switchValue={settings.cacheImages}
            onSwitchChange={(value) => updateSetting('cacheImages', value)}
            showArrow={false}
          />
          
          <SettingItem
            icon={<Trash2 size={20} color="#64748B" />}
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={clearCache}
          />
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          
          <SettingItem
            icon={<HelpCircle size={20} color="#64748B" />}
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => Alert.alert('Help & Support', 'Contact us at risingsoup76@gmail.com or call +91 7306 51 9350 for assistance.\n\nBusiness Hours: Monday to Friday, 9:00 AM to 6:00 PM IST')}
          />
          
          <SettingItem
            icon={<FileText size={20} color="#64748B" />}
            title="Terms of Service"
            subtitle="Read our terms and conditions"
            onPress={() => router.push('/legal/terms')}
          />
          
          <SettingItem
            icon={<Shield size={20} color="#64748B" />}
            title="Privacy Policy"
            subtitle="How we protect your data"
            onPress={() => router.push('/legal/privacy-policy')}
          />
          
          <SettingItem
            icon={<Info size={20} color="#64748B" />}
            title="About"
            subtitle="App version and information"
            onPress={() => Alert.alert('About', 'GeoMart v1.0.0\n\nA comprehensive local marketplace platform for buying and selling items and services in your community.\n\nContact: risingsoup76@gmail.com\nPhone: +91 7306 51 9350\nLocation: Kozhikode, Kerala, India')}
          />
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDescription}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text style={styles.modalDescription}>
              To confirm deletion, please type &quot;delete&quot; below:
            </Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type 'delete' to confirm"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmation('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteConfirmButton,
                  deleteConfirmation.toLowerCase() !== 'delete' && styles.deleteConfirmButtonDisabled
                ]}
                onPress={confirmDeleteAccount}
                disabled={deleteConfirmation.toLowerCase() !== 'delete'}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 32,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginTop: 2,
  },
  settingRight: {
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#FECACA',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});

export default withErrorBoundary(SettingsScreen, 'SettingsScreen');
