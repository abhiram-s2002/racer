import { supabase } from './supabaseClient';
import { processUndeliveredNotifications } from './fcmClient';

/**
 * Triggers notification delivery using client-side processing
 * This is a fallback when server-side FCM is not available
 */
export async function triggerNotificationDelivery() {
  try {
    // Try server-side FCM first
    const { data, error } = await supabase.functions.invoke('send-fcm-working', {
      body: {}
    });

    if (error) {
      console.error('Server-side FCM failed, falling back to client-side:', error);
      // Fallback to client-side processing
      await processUndeliveredNotifications();
      return { success: true, data: { method: 'client-side-fallback' } };
    }

    console.log('Notification delivery triggered (server-side FCM):', data);
    return { success: true, data: { method: 'server-side', ...data } };
  } catch (err) {
    console.error('Error triggering notification delivery:', err);
    // Fallback to client-side processing
    try {
      await processUndeliveredNotifications();
      return { success: true, data: { method: 'client-side-fallback' } };
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr };
    }
  }
}

/**
 * Creates a notification and immediately triggers delivery
 */
export async function createAndDeliverNotification(
  recipientUserId: string,
  type: 'request_created' | 'request_accepted',
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  try {
    // Create the notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: recipientUserId,
        type,
        title,
        body,
        data
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create notification:', insertError);
      return { success: false, error: insertError };
    }

    // Trigger delivery
    const deliveryResult = await triggerNotificationDelivery();
    
    return {
      success: true,
      notification,
      deliveryResult
    };
  } catch (err) {
    console.error('Error creating and delivering notification:', err);
    return { success: false, error: err };
  }
}
