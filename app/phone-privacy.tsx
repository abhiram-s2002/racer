import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Lock, 
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
  User,
  Clock
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getPhoneAccessList, revokePhoneAccess, PhoneAccessUser, getPhoneSharingPreference, updatePhoneSharingPreference } from '@/utils/phoneSharingUtils';
import { withErrorBoundary } from '@/components/ErrorBoundary';

type PhoneSharingPreference = 'everyone' | 'ping_confirmation';

const PhonePrivacyScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [phoneSharingPreference, setPhoneSharingPreference] = useState<PhoneSharingPreference>('ping_confirmation');
  const [accessList, setAccessList] = useState<PhoneAccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Fetch user's phone sharing preference and access list
  const fetchPhonePrivacyData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch phone sharing preference
      const preference = await getPhoneSharingPreference(user.id);
      setPhoneSharingPreference(preference);
      
      // Fetch phone access list
      const list = await getPhoneAccessList(user.id);
      setAccessList(list);
    } catch (error) {
      console.error('Error fetching phone privacy data:', error);
      Alert.alert('Error', 'Failed to load phone privacy settings');
    } finally {
      setLoading(false);
    }
  };

  // Update phone sharing preference
  const handleUpdatePhoneSharingPreference = async (newPreference: PhoneSharingPreference) => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      
      const success = await updatePhoneSharingPreference(user.id, newPreference);
      
      if (!success) {
        Alert.alert('Error', 'Failed to update phone sharing preference');
        return;
      }
      
      setPhoneSharingPreference(newPreference);
      
      // Show confirmation
      Alert.alert(
        'Settings Updated',
        `Phone sharing preference updated to ${newPreference === 'everyone' ? 'Everyone' : 'Ping Confirmation Only'}`
      );
    } catch (error) {
      console.error('Error in handleUpdatePhoneSharingPreference:', error);
      Alert.alert('Error', 'Failed to update phone sharing preference');
    } finally {
      setSaving(false);
    }
  };

  // Revoke access for a specific user
  const handleRevokeAccess = async (unlockedById: string, username: string) => {
    if (!user?.id) return;
    
    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke phone access for ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setRevoking(unlockedById);
              const success = await revokePhoneAccess(user.id, unlockedById);
              
              if (success) {
                setAccessList(prev => 
                  prev.filter(user => user.unlocked_by_id !== unlockedById)
                );
                Alert.alert('Success', 'Phone access revoked successfully');
              } else {
                Alert.alert('Error', 'Failed to revoke phone access');
              }
            } catch (error) {
              console.error('Error revoking phone access:', error);
              Alert.alert('Error', 'Failed to revoke phone access');
            } finally {
              setRevoking(null);
            }
          }
        }
      ]
    );
  };

  // Revoke all access
  const handleRevokeAll = () => {
    if (accessList.length === 0) return;

    Alert.alert(
      'Revoke All Access',
      `Are you sure you want to revoke phone access for all ${accessList.length} users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke All',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            try {
              setRevoking('all');
              const revokePromises = accessList.map(accessUser => 
                revokePhoneAccess(user.id, accessUser.unlocked_by_id)
              );
              
              await Promise.all(revokePromises);
              setAccessList([]);
              Alert.alert('Success', 'All phone access revoked successfully');
            } catch (error) {
              console.error('Error revoking all phone access:', error);
              Alert.alert('Error', 'Failed to revoke all phone access');
            } finally {
              setRevoking(null);
            }
          }
        }
      ]
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhonePrivacyData();
    setRefreshing(false);
  };

  // Load data on mount
  useEffect(() => {
    fetchPhonePrivacyData();
  }, [user?.id]);


  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading phone privacy settings...</Text>
        </View>
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
        <Text style={styles.headerTitle}>Phone Privacy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Phone Sharing Preference Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>Phone Sharing Preference</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Choose how your phone number is shared with other users
          </Text>

          {/* Everyone Option */}
          <TouchableOpacity
            style={[
              styles.preferenceOption,
              phoneSharingPreference === 'everyone' && styles.preferenceOptionSelected
            ]}
            onPress={() => handleUpdatePhoneSharingPreference('everyone')}
            disabled={saving}
          >
            <View style={styles.preferenceContent}>
              <View style={styles.preferenceIcon}>
                <Users size={20} color={phoneSharingPreference === 'everyone' ? '#10B981' : '#64748B'} />
              </View>
              <View style={styles.preferenceText}>
                <Text style={[
                  styles.preferenceTitle,
                  phoneSharingPreference === 'everyone' && styles.preferenceTitleSelected
                ]}>
                  Show to Everyone
                </Text>
                <Text style={styles.preferenceDescription}>
                  Your phone number will be visible to all users on the platform
                </Text>
              </View>
              <View style={styles.preferenceIndicator}>
                {phoneSharingPreference === 'everyone' ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <View style={styles.radioButton} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Ping Confirmation Option */}
          <TouchableOpacity
            style={[
              styles.preferenceOption,
              phoneSharingPreference === 'ping_confirmation' && styles.preferenceOptionSelected
            ]}
            onPress={() => handleUpdatePhoneSharingPreference('ping_confirmation')}
            disabled={saving}
          >
            <View style={styles.preferenceContent}>
              <View style={styles.preferenceIcon}>
                <Lock size={20} color={phoneSharingPreference === 'ping_confirmation' ? '#10B981' : '#64748B'} />
              </View>
              <View style={styles.preferenceText}>
                <Text style={[
                  styles.preferenceTitle,
                  phoneSharingPreference === 'ping_confirmation' && styles.preferenceTitleSelected
                ]}>
                  Ping Confirmation Only
                </Text>
                <Text style={styles.preferenceDescription}>
                  Your phone number is only shared when you accept a ping from another user
                </Text>
              </View>
              <View style={styles.preferenceIndicator}>
                {phoneSharingPreference === 'ping_confirmation' ? (
                  <CheckCircle size={20} color="#10B981" />
                ) : (
                  <View style={styles.radioButton} />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {saving && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color="#10B981" />
              <Text style={styles.savingText}>Updating preference...</Text>
            </View>
          )}
        </View>

        {/* Phone Access Management Section */}
        {phoneSharingPreference === 'ping_confirmation' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Settings size={24} color="#10B981" />
              <Text style={styles.sectionTitle}>Phone Access Management</Text>
            </View>
            
            <Text style={styles.sectionDescription}>
              Users who currently have access to your phone number
            </Text>

            {accessList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Lock size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Phone Access</Text>
                <Text style={styles.emptyDescription}>
                  No users currently have access to your phone number. Access is granted when you accept pings.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.accessListHeader}>
                  <Text style={styles.accessListTitle}>
                    {accessList.length} user{accessList.length !== 1 ? 's' : ''} with access
                  </Text>
                  <TouchableOpacity
                    style={styles.revokeAllButton}
                    onPress={handleRevokeAll}
                    disabled={revoking === 'all'}
                    activeOpacity={0.7}
                  >
                    {revoking === 'all' ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Text style={styles.revokeAllText}>Revoke All</Text>
                    )}
                  </TouchableOpacity>
                </View>
                
                {accessList.map((item) => (
                  <View key={item.unlocked_by_id} style={styles.accessItem}>
                    <View style={styles.userInfo}>
                      <View style={styles.avatar}>
                        <User size={20} color="#64748B" />
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.username}>{item.unlocked_by_username}</Text>
                        <Text style={styles.name}>{item.unlocked_by_name}</Text>
                        <Text style={styles.date}>
                          <Clock size={12} color="#94A3B8" /> {formatDate(item.unlocked_at)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeAccess(item.unlocked_by_id, item.unlocked_by_username)}
                      disabled={revoking === item.unlocked_by_id}
                      activeOpacity={0.7}
                    >
                      {revoking === item.unlocked_by_id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Trash2 size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <AlertCircle size={20} color="#F59E0B" />
          <Text style={styles.infoText}>
            {phoneSharingPreference === 'everyone' 
              ? 'Your phone number is visible to all users. You can change this setting anytime.'
              : 'Your phone number is only shared when you accept pings. You can manage who has access above.'
            }
          </Text>
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
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 12,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  preferenceOption: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  preferenceOptionSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  preferenceTitleSelected: {
    color: '#10B981',
  },
  preferenceDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 18,
  },
  preferenceIndicator: {
    marginLeft: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  savingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  accessListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accessListTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  revokeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  revokeAllText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  accessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  revokeButton: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
});

export default withErrorBoundary(PhonePrivacyScreen, 'PhonePrivacyScreen');
