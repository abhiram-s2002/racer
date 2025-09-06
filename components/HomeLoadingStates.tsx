import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react-native';
import ListingSkeleton from './ListingSkeleton';

interface HomeLoadingStatesProps {
  stage: 'initial' | 'loading' | 'error' | 'offline' | 'empty';
  onRetry?: () => void;
  errorMessage?: string;
}

export default function HomeLoadingStates({ 
  stage, 
  onRetry, 
  errorMessage = 'Something went wrong' 
}: HomeLoadingStatesProps) {
  
  const renderInitialLoading = () => (
    <View style={styles.skeletonContainer}>
      <ListingSkeleton count={6} />
    </View>
  );

  const renderSkeletonLoading = () => (
    <View style={styles.skeletonContainer}>
      <ListingSkeleton count={6} />
    </View>
  );

  const renderError = () => (
    <View style={styles.container}>
      <View style={styles.errorContent}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        {onRetry && (
          <View style={styles.retryButton} onTouchEnd={onRetry}>
            <RefreshCw size={20} color="#22C55E" />
            <Text style={styles.retryText}>Try Again</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderOffline = () => (
    <View style={styles.container}>
      <View style={styles.offlineContent}>
        <WifiOff size={48} color="#F59E0B" />
        <Text style={styles.offlineTitle}>You&apos;re offline</Text>
        <Text style={styles.offlineMessage}>
          Check your internet connection and try again
        </Text>
        {onRetry && (
          <View style={styles.retryButton} onTouchEnd={onRetry}>
            <Wifi size={20} color="#22C55E" />
            <Text style={styles.retryText}>Retry</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.container}>
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No listings found</Text>
        <Text style={styles.emptyMessage}>
          Try adjusting your filters or add a new listing
        </Text>
      </View>
    </View>
  );

  switch (stage) {
    case 'initial':
      return renderInitialLoading();
    case 'loading':
      return renderSkeletonLoading();
    case 'error':
      return renderError();
    case 'offline':
      return renderOffline();
    case 'empty':
      return renderEmpty();
    default:
      return renderInitialLoading();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
    marginHorizontal: 16,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  offlineContent: {
    alignItems: 'center',
  },
  offlineTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  offlineMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  retryText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginLeft: 8,
  },
});
