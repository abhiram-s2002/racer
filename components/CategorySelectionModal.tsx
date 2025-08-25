import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, ShoppingCart, Apple, UtensilsCrossed, Wrench, Palette, Home, Car, MoreHorizontal } from 'lucide-react-native';
import { mockCategories } from '@/utils/mockData';
import { withErrorBoundary } from '@/components/ErrorBoundary';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2; // Account for padding and gap

interface CategorySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  
  onSelectCategory: (category: string) => void;
}

function CategorySelectionModal({ 
  visible, 
  onClose, 
  onSelectCategory 
}: CategorySelectionModalProps) {
  
  const categoryIcons = {
    groceries: ShoppingCart,
    fruits: Apple,
    food: UtensilsCrossed,
    services: Wrench,
    art: Palette,
    rental: Home,
    vehicles: Car,
    others: MoreHorizontal,
  };

  // Extended categories including vehicles and others
  const extendedCategories = [
    { id: 'groceries', name: 'Groceries' },
    { id: 'fruits', name: 'Fruits' },
    { id: 'food', name: 'Food' },
    { id: 'services', name: 'Services' },
    { id: 'art', name: 'Art' },
    { id: 'rental', name: 'Rental' },
    { id: 'vehicles', name: 'Vehicles' },
    { id: 'others', name: 'Others' },
  ];

  const handleCategorySelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Category</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Categories Grid */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.categoriesGrid}>
            {extendedCategories.map((category) => {
              const IconComponent = categoryIcons[category.id as keyof typeof categoryIcons];
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryCard}
                  onPress={() => handleCategorySelect(category.id)}
                >
                  <View style={styles.categoryIcon}>
                    {IconComponent && <IconComponent size={32} color="#22C55E" />}
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  categoryCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 4,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    textAlign: 'center',
  },
}); 

export default withErrorBoundary(CategorySelectionModal, 'CategorySelectionModal'); 