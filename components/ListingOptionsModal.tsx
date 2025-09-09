import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { MoreVertical, Flag, EyeOff, UserX, X } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { reportListing, hideListing, hideRequest, blockUser } from '@/utils/contentManagement';
import { supabase } from '@/utils/supabaseClient';

interface ListingOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  listingId?: string;
  requestId?: string;
  sellerUsername: string;
  listingTitle: string;
  type: 'listing' | 'request';
  onReport?: () => void;
  onHide?: () => void;
  onBlock?: () => void;
}

const { width } = Dimensions.get('window');

const ListingOptionsModal: React.FC<ListingOptionsModalProps> = ({
  visible,
  onClose,
  listingId,
  requestId,
  sellerUsername,
  listingTitle,
  type,
  onReport,
  onHide,
  onBlock,
}) => {
  const { user } = useAuth();

  // Helper function to capitalize the first letter of type
  const capitalizeType = (type: string) => type.charAt(0).toUpperCase() + type.slice(1);

  const handleReport = async () => {
    try {
      if (!user) {
        Alert.alert('Error', `You must be logged in to report ${type}s`);
        return;
      }

      const result = await reportListing({
        listing_id: listingId,
        request_id: requestId,
        seller_username: sellerUsername,
        reason: 'inappropriate_content',
        description: `Reported via ${type} options menu`
      });

      if (!result.success) {
        Alert.alert('Error', result.error || `Failed to report ${type}. Please try again.`);
        return;
      }

      // Ask if user wants to hide the content after reporting
      Alert.alert(
        'Report Submitted',
        `Thank you for your report. We will review this ${type} and take appropriate action.\n\nWould you like to hide this ${type} from your feed?`,
        [
          {
            text: 'No, Keep Visible',
            style: 'cancel',
            onPress: () => {
              onClose();
              onReport?.();
            }
          },
          {
            text: 'Yes, Hide It',
            onPress: async () => {
              // Hide the content
              const hideResult = type === 'listing' 
                ? await hideListing(listingId!)
                : await hideRequest(requestId!);
              
              if (hideResult.success) {
                Alert.alert(
                  `${capitalizeType(type)} Hidden`,
                  `This ${type} has been hidden from your feed.`,
                  [{ text: 'OK', onPress: onClose }]
                );
                onHide?.();
              } else {
                Alert.alert(
                  'Report Submitted',
                  `Your report was submitted, but we couldn't hide the ${type}. You can hide it manually from the ${type} options.`,
                  [{ text: 'OK', onPress: onClose }]
                );
              }
              onReport?.();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error(`Error reporting ${type}:`, error);
      Alert.alert('Error', `Failed to report ${type}. Please try again.`);
    }
  };

  const handleHide = async () => {
    try {
      if (!user) {
        Alert.alert('Error', `You must be logged in to hide ${type}s`);
        return;
      }

      const result = type === 'listing' 
        ? await hideListing(listingId!)
        : await hideRequest(requestId!);

      if (!result.success) {
        Alert.alert('Error', result.error || `Failed to hide ${type}. Please try again.`);
        return;
      }

      Alert.alert(
        `${capitalizeType(type)} Hidden`,
        `This ${type} has been hidden from your feed.`,
        [{ text: 'OK', onPress: onClose }]
      );
      
      onHide?.();
    } catch (error) {
      console.error(`Error hiding ${type}:`, error);
      Alert.alert('Error', `Failed to hide ${type}. Please try again.`);
    }
  };

  const handleBlock = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to block users');
        return;
      }

      // First, get the seller's user ID
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select('id')
        .eq('username', sellerUsername)
        .single();

      if (sellerError || !sellerData) {
        console.error('Error finding seller:', sellerError);
        Alert.alert('Error', 'Failed to find seller. Please try again.');
        return;
      }

      const result = await blockUser(sellerData.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to block user. Please try again.');
        return;
      }

      Alert.alert(
        'User Blocked',
        `You have blocked ${sellerUsername}. You will no longer see their listings.`,
        [{ text: 'OK', onPress: onClose }]
      );
      
      onBlock?.();
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const options = [
    {
      id: 'report',
      title: `Report ${capitalizeType(type)}`,
      subtitle: 'Report inappropriate content',
      icon: Flag,
      color: '#EF4444',
      onPress: handleReport,
    },
    {
      id: 'hide',
      title: `Hide ${capitalizeType(type)}`,
      subtitle: 'Hide from your feed',
      icon: EyeOff,
      color: '#F59E0B',
      onPress: handleHide,
    },
    {
      id: 'block',
      title: `Block ${type === 'listing' ? 'Seller' : 'Requester'}`,
      subtitle: `Block ${sellerUsername}`,
      icon: UserX,
      color: '#DC2626',
      onPress: handleBlock,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{capitalizeType(type)} Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.listingTitle} numberOfLines={2}>
            {listingTitle}
          </Text>
          
          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const IconComponent = option.icon;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={styles.optionItem}
                  onPress={option.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIcon, { backgroundColor: `${option.color}15` }]}>
                    <IconComponent size={20} color={option.color} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  listingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
});

export default ListingOptionsModal;