import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StarRatingProps } from '@/utils/types';

/**
 * Interactive 5-star rating component
 * Uses the same star icons (★ and ☆) as the feedback modal
 */
export default function StarRating({ 
  rating, 
  size = 'medium', 
  readonly = false, 
  onRatingChange 
}: StarRatingProps) {
  const handleStarPress = (starValue: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starValue);
    }
  };

  const getStarSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 32;
      default:
        return 24;
    }
  };

  const starSize = getStarSize();

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          style={[
            styles.starButton,
            { padding: readonly ? 2 : 4 }
          ]}
          onPress={() => handleStarPress(star)}
          disabled={readonly}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Text style={[
            styles.starText,
            { 
              fontSize: starSize,
              color: rating >= star ? '#FFD700' : '#E2E8F0'
            }
          ]}>
            {rating >= star ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 24,
    lineHeight: 24,
  },
});

