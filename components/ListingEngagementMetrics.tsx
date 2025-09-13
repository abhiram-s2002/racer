import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Eye, MessageCircle, Clock } from 'lucide-react-native';

/**
 * ListingEngagementMetrics Component
 * Displays view count, ping count, and time information for listings
 * Data comes from listings.view_count and listings.ping_count database fields
 */

interface ListingEngagementMetricsProps {
  viewCount?: number;
  pingCount?: number;
  expiresAt?: string;
  createdAt?: string;
}

const ListingEngagementMetrics: React.FC<ListingEngagementMetricsProps> = React.memo(({
  viewCount = 0,
  pingCount = 0,
  expiresAt,
  createdAt,
}) => {
  const timeRemaining = useMemo(() => {
    if (!expiresAt) return null;
    
    try {
      const expiry = new Date(expiresAt);
      const now = new Date();
      const diffMs = expiry.getTime() - now.getTime();
      
      if (diffMs <= 0) return 'Expired';
      
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Expires today';
      if (diffDays <= 7) return `${diffDays} days left`;
      if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
      return `${Math.ceil(diffDays / 30)} months left`;
    } catch (error) {
      return null;
    }
  }, [expiresAt]);

  const listingAge = useMemo(() => {
    if (!createdAt) return null;
    
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - created.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Posted today';
      if (diffDays === 1) return 'Posted yesterday';
      if (diffDays <= 7) return `Posted ${diffDays} days ago`;
      if (diffDays <= 30) return `Posted ${Math.ceil(diffDays / 7)} weeks ago`;
      return `Posted ${Math.ceil(diffDays / 30)} months ago`;
    } catch (error) {
      return null;
    }
  }, [createdAt]);

  return (
    <View style={styles.container}>
      {/* Engagement Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Eye size={14} color="#6B7280" />
          <Text style={styles.statText}>
            {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
          </Text>
        </View>
        
        <View style={styles.statItem}>
          <MessageCircle size={14} color="#6B7280" />
          <Text style={styles.statText}>
            {pingCount} {pingCount === 1 ? 'ping' : 'pings'}
          </Text>
        </View>
      </View>

      {/* Time Information Row */}
      <View style={styles.timeRow}>
        {listingAge && (
          <Text style={styles.timeText}>{listingAge}</Text>
        )}
        {timeRemaining && (
          <View style={[
            styles.expiryBadge,
            timeRemaining === 'Expired' ? styles.expiredBadge : styles.activeBadge
          ]}>
            <Clock size={12} color={timeRemaining === 'Expired' ? '#DC2626' : '#059669'} />
            <Text style={[
              styles.expiryText,
              { color: timeRemaining === 'Expired' ? '#DC2626' : '#059669' }
            ]}>
              {timeRemaining}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  expiredBadge: {
    backgroundColor: '#FEF2F2',
  },
  expiryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});

ListingEngagementMetrics.displayName = 'ListingEngagementMetrics';

export default ListingEngagementMetrics;
