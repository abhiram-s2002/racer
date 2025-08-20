import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface LoadMoreSectionProps {
  currentListings: number;
  totalListings: number;
  onLoadMore: () => void;
  hasMore: boolean;
}

export default function LoadMoreSection({ 
  currentListings, 
  totalListings, 
  onLoadMore, 
  hasMore 
}: LoadMoreSectionProps) {
  return (
    <View style={styles.container}>
      {/* Load More Button - Always Visible with Listings Count */}
      <View style={styles.loadMoreSection}>
        <TouchableOpacity 
          style={[
            styles.loadMoreButton,
            !hasMore && styles.loadMoreButtonDisabled
          ]}
          onPress={onLoadMore}
          disabled={!hasMore}
        >
          <Text style={[
            styles.loadMoreText,
            !hasMore && styles.loadMoreTextDisabled
          ]}>
            {hasMore ? 'Load More' : 'All Listings Loaded'}
          </Text>
          <Text style={[
            styles.loadMoreSubtext,
            !hasMore && styles.loadMoreSubtextDisabled
          ]}>
            {hasMore ? `${currentListings} of ${totalListings} listings` : 'No more to load'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadMoreSection: {
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  loadMoreSubtext: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loadMoreButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  loadMoreTextDisabled: {
    color: '#F1F5F9',
  },
  loadMoreSubtextDisabled: {
    color: '#F1F5F9',
    opacity: 0.8,
  },
});
