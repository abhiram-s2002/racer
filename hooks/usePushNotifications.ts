import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabaseClient';

// Use Firebase mock in development/Expo Go
let messaging: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default || firebaseMessaging;
} catch (error) {
  // Fallback to mock in Expo Go
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseMock = require('@/utils/firebaseMock');
  messaging = firebaseMock.messaging;
}

type UsePushNotificationsOptions = {
  userId?: string;
};

/**
 * Registers for FCM push notifications on Android and upserts the token
 * into Supabase `device_tokens` table. Handles token refresh lifecycle.
 */
export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { userId } = options;
  const currentTokenRef = useRef<string | null>(null);

  const ensurePermission = useCallback(async () => {
    // Android 13+ requires POST_NOTIFICATIONS permission
    const authStatus = await messaging.requestPermission();
    return authStatus;
  }, []);

  const upsertToken = useCallback(async (token: string) => {
    if (!userId || !token) return;
    if (currentTokenRef.current === token) return; // avoid redundant upserts

    currentTokenRef.current = token;
    await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          fcm_token: token,
          platform: 'android',
        },
        { onConflict: 'user_id,fcm_token' }
      );
  }, [userId]);

  const register = useCallback(async () => {
    if (!userId) return;
    await ensurePermission();

    // FCM token for this device
    const token = await messaging.getToken();
    if (token) {
      await upsertToken(token);
    }
  }, [userId, ensurePermission, upsertToken]);

  useEffect(() => {
    if (Platform.OS !== 'android') return; // Only Android is targeted
    if (!userId) return;

    // Initial registration
    register();

    // Token refresh listener
    const unsubscribeTokenRefresh = messaging.onTokenRefresh(async (newToken: string) => {
      await upsertToken(newToken);
    });

    // Foreground message handler (optional: show in-app UI)
    const unsubscribeForeground = messaging.onMessage(async (_message: any) => {
      // You can integrate your in-app toast/banner here if desired
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeForeground();
    };
  }, [userId, register, upsertToken]);

  return useMemo(() => ({ register }), [register]);
}


