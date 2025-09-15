import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { requestCategories } from '@/utils/requestCategories';

interface CategoryFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  selectedCategory: string | null;
}

export function CategoryFilterModal({ 
  visible, 
  onClose, 
  onSelectCategory, 
  selectedCategory 
}: CategoryFilterModalProps) {
  
  const handleCategorySelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    onClose();
  };

  const handleClearFilter = () => {
    onSelectCategory(null);
    onClose();
  };

  const renderCategoryItem = ({ item }: { item: typeof requestCategories[0] }) => {
    const IconComponent = item.icon;
    const isSelected = selectedCategory === item.id;

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => handleCategorySelect(item.id)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color + '20' }]}>
          <IconComponent size={24} color={item.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
            {item.name}
          </Text>
          <Text style={[styles.categoryDescription, isSelected && styles.categoryDescriptionSelected]}>
            {item.description}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: item.color }]}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
          <Text style={styles.title}>Filter by Category</Text>
          <TouchableOpacity onPress={handleClearFilter} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Categories List */}
        <FlatList
          data={requestCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '500',
  },
  listContainer: {
    padding: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryItemSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#22C55E',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  categoryDescriptionSelected: {
    color: '#16A34A',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
