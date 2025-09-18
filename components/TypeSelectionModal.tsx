import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { X, ShoppingBag, HandHeart } from 'lucide-react-native';
import { ItemType } from '@/utils/types';

interface TypeSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: ItemType) => void;
}

export function TypeSelectionModal({ visible, onClose, onSelectType }: TypeSelectionModalProps) {
  const handleSelectType = (type: ItemType) => {
    onSelectType(type);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>What would you like to create?</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Create Listing Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectType('listing')}
          >
            <View style={styles.optionIcon}>
              <ShoppingBag size={32} color="#22C55E" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Create Listing</Text>
              <Text style={styles.optionDescription}>
                Sell a product or offer a service to others
              </Text>
            </View>
          </TouchableOpacity>

          {/* Create Request Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelectType('request')}
          >
            <View style={styles.optionIcon}>
              <HandHeart size={32} color="#3B82F6" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Create Request</Text>
              <Text style={styles.optionDescription}>
                Request a service or product from others
              </Text>
            </View>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
});
