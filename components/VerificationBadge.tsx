import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VerificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  size = 'medium',
  style 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
          text: 8,
          tick: 8,
        };
      case 'large':
        return {
          container: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
          text: 12,
          tick: 12,
        };
      default: // medium
        return {
          container: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
          text: 9,
          tick: 9,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, sizeStyles.container, style]}>
      <Text style={[styles.tick, { fontSize: sizeStyles.tick }]}>✓</Text>
      <Text style={[styles.verifiedText, { fontSize: sizeStyles.text }]}>VERIFIED</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#10B981', // Green color like your app theme
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  tick: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

export default VerificationBadge;