import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { X, MessageCircle, DollarSign, Clock, Truck, Settings } from 'lucide-react-native';
import { PingTemplate, getAllTemplates, getTemplatesByCategory, getTemplatesForListingCategory } from '@/utils/pingTemplates';

interface PingTemplateSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectTemplate: (_template: PingTemplate) => void;
  listingCategory?: string;
}

const categoryIcons = {
  general: MessageCircle,
  pricing: DollarSign,
  availability: Clock,
  delivery: Truck,
  custom: Settings,
};

const categoryColors = {
  general: '#22C55E',
  pricing: '#F59E0B',
  availability: '#3B82F6',
  delivery: '#8B5CF6',
  custom: '#64748B',
};

export default function PingTemplateSelector({ 
  visible, 
  onClose, 
  onSelectTemplate, 
  listingCategory 
}: PingTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | PingTemplate['category']>('all');

  // Get templates based on listing category or all templates
  const getTemplates = () => {
    if (listingCategory) {
      return getTemplatesForListingCategory(listingCategory);
    }
    return selectedCategory === 'all' 
      ? getAllTemplates() 
      : getTemplatesByCategory(selectedCategory);
  };

  const templates = getTemplates();
  const categories = ['all', 'general', 'pricing', 'availability', 'delivery'] as const;

  const handleTemplateSelect = (template: PingTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Choose a Template</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Category Filter */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            {categories.map((category) => {
              const IconComponent = category === 'all' ? MessageCircle : categoryIcons[category];
              const color = category === 'all' ? '#22C55E' : categoryColors[category];
              
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive,
                    selectedCategory === category && { borderColor: color }
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <IconComponent 
                    size={16} 
                    color={selectedCategory === category ? color : '#64748B'} 
                  />
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && { color }
                  ]}>
                    {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Templates List */}
          <ScrollView style={styles.templatesContainer} showsVerticalScrollIndicator={false}>
            {templates.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No templates found for this category</Text>
              </View>
            ) : (
              templates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateTitle}>{template.title}</Text>
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: categoryColors[template.category] + '20' }
                    ]}>
                      <Text style={[
                        styles.categoryBadgeText,
                        { color: categoryColors[template.category] }
                      ]}>
                        {template.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.templateMessage}>{template.message}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Custom Message Option */}
          <View style={styles.customSection}>
            <TouchableOpacity
              style={styles.customButton}
              onPress={() => handleTemplateSelect({
                id: 'custom',
                title: 'Custom Message',
                message: '',
                category: 'custom',
                isCustom: true
              })}
            >
              <Text style={styles.customButtonText}>Write Custom Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  categoryScroll: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#F8FAFC',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  templatesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  templateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
  },
  templateMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  customSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  customButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  customButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
}); 