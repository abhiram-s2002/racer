import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import StarRating from './StarRating';
import { RatingDisplayProps, UserRatingStats } from '../utils/types';
import RatingService from '../utils/ratingService';

/**
 * Displays user rating summary with stars, average, and count
 * Similar styling to the feedback modal
 */
export default function RatingDisplay({ 
  username, 
  showDetails = false, 
  size = 'medium', 
  showCount = true, 
  showAverage = true 
}: RatingDisplayProps) {
  const [ratingStats, setRatingStats] = useState<UserRatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRatingStats();
  }, [username]);

  const loadRatingStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await RatingService.getUserRatingStats(username);
      setRatingStats(stats);
    } catch (err) {
      setError('Failed to load rating');
      console.error('Error loading rating stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#64748B" />
      </View>
    );
  }

  if (error || !ratingStats) {
    return (
      <View style={styles.container}>
        <Text style={styles.noRatingText}>No ratings yet</Text>
      </View>
    );
  }

  const { average_rating, total_ratings, rating_distribution } = ratingStats;

  // Don't show anything if no ratings
  if (total_ratings === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noRatingText}>No ratings yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Star Rating Display */}
      <View style={styles.ratingRow}>
        <StarRating 
          rating={Math.round(average_rating)} 
          size={size} 
          readonly={true} 
        />
        
        {/* Average Rating and Count */}
        <View style={styles.ratingInfo}>
          {showAverage && (
            <Text style={styles.averageRating}>
              {average_rating.toFixed(1)}
            </Text>
          )}
          {showCount && (
            <Text style={styles.ratingCount}>
              ({total_ratings})
            </Text>
          )}
        </View>
      </View>

      {/* Detailed Rating Breakdown */}
      {showDetails && total_ratings > 0 && (
        <View style={styles.detailsContainer}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = rating_distribution[star.toString()] || 0;
            const percentage = total_ratings > 0 ? (count / total_ratings) * 100 : 0;
            
            return (
              <View key={star} style={styles.ratingBarRow}>
                <Text style={styles.starLabel}>{star}★</Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.countText}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  averageRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  ratingCount: {
    fontSize: 12,
    color: '#64748B',
  },
  noRatingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  detailsContainer: {
    marginTop: 8,
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabel: {
    fontSize: 12,
    color: '#64748B',
    width: 20,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  countText: {
    fontSize: 11,
    color: '#64748B',
    width: 20,
    textAlign: 'right',
  },
});
