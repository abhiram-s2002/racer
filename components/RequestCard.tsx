import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MapPin, Clock, MessageCircle, Bookmark, Phone, User } from 'lucide-react-native';
import { Request } from '@/utils/types';
import { getCategoryById, getCategoryIcon, getCategoryColor } from '@/utils/requestCategories';
import VerificationBadge from './VerificationBadge';

interface RequestCardProps {
  request: Request;
  requesterName?: string; // Add requester name prop
  requesterVerified?: boolean; // Add verification status prop
  onPress?: () => void; // Made optional since requests are not selectable
  onSave: () => void;
  onContact: () => void;
  onCall: () => void;
}

const { width } = Dimensions.get('window');

export function RequestCard({ request, requesterName, requesterVerified, onPress, onSave, onContact, onCall }: RequestCardProps) {
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

  const formatLocation = () => {
    // Try to use the parsed location hierarchy first
    if (request.location_name) {
      let location = request.location_name;
      if (request.location_district && request.location_district !== request.location_name) {
        location += `, ${request.location_district}`;
      }
      if (request.location_state && request.location_state !== request.location_district) {
        location += `, ${request.location_state}`;
      }
      return location;
    }
    
    // Fallback to the original location field
    if (request.location) {
      return request.location;
    }
    
    return 'Location not specified';
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
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {request.title}
            </Text>
          </View>

          {/* Requester Name with Verification Badge */}
          {requesterName && (
            <View style={styles.requesterRow}>
              <User size={14} color="#64748B" />
              <Text style={styles.requesterName}>{requesterName}</Text>
              {requesterVerified && <VerificationBadge size="small" />}
            </View>
          )}

          {/* Urgency Badge */}
          {request.urgency === 'urgent' && (
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
              <Text style={styles.urgencyText}>URGENT</Text>
            </View>
          )}

          {/* Description */}
          {request.description && (
            <Text style={styles.description} numberOfLines={2}>
              {request.description}
            </Text>
          )}

          {/* Budget and Time */}
          <View style={styles.budgetRow}>
            <Text style={styles.budget}>{formatBudget()}</Text>
            <View style={styles.timeContainer}>
              <Clock size={12} color="#64748B" />
              <Text style={styles.timeText}>{formatTimeAgo(request.updated_at)}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={14} color="#64748B" />
              <Text style={styles.metaText}>
                {formatLocation()}
                {request.distance_km && (
                  <Text style={styles.distanceText}>
                    {' • '}
                    {request.distance_km < 1 
                      ? `${Math.round(request.distance_km * 1000)}m away`
                      : `${request.distance_km.toFixed(1)} km away`
                    }
                  </Text>
                )}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={onContact}>
          <MessageCircle size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onCall}>
          <Phone size={16} color="#2563EB" />
          <Text style={styles.secondaryButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton} onPress={onSave}>
          <Bookmark size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
    lineHeight: 22,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  requesterName: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
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
    marginBottom: 12,
    lineHeight: 20,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budget: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
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
  distanceText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  tertiaryButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
