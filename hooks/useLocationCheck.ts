import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';

export function useLocationCheck() {
  const [showPopup, setShowPopup] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkLocationStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      // Check GPS status
      const locationEnabled = await Location.hasServicesEnabledAsync();
      
      // Check permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      
      // Show popup only if there are issues
      const hasIssues = !locationEnabled || status !== 'granted';
      setShowPopup(hasIssues);
      
      return {
        gpsEnabled: locationEnabled,
        permissionGranted: status === 'granted',
        hasIssues
      };
    } catch (error) {
      setShowPopup(true); // Show popup on error
      return {
        gpsEnabled: false,
        permissionGranted: false,
        hasIssues: true
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const hidePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  const retryCheck = useCallback(() => {
    checkLocationStatus();
  }, [checkLocationStatus]);

  // Check location status when hook is first used
  useEffect(() => {
    checkLocationStatus();
  }, [checkLocationStatus]);

  // Check location status when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check location status
        checkLocationStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkLocationStatus]);

  return {
    showPopup,
    isChecking,
    checkLocationStatus,
    hidePopup,
    retryCheck,
  };
}
