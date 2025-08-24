import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { X, MapPin, Filter, ShoppingCart, Apple, UtensilsCrossed, Wrench, Palette, Home, Car, MoreHorizontal } from 'lucide-react-native';
import { mockCategories } from '@/utils/mockData';

interface LocationFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDistance: (distance: number | null) => void;
  onSelectCategory: (categories: string[]) => void;
  selectedDistance: number | null;
  selectedCategory: string | string[];
}

export default function LocationFilterModal({ 
  visible, 
  onClose, 
  onSelectDistance, 
  onSelectCategory,
  selectedDistance,
  selectedCategory
}: LocationFilterModalProps) {
  
  const [localDistance, setLocalDistance] = useState(selectedDistance || 5);
  const [localCategory, setLocalCategory] = useState<string[]>(
    Array.isArray(selectedCategory) ? selectedCategory : selectedCategory === 'all' ? [] : [selectedCategory]
  );
  const lastUpdateRef = useRef<number>(0);

  // Update local state when props change
  useEffect(() => {
    setLocalDistance(selectedDistance || 5);
    setLocalCategory(
      Array.isArray(selectedCategory) ? selectedCategory : selectedCategory === 'all' ? [] : [selectedCategory]
    );
  }, [selectedDistance, selectedCategory]);

  const handleApplyFilters = () => {
    onSelectDistance(localDistance);
    onSelectCategory(localCategory);
    onClose();
  };

  const handleResetFilters = () => {
    setLocalDistance(5); // Reset to default distance instead of null
    setLocalCategory([]);
  };

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
          <View style={styles.headerContent}>
            <Text style={styles.title}>Map Filters</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Distance Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color="#22C55E" />
              <Text style={styles.sectionTitle}>Distance</Text>
            </View>
            
            {/* Distance Options */}
            <View style={styles.distanceOptions}>
              {[1, 5, 10, 25, 50].map((distance) => (
                <TouchableOpacity
                  key={distance}
                  style={[
                    styles.distanceOption,
                    localDistance === distance && styles.selectedDistanceOption
                  ]}
                  onPress={() => setLocalDistance(distance)}
                >
                  <Text style={[
                    styles.distanceText,
                    localDistance === distance && styles.selectedDistanceText
                  ]}>
                    Within {distance} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Category Filter Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Filter size={20} color="#22C55E" />
              <Text style={styles.sectionTitle}>Categories</Text>
            </View>
            
            {/* Category Options */}
            <View style={styles.categoryOptions}>
              {/* All Categories Option */}
              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  localCategory.length === 0 && styles.selectedCategoryOption
                ]}
                onPress={() => setLocalCategory([])}
              >
                <Text style={[
                  styles.categoryText,
                  localCategory.length === 0 && styles.selectedCategoryText
                ]}>
                  All Categories
                </Text>
              </TouchableOpacity>

              {/* Specific Category Options */}
              {mockCategories.slice(1).map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryOption,
                    localCategory.includes(category.id) && styles.selectedCategoryOption
                  ]}
                  onPress={() => {
                    if (localCategory.includes(category.id)) {
                      setLocalCategory(localCategory.filter(cat => cat !== category.id));
                    } else {
                      setLocalCategory([...localCategory, category.id]);
                    }
                  }}
                >
                  <Text style={[
                    styles.categoryText,
                    localCategory.includes(category.id) && styles.selectedCategoryText
                  ]}>
                    {localCategory.includes(category.id) ? '✓ ' : ''}{category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Information Text */}
          <View style={styles.infoSection}>
            <View style={styles.infoContent}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Filters help you find exactly what you&apos;re looking for. The map will update automatically when you apply filters.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleResetFilters}
            >
              <Text style={styles.resetButtonText}>↻</Text>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginLeft: 12,
  },
  distanceOptions: {
    gap: 8,
  },
  distanceOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedDistanceOption: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  distanceText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  selectedDistanceText: {
    color: '#16A34A',
    fontFamily: 'Inter-SemiBold',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedCategoryOption: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#16A34A',
    fontFamily: 'Inter-SemiBold',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoContent: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});
