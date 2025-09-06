import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MapPin, Clock, MessageCircle, Bookmark, Phone, User, Star } from 'lucide-react-native';
import { Request } from '@/utils/types';
import { getCategoryById, getCategoryIcon, getCategoryColor } from '@/utils/requestCategories';
import VerificationBadge from './VerificationBadge';

interface RequestCardProps {
  request: Request;
  requesterName?: string; // Add requester name prop
  requesterVerified?: boolean; // Add verification status prop
  requesterRating?: { rating: string; reviewCount: number } | null; // Add rating prop
  onPress?: () => void; // Made optional since requests are not selectable
  onSave: () => void;
  onContact: () => void;
  onCall: () => void;
}

const { width } = Dimensions.get('window');

export function RequestCard({ request, requesterName, requesterVerified, requesterRating, onPress, onSave, onContact, onCall }: RequestCardProps) {
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
      // Only add district if it's different from location_name
      if (request.location_district && request.location_district !== request.location_name) {
        location += `, ${request.location_district}`;
      }
      // Remove state and country - only show city/district level
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
          <IconComponent size={24} color={categoryColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header Row: Title + Urgency + Time */}
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {request.title}
            </Text>
            <View style={styles.headerRight}>
              {request.urgency === 'urgent' && (
                <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
                  <Text style={styles.urgencyText}>URGENT</Text>
                </View>
              )}
              <View style={styles.timeContainer}>
                <Clock size={10} color="#64748B" />
                <Text style={styles.timeText}>{formatTimeAgo(request.updated_at)}</Text>
              </View>
            </View>
          </View>

          {/* Requester Row: Name + Rating */}
          {requesterName && (
            <View style={styles.requesterRow}>
              <View style={styles.requesterInfo}>
                <User size={12} color="#64748B" />
                <Text style={styles.requesterName}>{requesterName}</Text>
                {requesterVerified && <VerificationBadge size="small" />}
              </View>
              {requesterRating && (
                <View style={styles.ratingRow}>
                  <Star size={10} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingText}>{requesterRating.rating}</Text>
                  <Text style={styles.reviewCountText}>({requesterRating.reviewCount})</Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {request.description && (
            <Text style={styles.description} numberOfLines={1}>
              {request.description}
            </Text>
          )}

          {/* Footer Row: Budget + Location */}
          <View style={styles.footerRow}>
            <Text style={styles.budget}>{formatBudget()}</Text>
            <View style={styles.locationContainer}>
              <MapPin size={10} color="#64748B" />
              <Text style={styles.locationText} numberOfLines={1}>
                {formatLocation()}
                {request.distance_km && (
                  <Text style={styles.distanceText}>
                    {' • '}
                    {request.distance_km < 1 
                      ? `${Math.round(request.distance_km * 1000)}m`
                      : `${request.distance_km.toFixed(1)}km`
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
          <MessageCircle size={14} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onCall}>
          <Phone size={14} color="#2563EB" />
          <Text style={styles.secondaryButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tertiaryButton} onPress={onSave}>
          <Bookmark size={14} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  requesterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  requesterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requesterName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  reviewCountText: {
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budget: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 2,
    flex: 1,
  },
  distanceText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  tertiaryButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
