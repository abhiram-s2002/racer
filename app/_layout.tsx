/* global console */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { getCurrentUser } from '@/utils/auth';
import AuthScreen from './auth';
import { Slot, useRouter, usePathname } from 'expo-router';
import { supabase } from '@/utils/supabaseClient';

function validateUserProfileFields({ id, username, email, name }: { id: string; username: string; email: string; name: string }) {
  const missing = [];
  if (!id) missing.push('id');
  if (!username) missing.push('username');
  if (!email) missing.push('email');
  if (!name) missing.push('name');
  return missing;
}

export async function upsertUserProfile(authUser: any) {
  if (!authUser) return;
  const { id, email, user_metadata } = authUser;
  const name = user_metadata?.full_name || user_metadata?.name || '';
  const avatar_url = user_metadata?.avatar_url || '';
  const username = user_metadata?.username || '';
  const missingFields = validateUserProfileFields({ id, username, email, name });
  if (missingFields.length > 0) {
    const msg = `Cannot upsert user profile. Missing required fields: ${missingFields.join(', ')}`;
    console.error(msg);
    Alert.alert('Profile Error', msg);
    return { error: msg };
  }
  console.log('Upserting user profile with:', { id, username, email, name, avatar_url });
  // Try to upsert with username conflict resolution
  try {
    const { error } = await supabase.from('users').upsert([
      {
        id,
        username,
        email,
        name,
        avatar_url,
        created_at: new Date().toISOString(),
      }
    ], { onConflict: 'username' });
    
    if (error) {
      console.error('Supabase upsert error:', error);
      Alert.alert('Profile Error', error.message || 'Failed to save profile.');
      return { error };
    }
  } catch (upsertError) {
    // If upsert fails, try insert instead
    console.log('Upsert failed, trying insert:', upsertError);
    const { error } = await supabase.from('users').insert([
      {
        id,
        username,
        email,
        name,
        avatar_url,
        created_at: new Date().toISOString(),
      }
    ]);
    
    if (error) {
      console.error('Supabase insert error:', error);
      Alert.alert('Profile Error', error.message || 'Failed to save profile.');
      return { error };
    }
  }
  return { success: true };
}

export default function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      console.log('AuthGate: current user:', user);
      setAuthenticated(!!user);
      setLoading(false);
      if (user) {
        const username = user.user_metadata?.username;
        const name = user.user_metadata?.full_name || user.user_metadata?.name;
        if (!username || !name) {
          // Prevent redirect loop
          if (pathname !== '/ProfileSetup') {
            router.replace('/ProfileSetup');
          }
          return;
        }
        const result = await upsertUserProfile(user);
        if (result && result.error) {
          console.log('User profile upsert failed:', result.error);
        }
      }
    };
    checkAuth();
  }, [pathname]);

  useEffect(() => {
    // Quick Supabase backend connection check
    (async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error) {
          console.error('Supabase connection error:', error);
          Alert.alert('Supabase Error', 'Failed to connect to Supabase backend. Please check your credentials and network.');
        } else {
          console.log('Supabase connection successful:', data);
        }
      } catch (err) {
        console.error('Unexpected Supabase connection error:', err);
        Alert.alert('Supabase Error', 'Unexpected error while connecting to Supabase.');
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

  return <Slot />;
}