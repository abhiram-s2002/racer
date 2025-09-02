import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronUp } from 'lucide-react-native';

interface LoadMoreMessagesButtonProps {
  onPress: () => void;
  hasMore: boolean;
  loading?: boolean;
  messageCount: number;
  totalCount: number;
}

export default function LoadMoreMessagesButton({
  onPress,
  hasMore,
  loading = false,
  messageCount,
  totalCount
}: LoadMoreMessagesButtonProps) {
  if (!hasMore) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={onPress}
        disabled={loading}
      >
        <ChevronUp size={16} color="#64748B" />
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : `Load 10 more messages`}
        </Text>
        <Text style={styles.countText}>
          Showing {messageCount} of {totalCount} • {totalCount - messageCount} remaining
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginLeft: 8,
  },
});
