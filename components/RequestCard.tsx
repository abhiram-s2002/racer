import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MapPin, Clock, MessageCircle, Bookmark, Phone } from 'lucide-react-native';
import { Request } from '@/utils/types';
import { getCategoryById, getCategoryIcon, getCategoryColor } from '@/utils/requestCategories';

interface RequestCardProps {
  request: Request;
  onPress?: () => void; // Made optional since requests are not selectable
  onSave: () => void;
  onContact: () => void;
  onCall: () => void;
}

const { width } = Dimensions.get('window');

export function RequestCard({ request, onPress, onSave, onContact, onCall }: RequestCardProps) {
  const category = getCategoryById(request.category);
  const IconComponent = getCategoryIcon(request.category);
  const categoryColor = getCategoryColor(request.category);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatBudget = () => {
    if (request.budget_min && request.budget_max) {
      // If min and max are the same, it's a fixed amount
      if (request.budget_min === request.budget_max) {
        return `₹${request.budget_min}`;
      }
      // Otherwise it's a range
      return `₹${request.budget_min} - ${request.budget_max}`;
    } else if (request.budget_min) {
      return `₹${request.budget_min}+`;
    } else if (request.budget_max) {
      return `Up to ₹${request.budget_max}`;
    }
    return 'Budget not specified';
  };

  const getUrgencyColor = () => {
    switch (request.urgency) {
      case 'urgent': return '#EF4444';
      case 'normal': return '#F59E0B';
      case 'flexible': return '#22C55E';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
          <IconComponent size={40} color={categoryColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title and Urgency */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {request.title}
            </Text>
            {request.urgency === 'urgent' && (
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
                <Text style={styles.urgencyText}>URGENT</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {request.description && (
            <Text style={styles.description} numberOfLines={2}>
              {request.description}
            </Text>
          )}

          {/* Budget */}
          <Text style={styles.budget}>{formatBudget()}</Text>

          {/* Location and Time */}
          <View style={styles.metaRow}>
            {request.distance_km && (
              <View style={styles.metaItem}>
                <MapPin size={14} color="#64748B" />
                <Text style={styles.metaText}>
                  {request.distance_km < 1 
                    ? `${Math.round(request.distance_km * 1000)}m away`
                    : `${request.distance_km.toFixed(1)} km away`
                  }
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Clock size={14} color="#64748B" />
              <Text style={styles.metaText}>{formatTimeAgo(request.updated_at)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.callButton} onPress={onCall}>
          <Phone size={16} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactButton} onPress={onContact}>
          <MessageCircle size={16} color="#16A34A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Bookmark size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 20,
  },
  budget: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  contactButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#86EFAC', // Light green
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  callButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#93C5FD', // Light blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
