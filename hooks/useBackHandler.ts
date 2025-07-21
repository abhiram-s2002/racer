import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';

export const useBackHandler = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      // Only handle back button on tab screens when no specific handler is active
      if (pathname.startsWith('/(tabs)')) {
        // Check if we can go back in the navigation stack
        if (router.canGoBack()) {
          router.back();
          return true;
        }
        
        // If we can't go back and we're on a tab, exit the app
        BackHandler.exitApp();
        return true;
      }

      // For non-tab screens, let the default behavior handle it
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [pathname]);
}; 