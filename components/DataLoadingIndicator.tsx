import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';

interface DataLoadingIndicatorProps {
  status: 'loading' | 'success' | 'error' | 'pending';
  message?: string;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export default function DataLoadingIndicator({ 
  status, 
  message, 
  showIcon = true, 
  size = 'medium',
  style 
}: DataLoadingIndicatorProps) {
  
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'medium': return 20;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return 12;
      case 'medium': return 14;
      case 'large': return 16;
      default: return 14;
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          color: '#22C55E',
          message: message || 'Loading...',
          animated: true
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: '#22C55E',
          message: message || 'Success',
          animated: false
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: '#EF4444',
          message: message || 'Error occurred',
          animated: false
        };
      case 'pending':
        return {
          icon: Clock,
          color: '#F59E0B',
          message: message || 'Pending',
          animated: false
        };
      default:
        return {
          icon: Loader2,
          color: '#22C55E',
          message: message || 'Loading...',
          animated: true
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <View style={[styles.container, style]}>
      {showIcon && (
        <View style={styles.iconContainer}>
          <IconComponent 
            size={getIconSize()} 
            color={config.color}
            style={config.animated ? styles.rotating : undefined}
          />
        </View>
      )}
      <Text style={[
        styles.message, 
        { 
          color: config.color, 
          fontSize: getTextSize() 
        }
      ]}>
        {config.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  message: {
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  rotating: {
    // Animation will be handled by the icon component itself
  },
});
