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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  loadMoreSection: {
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#10B981',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    opacity: 0.7,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  loadMoreTextDisabled: {
    color: '#F1F5F9',
  },
  loadMoreSubtextDisabled: {
    color: '#F1F5F9',
    opacity: 0.8,
  },
});
