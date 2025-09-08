import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';

export function useLocationCheck() {
  const [showPopup, setShowPopup] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    gpsEnabled: boolean | null;
    permissionGranted: boolean | null;
  }>({ gpsEnabled: null, permissionGranted: null });
  
  // Rate limiting: only check once per 5 seconds
  const lastCheckTime = useRef(0);
  const CHECK_INTERVAL = 5000;

  const checkLocationStatus = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastCheckTime.current < CHECK_INTERVAL) {
      return locationStatus;
    }
    
    lastCheckTime.current = now;
    setIsChecking(true);
    
    try {
      // Check GPS status first
      const locationEnabled = await Location.hasServicesEnabledAsync();
      
      // Check permission status
      const { status } = await Location.getForegroundPermissionsAsync();
      const permissionGranted = status === 'granted';
      
      const newStatus = {
        gpsEnabled: locationEnabled,
        permissionGranted
      };
      
      setLocationStatus(newStatus);
      
      // Show popup only if there are issues
      const hasIssues = !locationEnabled || !permissionGranted;
      setShowPopup(hasIssues);
      
      return {
        ...newStatus,
        hasIssues
      };
    } catch (error) {
      const errorStatus = {
        gpsEnabled: false,
        permissionGranted: false
      };
      setLocationStatus(errorStatus);
      setShowPopup(true); // Show popup on error
      return {
        ...errorStatus,
        hasIssues: true
      };
    } finally {
      setIsChecking(false);
    }
  }, [locationStatus]);

  const hidePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  const retryCheck = useCallback(() => {
    checkLocationStatus(true); // Force check on retry
  }, [checkLocationStatus]);

  // Check location status when hook is first used
  useEffect(() => {
    checkLocationStatus();
  }, [checkLocationStatus]);

  // Check location status when app comes back to foreground (with rate limiting)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, check location status (rate limited)
        checkLocationStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [checkLocationStatus]);

  return {
    showPopup,
    isChecking,
    locationStatus,
    checkLocationStatus,
    hidePopup,
    retryCheck,
  };
}
