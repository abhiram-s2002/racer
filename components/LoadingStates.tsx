import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react-native';

interface LoadingStatesProps {
  type: 'spinner' | 'inline' | 'button' | 'success' | 'error';
  message?: string;
  size?: 'small' | 'large';
  onRetry?: () => void;
  color?: string;
  style?: any;
}

export default function LoadingStates({ 
  type, 
  message, 
  size = 'small', 
  onRetry, 
  color = '#22C55E',
  style 
}: LoadingStatesProps) {
  
  const renderSpinner = () => (
    <View style={[styles.spinnerContainer, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={[styles.message, { color }]}>{message}</Text>}
    </View>
  );

  const renderInline = () => (
    <View style={[styles.inlineContainer, style]}>
      <Loader2 size={16} color={color} />
      {message && <Text style={[styles.inlineMessage, { color }]}>{message}</Text>}
    </View>
  );

  const renderButton = () => (
    <TouchableOpacity 
      style={[styles.buttonContainer, style]} 
      onPress={onRetry}
      disabled={!onRetry}
    >
      <ActivityIndicator size="small" color="#fff" />
      {message && <Text style={styles.buttonText}>{message}</Text>}
    </TouchableOpacity>
  );

  const renderSuccess = () => (
    <View style={[styles.statusContainer, style]}>
      <CheckCircle size={20} color="#22C55E" />
      {message && <Text style={[styles.statusMessage, { color: '#22C55E' }]}>{message}</Text>}
    </View>
  );

  const renderError = () => (
    <View style={[styles.statusContainer, style]}>
      <AlertCircle size={20} color="#EF4444" />
      {message && <Text style={[styles.statusMessage, { color: '#EF4444' }]}>{message}</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={16} color="#22C55E" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  switch (type) {
    case 'spinner':
      return renderSpinner();
    case 'inline':
      return renderInline();
    case 'button':
      return renderButton();
    case 'success':
      return renderSuccess();
    case 'error':
      return renderError();
    default:
      return renderSpinner();
  }
}

const styles = StyleSheet.create({
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  inlineMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#fff',
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  retryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginLeft: 4,
  },
});
