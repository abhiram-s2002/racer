import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ListingsInfoBoxProps {
  onCloseDisclaimer: () => void;
}

export default function ListingsInfoBox({ 
  onCloseDisclaimer
}: ListingsInfoBoxProps) {
  return (
    <View style={styles.container}>
      {/* Beta Disclaimer - Closeable */}
      <View style={styles.betaDisclaimer}>
        <View style={styles.betaContent}>
          <Text style={styles.betaText}>
            Map view is currently in beta testing. For the best experience browsing listings, we recommend using the Home tab. Thank you for your patience as we improve this feature.
          </Text>
          <TouchableOpacity 
            style={styles.closeDisclaimerButton}
            onPress={onCloseDisclaimer}
          >
            <Text style={styles.closeDisclaimerText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  betaDisclaimer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  betaContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  betaText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
    lineHeight: 16,
    flex: 1,
    marginRight: 8,
  },
  closeDisclaimerButton: {
    padding: 2,
    marginTop: -2,
  },
  closeDisclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
});
