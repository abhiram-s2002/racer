import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface LoadMoreButtonProps {
  onPress: () => void;
  hasMore: boolean;
}

export default function LoadMoreButton({ onPress, hasMore }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <TouchableOpacity 
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.text}>Load 10 More</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
  },
});
