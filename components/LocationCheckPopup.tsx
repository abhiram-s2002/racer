import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationCheckPopupProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  locationStatus?: {
    gpsEnabled: boolean | null;
    permissionGranted: boolean | null;
  };
  isChecking?: boolean;
}

const LocationCheckPopup = memo(function LocationCheckPopup({ 
  visible, 
  onClose, 
  onRetry,
  locationStatus = { gpsEnabled: null, permissionGranted: null },
  isChecking = false
}: LocationCheckPopupProps) {
  // Use data from hook instead of duplicating API calls
  const gpsEnabled = locationStatus.gpsEnabled;
  const permissionStatus = locationStatus.permissionGranted ? 'granted' : 'denied';
  const checking = isChecking;

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Open app-specific settings
        const url = 'app-settings:';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback to general settings
          await Linking.openSettings();
        }
      } else {
        // Android: Open app-specific settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening app settings:', error);
      // Fallback to general settings
      Linking.openSettings();
    }
  };

  const openGPSSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // iOS: Open Location Services settings
        const url = 'App-Prefs:Privacy&path=LOCATION';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback to general settings
          await Linking.openSettings();
        }
      } else {
        // Android: Open Location settings directly
        const url = 'android.settings.LOCATION_SOURCE_SETTINGS';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // Fallback to general settings
          await Linking.openSettings();
        }
      }
    } catch (error) {
      console.error('Error opening GPS settings:', error);
      // Fallback to general settings
      Linking.openSettings();
    }
  };

  const triggerSystemPrompt = async () => {
    try {
      // This will trigger the system location permission prompt
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Permission granted, close popup
        onClose();
      }
      // If denied, popup stays open
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const handleRetry = () => {
    onRetry();
  };

  const getStatusMessage = () => {
    if (checking) {
      return 'Checking location access...';
    }

    if (!gpsEnabled && permissionStatus !== 'granted') {
      return 'We need location access to show you nearby items and help you find what you\'re looking for.';
    } else if (!gpsEnabled) {
      return 'Location services are turned off. Enable them to discover items near you.';
    } else if (permissionStatus !== 'granted') {
      return 'Allow location access to see nearby items and connect with local sellers.';
    }

    return '';
  };

  const getActionButton = () => {
    if (checking) return null;

    // Show system prompt button for permission issues
    if (permissionStatus !== 'granted') {
      return (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
          onPress={triggerSystemPrompt}
        >
          <Text style={styles.buttonText}>Allow Location Access</Text>
        </TouchableOpacity>
      );
    }

    // Show GPS settings button for GPS issues
    if (!gpsEnabled) {
      return (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
          onPress={openGPSSettings}
        >
          <Text style={styles.buttonText}>Enable Location Services</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // Don't show popup if everything is working
  if (visible && gpsEnabled && permissionStatus === 'granted') {
    onClose();
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="location" 
                size={32} 
                color="#EF4444"
              />
            </View>
            <Text style={styles.title}>Location Access</Text>
            <Text style={styles.subtitle}>
              Help us show you the best nearby items
            </Text>
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Ionicons 
                name={permissionStatus === 'granted' ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={permissionStatus === 'granted' ? '#10B981' : '#EF4444'} 
              />
              <Text style={styles.statusText}>
                Location Permission: {permissionStatus === 'granted' ? 'Granted' : 'Required'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons 
                name={gpsEnabled ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={gpsEnabled ? '#10B981' : '#EF4444'} 
              />
              <Text style={styles.statusText}>
                GPS: {gpsEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>{getStatusMessage()}</Text>

          {/* Action Buttons */}
          {getActionButton()}

          {/* Check Again Button */}
          <TouchableOpacity
            style={styles.checkAgainButton}
            onPress={handleRetry}
          >
            <Text style={styles.checkAgainButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusContainer: {
    width: '100%',
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  fullWidthButton: {
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  checkAgainButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  checkAgainButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});

export default LocationCheckPopup;
