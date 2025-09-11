/**
 * Google Play Subscription Webhook Handler
 * Handles subscription events from Google Play Console
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GooglePlayNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: number;
    purchaseToken: string;
    subscriptionId: string;
  };
  testNotification?: {
    version: string;
  };
}

interface SubscriptionEvent {
  type: 'SUBSCRIPTION_PURCHASED' | 'SUBSCRIPTION_RENEWED' | 'SUBSCRIPTION_CANCELLED' | 'SUBSCRIPTION_EXPIRED' | 'SUBSCRIPTION_RESTARTED';
  purchaseToken: string;
  subscriptionId: string;
  eventTime: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse the notification
    const notification: GooglePlayNotification = await req.json()
    
    console.log('Received Google Play notification:', JSON.stringify(notification, null, 2))

    // Handle test notifications
    if (notification.testNotification) {
      console.log('Test notification received')
      return new Response(
        JSON.stringify({ success: true, message: 'Test notification received' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Handle subscription notifications
    if (notification.subscriptionNotification) {
      const subNotification = notification.subscriptionNotification
      const eventTime = parseInt(notification.eventTimeMillis)
      
      // Map notification types to our event types
      const eventType = mapNotificationType(subNotification.notificationType)
      
      if (eventType) {
        const event: SubscriptionEvent = {
          type: eventType,
          purchaseToken: subNotification.purchaseToken,
          subscriptionId: subNotification.subscriptionId,
          eventTime: eventTime
        }

        // Process the subscription event
        await processSubscriptionEvent(supabaseClient, event)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification processed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function mapNotificationType(notificationType: number): SubscriptionEvent['type'] | null {
  switch (notificationType) {
    case 1: return 'SUBSCRIPTION_PURCHASED'
    case 2: return 'SUBSCRIPTION_RENEWED'
    case 3: return 'SUBSCRIPTION_CANCELLED'
    case 4: return 'SUBSCRIPTION_EXPIRED'
    case 5: return 'SUBSCRIPTION_RESTARTED'
    default: return null
  }
}

async function processSubscriptionEvent(supabaseClient: any, event: SubscriptionEvent) {
  try {
    console.log('Processing subscription event:', event)

    // Get user by subscription token (you might need to store this mapping)
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('user_id, username, product_id')
      .eq('purchase_token', event.purchaseToken)
      .single()

    if (subError || !subscription) {
      console.error('Subscription not found for token:', event.purchaseToken)
      return
    }

    // Handle different event types
    switch (event.type) {
      case 'SUBSCRIPTION_PURCHASED':
      case 'SUBSCRIPTION_RENEWED':
        await handleSubscriptionActivated(supabaseClient, subscription, event)
        break
      
      case 'SUBSCRIPTION_CANCELLED':
      case 'SUBSCRIPTION_EXPIRED':
        await handleSubscriptionDeactivated(supabaseClient, subscription, event)
        break
      
      case 'SUBSCRIPTION_RESTARTED':
        await handleSubscriptionRestarted(supabaseClient, subscription, event)
        break
    }

    // Log the event
    await logSubscriptionEvent(supabaseClient, subscription, event)

  } catch (error) {
    console.error('Error processing subscription event:', error)
    throw error
  }
}

async function handleSubscriptionActivated(supabaseClient: any, subscription: any, event: SubscriptionEvent) {
  // Calculate expiry time based on product type
  let expiryTime: number | null = null
  if (subscription.product_id.includes('monthly')) {
    expiryTime = event.eventTime + (30 * 24 * 60 * 60 * 1000) // 30 days
  } else if (subscription.product_id.includes('annual')) {
    expiryTime = event.eventTime + (365 * 24 * 60 * 60 * 1000) // 365 days
  }

  // Update subscription status
  await supabaseClient
    .from('user_subscriptions')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('purchase_token', event.purchaseToken)

  // Update user verification status
  await supabaseClient
    .from('users')
    .update({
      verification_status: 'verified',
      verified_at: new Date(event.eventTime).toISOString(),
      expires_at: expiryTime ? new Date(expiryTime).toISOString() : null
    })
    .eq('id', subscription.user_id)

  console.log('Subscription activated for user:', subscription.user_id)
}

async function handleSubscriptionDeactivated(supabaseClient: any, subscription: any, event: SubscriptionEvent) {
  // Deactivate subscription
  await supabaseClient
    .from('user_subscriptions')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('purchase_token', event.purchaseToken)

  // Update user verification status
  await supabaseClient
    .from('users')
    .update({
      verification_status: 'not_verified'
    })
    .eq('id', subscription.user_id)

  console.log('Subscription deactivated for user:', subscription.user_id)
}

async function handleSubscriptionRestarted(supabaseClient: any, subscription: any, event: SubscriptionEvent) {
  // Similar to activation
  await handleSubscriptionActivated(supabaseClient, subscription, event)
  console.log('Subscription restarted for user:', subscription.user_id)
}

async function logSubscriptionEvent(supabaseClient: any, subscription: any, event: SubscriptionEvent) {
  await supabaseClient
    .from('subscription_transactions')
    .insert({
      user_id: subscription.user_id,
      username: subscription.username,
      product_id: subscription.product_id,
      transaction_type: event.type.toLowerCase().replace('subscription_', ''),
      purchase_token: event.purchaseToken,
      platform: 'android',
      status: 'completed'
    })
}
