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
      // Error loading rating stats
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

  // Always show a rating row even when there are no ratings yet
  const safeStats: UserRatingStats = ratingStats || {
    average_rating: 0,
    total_ratings: 0,
    five_star_count: 0,
    four_star_count: 0,
    three_star_count: 0,
    two_star_count: 0,
    one_star_count: 0,
  } as any;

  const { average_rating, total_ratings } = safeStats;
  const roundedRating = Math.round(average_rating);
  
  // Show "No ratings yet" when there are no ratings
  const hasRatings = total_ratings > 0;

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
        {hasRatings ? (
          <>
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
          </>
        ) : (
          <Text style={[
            styles.noRatingsText,
            compact && styles.compactNoRatingsText
          ]}>
            No ratings yet
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
  noRatingsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  compactNoRatingsText: {
    fontSize: 10,
  },
});

