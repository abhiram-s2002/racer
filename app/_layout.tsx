/* global console */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { getCurrentUser } from '@/utils/auth';
import AuthScreen from './auth';
import { Slot, useRouter, usePathname } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';
import { initializeSentry } from '@/utils/sentryConfig';
import { googleAnalytics } from '@/utils/googleAnalytics';

import { validatePhoneNumber } from '@/utils/validation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorHandler } from '@/utils/errorHandler';
import { networkMonitor } from '@/utils/networkMonitor';
import { useLocationCheck } from '@/hooks/useLocationCheck';
import LocationCheckPopup from '@/components/LocationCheckPopup';
import AuthLoadingScreen from '@/components/AuthLoadingScreen';


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
  const username = user_metadata?.username || '';
  const missingFields = validateUserProfileFields({ id, username, email, name });
  if (missingFields.length > 0) {
    const msg = `Cannot upsert user profile. Missing required fields: ${missingFields.join(', ')}`;
            // Error message
    // Don't show alert here as it might be expected during profile setup
    return { error: msg };
  }
  
  // Handle phone number validation and formatting
  let phoneValue = null;
  let existingAvatarUrl = null;
  
  // First, check if user already exists in database and preserve existing phone and avatar
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('phone, avatar_url')
      .eq('id', id)
      .single();
    
    if (existingUser?.phone) {
      // Preserve existing phone number from database
      phoneValue = existingUser.phone;
    }
    
    if (existingUser?.avatar_url) {
      // Preserve existing avatar URL from database
      existingAvatarUrl = existingUser.avatar_url;
    }
  } catch (error) {
    // User doesn't exist yet, continue with phone validation
  }
  
  // Only update phone if we have a new phone from auth user and no existing phone
  if (!phoneValue && phone) {
    const trimmedPhone = phone.trim();
    if (trimmedPhone !== '') {
      // Validate phone number format before inserting
      const phoneValidation = validatePhoneNumber(trimmedPhone);
      if (!phoneValidation.isValid) {
        const msg = `Invalid phone number format: ${phoneValidation.error}`;
        // Error message
        return { error: msg };
      }
      phoneValue = phoneValidation.sanitizedValue || trimmedPhone;
    }
  }
  
  // Determine which avatar URL to use
  // Priority: existing uploaded avatar > user_metadata avatar > empty
  let finalAvatarUrl = '';
  if (existingAvatarUrl) {
    // If user has an existing avatar (uploaded or pixel art), keep it
    finalAvatarUrl = existingAvatarUrl;
  } else if (user_metadata?.avatar_url) {
    // Only use user_metadata avatar if no existing avatar in database
    finalAvatarUrl = user_metadata.avatar_url;
  }
  
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
        avatar_url: finalAvatarUrl,
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
    
    if (user?.user_metadata?.referral_code) {
      try {
        // Import the function dynamically to avoid circular dependencies
        const { processReferralCode } = await import('./auth');
        
        const result = await processReferralCode(user.user_metadata.referral_code);
        
        // Clear the referral code from metadata after processing
        await supabase.auth.updateUser({
          data: { referral_code: null }
        });
      } catch (referralError: any) {
        // Error processing referral code
        // Error stack
      }
    }
  } catch (upsertError) {
    // If upsert fails, try insert instead
    try {
      const { error } = await supabase.from('users').insert([
        {
          id,
          username,
          email,
          phone: phoneValue,
          name,
          avatar_url: finalAvatarUrl,
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
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const errorHandler = ErrorHandler.getInstance();
  const { showPopup, isChecking, locationStatus, checkLocationStatus, hidePopup, retryCheck } = useLocationCheck();

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = Date.now();
      
      try {
        // Stage 1: Initialize monitoring services
        setLoadingStage('initializing');
        initializeSentry();
        googleAnalytics.initialize();
        
        // Stage 2: Check authentication
        setLoadingStage('authenticating');
        const { user } = await getCurrentUser();
        setAuthenticated(!!user);
        
        if (user) {
          // Stage 3: Validate user profile
          setLoadingStage('validating_profile');
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
          
          // Stage 4: Update user profile
          setLoadingStage('setting_up_profile');
          const result = await upsertUserProfile(user);
          if (result && result.error) {
            // User profile upsert failed - handled silently
          }
        }
        
        // Stage 5: Finalizing
        setLoadingStage('finalizing');
        
        // Calculate minimum loading time (2.5 seconds for smooth UX)
        const elapsed = Date.now() - startTime;
        const minLoadingTime = 2500;
        const remainingTime = Math.max(0, minLoadingTime - elapsed);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
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
    
    initializeApp();
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
        }
        // Connection check completed silently
      } catch (error) {
        await errorHandler.handleError(error, {
          operation: 'supabase_connection_check',
          component: 'AuthGate',
        });
      }
    })();
  }, []);

  if (loading) {
    const getLoadingMessage = () => {
      switch (loadingStage) {
        case 'initializing':
          return 'Initializing GeoMart...';
        case 'authenticating':
          return 'Checking your account...';
        case 'validating_profile':
          return 'Validating your profile...';
        case 'setting_up_profile':
          return 'Setting up your GeoMart experience...';
        case 'finalizing':
          return 'Almost ready...';
        default:
          return 'Setting up your GeoMart experience...';
      }
    };

    return <AuthLoadingScreen message={getLoadingMessage()} />;
  }

  if (!authenticated) {
    return <AuthScreen />;
  }

  return (
    <ErrorBoundary componentName="AuthGate">
      <Slot />
      
      {/* Location Check Popup with System Prompt Button */}
      <LocationCheckPopup
        visible={showPopup && authenticated}
        onClose={hidePopup}
        onRetry={retryCheck}
        locationStatus={locationStatus}
        isChecking={isChecking}
      />
    </ErrorBoundary>
  );
}