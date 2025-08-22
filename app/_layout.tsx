/* global console */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getCurrentUser } from '@/utils/auth';
import AuthScreen from './auth';
import { Slot, useRouter, usePathname } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { CacheManager } from '@/components/CacheManager';
import { validatePhoneNumber } from '@/utils/validation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { useLocationCheck } from '@/hooks/useLocationCheck';
import LocationCheckPopup from '@/components/LocationCheckPopup';

function validateUserProfileFields({ id, username, email, name }: { id: string; username: string; email: string; name: string }) {
  const missing = [];
  if (!id) missing.push('id');
  if (!username) missing.push('username');
  if (!email) missing.push('email');
  if (!name) missing.push('name');
  return missing;
}

export async function upsertUserProfile(authUser: any) {
  const errorHandler = ErrorHandler.getInstance();
  
  if (!authUser) return;
  const { id, email, phone, user_metadata } = authUser;
  const name = user_metadata?.full_name || user_metadata?.name || '';
  const avatar_url = user_metadata?.avatar_url || '';
  const username = user_metadata?.username || '';
  const missingFields = validateUserProfileFields({ id, username, email, name });
  if (missingFields.length > 0) {
    const msg = `Cannot upsert user profile. Missing required fields: ${missingFields.join(', ')}`;
    console.error(msg);
    // Don't show alert here as it might be expected during profile setup
    return { error: msg };
  }
  
  // Handle phone number validation and formatting
  let phoneValue = null;
  
  // Clean and validate phone number
  if (phone) {
    const trimmedPhone = phone.trim();
    if (trimmedPhone !== '') {
      // Validate phone number format before inserting
      const phoneValidation = validatePhoneNumber(trimmedPhone);
      if (!phoneValidation.isValid) {
        const msg = `Invalid phone number format: ${phoneValidation.error}`;
        console.error(msg);
        return { error: msg };
      }
      phoneValue = phoneValidation.sanitizedValue || trimmedPhone;
    }
    // If phone is empty string or whitespace, phoneValue remains null
  }
  // If phone is null/undefined, phoneValue remains null
  
  console.log('Upserting user profile with:', { id, username, email, phone: phoneValue, name, avatar_url });
  
  // Check network connectivity before database operation
  if (!networkMonitor.isOnline()) {
    await errorHandler.handleError(
      new Error('No internet connection available'),
      {
        operation: 'upsert_user_profile',
        component: 'AuthGate',
      },
      false // Don't show alert, handle silently
    );
    return { error: 'No internet connection' };
  }
  
  // Try to upsert with id conflict resolution (since id is the primary key)
  try {
    const { error } = await supabase.from('users').upsert([
      {
        id,
        username,
        email,
        phone: phoneValue,
        name,
        avatar_url,
        created_at: new Date().toISOString(),
      }
    ], { onConflict: 'id' });
    
    if (error) {
      await errorHandler.handleError(error, {
        operation: 'upsert_user_profile',
        component: 'AuthGate',
      });
      return { error };
    }

    // Process referral code if user has one stored in metadata
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 [DEBUG] Checking user metadata for referral code...');
    console.log('🔍 [DEBUG] User metadata:', user?.user_metadata);
    
    if (user?.user_metadata?.referral_code) {
      console.log('🔍 [DEBUG] Found referral code in metadata:', user.user_metadata.referral_code);
      try {
        console.log('🔍 [DEBUG] Attempting to import processReferralCode...');
        // Import the function dynamically to avoid circular dependencies
        const { processReferralCode } = await import('./auth');
        console.log('✅ [DEBUG] processReferralCode imported successfully');
        
        console.log('🔍 [DEBUG] Calling processReferralCode with:', {
          code: user.user_metadata.referral_code,
          username: username
        });
        
        const result = await processReferralCode(user.user_metadata.referral_code, username);
        console.log('🔍 [DEBUG] processReferralCode result:', result);
        
        // Clear the referral code from metadata after processing
        console.log('🔍 [DEBUG] Clearing referral code from metadata...');
        await supabase.auth.updateUser({
          data: { referral_code: null }
        });
        console.log('✅ [DEBUG] Referral code processed and cleared from metadata');
      } catch (referralError) {
        console.error('❌ [DEBUG] Error processing referral code:', referralError);
        console.error('❌ [DEBUG] Error stack:', referralError.stack);
      }
    } else {
      console.log('🔍 [DEBUG] No referral code found in user metadata');
    }
  } catch (upsertError) {
    // If upsert fails, try insert instead
    console.log('Upsert failed, trying insert:', upsertError);
    try {
      const { error } = await supabase.from('users').insert([
        {
          id,
          username,
          email,
          phone: phoneValue,
          name,
          avatar_url,
          created_at: new Date().toISOString(),
        }
      ]);
      
      if (error) {
        await errorHandler.handleError(error, {
          operation: 'insert_user_profile',
          component: 'AuthGate',
        });
        return { error };
      }
    } catch (insertError) {
      await errorHandler.handleError(insertError, {
        operation: 'insert_user_profile',
        component: 'AuthGate',
      });
      return { error: insertError };
    }
  }
  return { success: true };
}

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const errorHandler = ErrorHandler.getInstance();
  const { showPopup, hidePopup, retryCheck } = useLocationCheck();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await getCurrentUser();
        console.log('AuthGate: current user:', user);
        setAuthenticated(!!user);
        
        if (user) {
          const username = user.user_metadata?.username;
          const name = user.user_metadata?.full_name || user.user_metadata?.name;
          if (!username || !name) {
            // Prevent redirect loop
            if (pathname !== '/ProfileSetup') {
              router.replace('/ProfileSetup');
            }
            setLoading(false);
            return;
          }
          
          // Location permission is now handled by popup system
          // No need to redirect - popup will show if there are issues
          
          const result = await upsertUserProfile(user);
          if (result && result.error) {
            console.log('User profile upsert failed:', result.error);
          }
        }
        
        setLoading(false);
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'check_auth',
          component: 'AuthGate',
        });
        setLoading(false);
      }
    };
    checkAuth();
  }, []); // Remove pathname dependency to prevent loops

  // Location check is now handled by popup system
  // No need for complex navigation logic

  useEffect(() => {
    // Quick Supabase backend connection check
    (async () => {
      try {
        // Check network connectivity first
        if (!networkMonitor.isOnline()) {
          await errorHandler.handleError(
            new Error('No internet connection available'),
            {
              operation: 'supabase_connection_check',
              component: 'AuthGate',
            },
            false // Don't show alert for network issues during startup
          );
          return;
        }

        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error) {
          await errorHandler.handleError(error, {
            operation: 'supabase_connection_check',
            component: 'AuthGate',
          });
        } else {
          console.log('Supabase connection successful:', data);
        }
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'supabase_connection_check',
          component: 'AuthGate',
        });
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!authenticated) {
    return <AuthScreen />;
  }

  return (
    <ErrorBoundary componentName="AuthGate">
      <CacheManager>
        <Slot />
        
        {/* Location Check Popup */}
        <LocationCheckPopup
          visible={showPopup && authenticated}
          onClose={hidePopup}
          onRetry={retryCheck}
        />
      </CacheManager>
    </ErrorBoundary>
  );
}