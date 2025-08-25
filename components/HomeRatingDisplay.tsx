import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import StarRating from './StarRating';
import { UserRatingStats } from '@/utils/types';
import RatingService from '@/utils/ratingService';

interface HomeRatingDisplayProps {
  username: string;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  showAverage?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

/**
 * Compact rating display for home pages and listing cards
 * Similar styling to feedback modal but more condensed
 */
export default function HomeRatingDisplay({ 
  username, 
  size = 'medium', 
  showCount = true, 
  showAverage = true,
  onPress,
  compact = false
}: HomeRatingDisplayProps) {
  const [ratingStats, setRatingStats] = useState<UserRatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatingStats();
  }, [username]);

  const loadRatingStats = async () => {
    try {
      setLoading(true);
      const stats = await RatingService.getUserRatingStats(username);
      setRatingStats(stats);
    } catch (err) {
      console.error('Error loading rating stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  if (!ratingStats || ratingStats.total_ratings === 0) {
    return null; // Don't show anything if no ratings
  }

  const { average_rating, total_ratings } = ratingStats;
  const roundedRating = Math.round(average_rating);

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      style={[styles.container, compact && styles.compactContainer]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Star Rating */}
      <StarRating 
        rating={roundedRating} 
        size={compact ? 'small' : size} 
        readonly={true} 
      />
      
      {/* Rating Info */}
      <View style={styles.ratingInfo}>
        {showAverage && (
          <Text style={[
            styles.averageRating,
            compact && styles.compactAverageRating
          ]}>
            {average_rating.toFixed(1)}
          </Text>
        )}
        {showCount && (
          <Text style={[
            styles.ratingCount,
            compact && styles.compactRatingCount
          ]}>
            ({total_ratings})
          </Text>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactContainer: {
    gap: 4,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  averageRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  compactAverageRating: {
    fontSize: 12,
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  compactRatingCount: {
    fontSize: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

