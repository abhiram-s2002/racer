import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Edit3, Trash2, Clock, MapPin, Calendar } from 'lucide-react-native';
import { supabase } from '@/utils/supabaseClient';
import { Request } from '@/utils/types';
import { getCategoryById } from '@/utils/requestCategories';
import { RequestLocationUtils } from '@/utils/requestLocationUtils';

interface UserListingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onEditRequest?: (request: Request) => void;
  onDeleteRequest?: (requestId: string) => void;
}

export function UserListingsModal({ 
  visible, 
  onClose, 
  userId, 
  onEditRequest,
  onDeleteRequest 
}: UserListingsModalProps) {
  const [userRequests, setUserRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUserRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requester_username', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user requests:', error);
        Alert.alert('Error', 'Failed to load your requests');
        return;
      }

      setUserRequests(data || []);
    } catch (error) {
      console.error('Error in fetchUserRequests:', error);
      Alert.alert('Error', 'Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserRequests();
    setRefreshing(false);
  };

  const handleDeleteRequest = async (requestId: string) => {
    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this request? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(requestId);
              
              const { error } = await supabase
                .from('requests')
                .delete()
                .eq('id', requestId);

              if (error) {
                console.error('Error deleting request:', error);
                Alert.alert('Error', 'Failed to delete request');
                return;
              }

              // Remove from local state
              setUserRequests(prev => prev.filter(req => req.id !== requestId));
              
              // Call parent callback if provided
              if (onDeleteRequest) {
                onDeleteRequest(requestId);
              }

              Alert.alert('Success', 'Request deleted successfully');
            } catch (error) {
              console.error('Error in handleDeleteRequest:', error);
              Alert.alert('Error', 'Failed to delete request');
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const handleEditRequest = (request: Request) => {
    if (onEditRequest) {
      onEditRequest(request);
    }
    onClose();
  };

  const formatExpirationTime = (expiresAt: string) => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Expired';
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
    }
  };

  const renderRequestItem = ({ item }: { item: Request }) => {
    const category = getCategoryById(item.category);
    const isExpired = item.expires_at && new Date(item.expires_at) <= new Date();

    return (
      <View style={[styles.requestItem, isExpired && styles.expiredRequest]}>
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleContainer}>
            <Text style={[styles.requestTitle, isExpired && styles.expiredText]} numberOfLines={2}>
              {item.title}
            </Text>
            {category && (
              <View style={[styles.categoryBadge, { backgroundColor: category.color + '20' }]}>
                <Text style={[styles.categoryText, { color: category.color }]}>
                  {category.name}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditRequest(item)}
            >
              <Edit3 size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteRequest(item.id)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size={16} color="#EF4444" />
              ) : (
                <Trash2 size={16} color="#EF4444" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.requestDescription, isExpired && styles.expiredText]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.requestDetails}>
          {item.location_name && (
            <View style={styles.detailItem}>
              <MapPin size={14} color="#64748B" />
              <Text style={[styles.detailText, isExpired && styles.expiredText]}>
                {RequestLocationUtils.formatLocationForDisplay({
                  location_name: item.location_name,
                  location_district: item.location_district,
                  location_state: item.location_state,
                  formatted_address: item.location || ''
                })}
              </Text>
            </View>
          )}
          
          {item.expires_at && (
            <View style={styles.detailItem}>
              <Clock size={14} color={isExpired ? "#EF4444" : "#F59E0B"} />
              <Text style={[
                styles.detailText, 
                { color: isExpired ? "#EF4444" : "#F59E0B" }
              ]}>
                {formatExpirationTime(item.expires_at)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          <Text style={[styles.dateText, isExpired && styles.expiredText]}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (visible && userId) {
      fetchUserRequests();
    }
  }, [visible, userId]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>Your Requests</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading your requests...</Text>
          </View>
        ) : userRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Requests Yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first request to get started
            </Text>
          </View>
        ) : (
          <FlatList
            data={userRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#10B981']}
                tintColor="#10B981"
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expiredRequest: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 22,
  },
  expiredText: {
    color: '#9CA3AF',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#EBF8FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  requestDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
