import React, { useState, useEffect } from 'react';
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
}

export default function LocationCheckPopup({ 
  visible, 
  onClose, 
  onRetry 
}: LocationCheckPopupProps) {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) {
      checkLocationStatus();
    }
  }, [visible]);

  const checkLocationStatus = async () => {
    setChecking(true);
    try {
      // Check GPS status
      const locationEnabled = await Location.hasServicesEnabledAsync();
      setGpsEnabled(locationEnabled);

      // Check permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      // Error checking location status
      setGpsEnabled(false);
      setPermissionStatus('denied');
    } finally {
      setChecking(false);
    }
  };

  const openLocationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const openGPSSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('App-Prefs:Privacy&path=LOCATION');
    } else {
      Linking.openSettings();
    }
  };

  const openPhoneLocationSettings = () => {
    if (Platform.OS === 'ios') {
      // Open iOS Location Services settings
      Linking.openURL('App-Prefs:Privacy&path=LOCATION');
    } else {
      // Open Android Location settings
      Linking.openURL('android.settings.LOCATION_SOURCE_SETTINGS');
    }
  };

  const handleRetry = () => {
    onRetry();
  };

  const getStatusMessage = () => {
    if (checking) {
      return 'Checking location status...';
    }

    if (!gpsEnabled && permissionStatus !== 'granted') {
      return 'Location permission and GPS are required for this app to work properly.';
    } else if (!gpsEnabled) {
      return 'GPS is turned off. Please enable location services to use this app.';
    } else if (permissionStatus !== 'granted') {
      return 'Location permission is required for this app to work properly.';
    }

    return '';
  };

  const getActionButton = () => {
    if (checking) return null;

    if (!gpsEnabled && permissionStatus !== 'granted') {
      return (
        <>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={openLocationSettings}
            >
              <Text style={styles.buttonText}>Fix Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={openGPSSettings}
            >
              <Text style={styles.buttonText}>Enable GPS</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton, styles.fullWidthButton]}
            onPress={openPhoneLocationSettings}
          >
            <Text style={styles.buttonText}>Open Location Settings</Text>
          </TouchableOpacity>
        </>
      );
    } else if (!gpsEnabled) {
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={openGPSSettings}
          >
            <Text style={styles.buttonText}>Enable GPS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton]}
            onPress={openPhoneLocationSettings}
          >
            <Text style={styles.buttonText}>Location Settings</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (permissionStatus !== 'granted') {
      return (
        <>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
            onPress={openLocationSettings}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.tertiaryButton, styles.fullWidthButton]}
            onPress={openPhoneLocationSettings}
          >
            <Text style={styles.buttonText}>Open Location Settings</Text>
          </TouchableOpacity>
        </>
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
                color={gpsEnabled && permissionStatus === 'granted' ? '#22C55E' : '#EF4444'} 
              />
            </View>
            <Text style={styles.title}>Location Required</Text>
            <Text style={styles.subtitle}>
              This app needs location access to function properly
            </Text>
          </View>

          {/* Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Ionicons 
                name={permissionStatus === 'granted' ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={permissionStatus === 'granted' ? '#22C55E' : '#EF4444'} 
              />
              <Text style={styles.statusText}>
                Location Permission: {permissionStatus === 'granted' ? 'Granted' : 'Required'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <Ionicons 
                name={gpsEnabled ? 'checkmark-circle' : 'close-circle'} 
                size={20} 
                color={gpsEnabled ? '#22C55E' : '#EF4444'} 
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

          {/* Footer Buttons */}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Check Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
    gap: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#22C55E',
  },
  secondaryButton: {
    backgroundColor: '#3B82F6',
  },
  tertiaryButton: {
    backgroundColor: '#8B5CF6',
  },
  fullWidthButton: {
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
    marginTop: 8,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,

    backgroundColor: '#F59E0B',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,

    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
