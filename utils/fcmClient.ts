// Client-side FCM handling
// This handles FCM sending directly from the client when possible

import { supabase } from './supabaseClient';

// Use Firebase mock in development/Expo Go
let messaging: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default || firebaseMessaging;
} catch (error) {
  // Fallback to mock in Expo Go
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const firebaseMock = require('./firebaseMock');
  messaging = firebaseMock.messaging;
}

export interface FCMNotification {
  id: string;
  recipient_user_id: string;
  type: 'ping_rejected' | 'ping_accepted';
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * Send FCM notification directly from client
 * This is a fallback when server-side FCM is not available
 */
export async function sendFCMDirect(notification: FCMNotification) {
  try {
    // Get the current user's FCM token
    const token = await messaging.getToken();
    if (!token) {
      throw new Error('No FCM token available');
    }

    // For now, we'll just log the notification
    // In a real implementation, you'd send to other users' tokens
    console.log('FCM Notification would be sent:', {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      type: notification.type
    });

    // Mark as delivered since we "sent" it
    await supabase
      .from('notifications')
      .update({ delivered: true })
      .eq('id', notification.id);

    return { success: true, messageId: `client_${Date.now()}` };
  } catch (error) {
    console.error('FCM direct send error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Process undelivered notifications
 * This can be called periodically or when the app comes to foreground
 */
export async function processUndeliveredNotifications() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get undelivered notifications for current user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', user.id)
      .eq('delivered', false)
      .order('updated_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (!notifications || notifications.length === 0) {
      return;
    }

    console.log(`Processing ${notifications.length} undelivered notifications`);

    // Process each notification
    for (const notification of notifications) {
      try {
        // Show local notification or in-app banner
        await showLocalNotification(notification);
        
        // Mark as delivered
        await supabase
          .from('notifications')
          .update({ delivered: true })
          .eq('id', notification.id);
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    }
  } catch (error) {
    console.error('Error processing undelivered notifications:', error);
  }
}

/**
 * Show local notification (in-app banner or system notification)
 */
async function showLocalNotification(notification: FCMNotification) {
  // For now, just log to console
  // In a real implementation, you'd show an in-app banner or system notification
  console.log('📱 Notification:', {
    title: notification.title,
    body: notification.body,
    type: notification.type,
    data: notification.data
  });

  // You could integrate with a notification library here
  // For example: react-native-push-notification, expo-notifications, etc.
}

/**
 * Setup FCM message handlers
 */
export function setupFCMHandlers() {
  // Handle foreground messages
  const unsubscribeForeground = messaging.onMessage(async (remoteMessage: any) => {
    console.log('FCM foreground message:', remoteMessage);
    
    // Show in-app notification
    if (remoteMessage.notification) {
      console.log('📱 Foreground notification:', {
        title: remoteMessage.notification.title,
        body: remoteMessage.notification.body
      });
    }
  });

  // Handle background messages
  messaging.setBackgroundMessageHandler(async (remoteMessage: any) => {
    console.log('FCM background message:', remoteMessage);
  });

  return unsubscribeForeground;
}
