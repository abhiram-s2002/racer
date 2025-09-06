import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 36) / 2; // Account for padding and gap

interface ListingSkeletonProps {
  count?: number;
}

export default function ListingSkeleton({ count = 6 }: ListingSkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, []);

  const shimmerStyle = {
    opacity: shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    }),
  };

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      {/* Image skeleton */}
      <Animated.View style={[styles.skeletonImage, shimmerStyle]} />
      
      <View style={styles.skeletonContent}>
        {/* Title skeleton */}
        <Animated.View style={[styles.skeletonTitle, shimmerStyle]} />
        <Animated.View style={[styles.skeletonTitleShort, shimmerStyle]} />
        
        {/* Price skeleton */}
        <Animated.View style={[styles.skeletonPrice, shimmerStyle]} />
        
        {/* Seller info skeleton */}
        <Animated.View style={[styles.skeletonSeller, shimmerStyle]} />
        
        {/* Category and date skeleton */}
        <View style={styles.skeletonMetaRow}>
          <Animated.View style={[styles.skeletonCategory, shimmerStyle]} />
          <Animated.View style={[styles.skeletonDate, shimmerStyle]} />
        </View>
        
        {/* Rating skeleton */}
        <Animated.View style={[styles.skeletonRating, shimmerStyle]} />
        
        {/* Action buttons skeleton */}
        <View style={styles.skeletonActions}>
          <Animated.View style={[styles.skeletonButton, shimmerStyle]} />
          <Animated.View style={[styles.skeletonButton, shimmerStyle]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 8,
    width: ITEM_WIDTH,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  skeletonImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F1F5F9',
  },
  skeletonContent: {
    padding: 8,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 4,
    width: '90%',
  },
  skeletonTitleShort: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 6,
    width: '60%',
  },
  skeletonPrice: {
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 6,
    width: '40%',
  },
  skeletonSeller: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 6,
    width: '50%',
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  skeletonCategory: {
    height: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    width: 60,
  },
  skeletonDate: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    width: 40,
  },
  skeletonRating: {
    height: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'flex-end',
    marginTop: 'auto',
  },
  skeletonButton: {
    flex: 1,
    height: 28,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
  },
});
