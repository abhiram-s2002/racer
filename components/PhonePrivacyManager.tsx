import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { 
  User, 
  X, 
  Shield, 
  Clock,
  Trash2
} from 'lucide-react-native';
import { getPhoneAccessList, revokePhoneAccess, PhoneAccessUser } from '@/utils/phoneSharingUtils';

interface PhonePrivacyManagerProps {
  userId: string;
}

const PhonePrivacyManager: React.FC<PhonePrivacyManagerProps> = ({ userId }) => {
  const [accessList, setAccessList] = useState<PhoneAccessUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Fetch phone access list
  const fetchAccessList = async () => {
    try {
      setLoading(true);
      const list = await getPhoneAccessList(userId);
      setAccessList(list);
    } catch (error) {
      console.error('Error fetching phone access list:', error);
      Alert.alert('Error', 'Failed to load phone access list');
    } finally {
      setLoading(false);
    }
  };

  // Refresh access list
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAccessList();
    setRefreshing(false);
  };

  // Revoke access for a specific user
  const handleRevokeAccess = async (unlockedById: string, username: string) => {
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
              const success = await revokePhoneAccess(userId, unlockedById);
              
              if (success) {
                // Remove from local list
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
            try {
              setRevoking('all');
              const revokePromises = accessList.map(user => 
                revokePhoneAccess(userId, user.unlocked_by_id)
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

  // Load access list on mount
  useEffect(() => {
    fetchAccessList();
  }, [userId]);

  // Render access list item
  const renderAccessItem = ({ item }: { item: PhoneAccessUser }) => (
    <View style={styles.accessItem}>
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
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading phone access list...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={20} color="#22C55E" />
          <Text style={styles.title}>Phone Access Management</Text>
        </View>
        {accessList.length > 0 && (
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
        )}
      </View>

      <Text style={styles.description}>
        Users who can see your phone number. They gained access when you accepted their pings.
      </Text>

      {accessList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <X size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Phone Access</Text>
          <Text style={styles.emptyDescription}>
            No users currently have access to your phone number. Access is granted when you accept pings.
          </Text>
        </View>
      ) : (
        <FlatList
          data={accessList}
          keyExtractor={(item) => item.unlocked_by_id}
          renderItem={renderAccessItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#22C55E"
            />
          }
          style={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
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
  description: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 12,
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
  list: {
    maxHeight: 300,
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
});

export default PhonePrivacyManager;
