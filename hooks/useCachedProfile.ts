import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { enhancedCache } from '@/utils/enhancedCacheManager';

interface ProfileData {
  name: string;
  username: string;
  email: string;
  phone: string;
  locationDisplay: string;
  bio: string;
  avatar: string;
  isAvailable: boolean;
  verification_status: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
}

interface NotificationSettings {
  newMessages: boolean;
  listingUpdates: boolean;
  marketingEmails: boolean;
}

interface UseCachedProfileReturn {
  profileData: ProfileData;
  notifications: NotificationSettings;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  invalidateCache: () => Promise<void>;
}

const CACHE_KEY = 'user_profile_data';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useCachedProfile(): UseCachedProfileReturn {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    username: '',
    email: '',
    phone: '',
    locationDisplay: '',
    bio: '',
    avatar: '',
    isAvailable: true,
    verification_status: 'not_verified',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newMessages: true,
    listingUpdates: true,
    marketingEmails: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile data from cache or database
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from cache first
      const cachedData = await enhancedCache.get<{
        profileData: ProfileData;
        notifications: NotificationSettings;
        timestamp: number;
      }>(CACHE_KEY);

      // Check if cache is still valid (within TTL)
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        setProfileData(cachedData.profileData);
        setNotifications(cachedData.notifications);
        setLoading(false);
        return;
      }

      // Cache miss or expired - fetch from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setError('Failed to fetch profile data');
        setLoading(false);
        return;
      }

      const newProfileData: ProfileData = {
        name: profile.name || '',
        username: profile.username || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
        locationDisplay: profile.location_display || '',
        bio: profile.bio || '',
        avatar: profile.avatar_url || '',
        isAvailable: profile.isAvailable !== undefined ? profile.isAvailable : true,
        verification_status: profile.verification_status || 'not_verified',
        verified_at: profile.verified_at,
        expires_at: profile.expires_at,
      };

      const newNotifications: NotificationSettings = {
        newMessages: profile.notification_new_messages !== false,
        listingUpdates: profile.notification_listing_updates !== false,
        marketingEmails: profile.notification_marketing_emails === true,
      };

      setProfileData(newProfileData);
      setNotifications(newNotifications);

      // Cache the data
      await enhancedCache.set(CACHE_KEY, {
        profileData: newProfileData,
        notifications: newNotifications,
        timestamp: Date.now(),
      }, CACHE_TTL);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh profile data (force fetch from database)
  const refreshProfile = useCallback(async () => {
    await invalidateCache();
    await loadProfileData();
  }, [loadProfileData]);

  // Update profile data locally and in database
  const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
    try {
      // Update local state immediately for better UX
      setProfileData(prev => ({ ...prev, ...updates }));

      // Update in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUpdates: any = {};
        
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.locationDisplay !== undefined) dbUpdates.location_display = updates.locationDisplay;
        if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
        if (updates.avatar !== undefined) dbUpdates.avatar_url = updates.avatar;
        if (updates.isAvailable !== undefined) dbUpdates.isAvailable = updates.isAvailable;
        
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('id', user.id);

        if (error) {
          // Revert local state on error
          setProfileData(prev => ({ ...prev, ...updates }));
          throw error;
        }

        // Invalidate cache to ensure fresh data on next load
        await invalidateCache();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, []);

  // Update notification settings
  const updateNotifications = useCallback(async (updates: Partial<NotificationSettings>) => {
    try {
      // Update local state immediately
      setNotifications(prev => ({ ...prev, ...updates }));

      // Update in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUpdates: any = {};
        
        if (updates.newMessages !== undefined) dbUpdates.notification_new_messages = updates.newMessages;
        if (updates.listingUpdates !== undefined) dbUpdates.notification_listing_updates = updates.listingUpdates;
        if (updates.marketingEmails !== undefined) dbUpdates.notification_marketing_emails = updates.marketingEmails;
        
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('users')
          .update(dbUpdates)
          .eq('id', user.id);

        if (error) {
          // Revert local state on error
          setNotifications(prev => ({ ...prev, ...updates }));
          throw error;
        }

        // Invalidate cache
        await invalidateCache();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications');
    }
  }, []);

  // Invalidate cache
  const invalidateCache = useCallback(async () => {
    await enhancedCache.delete(CACHE_KEY);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  return {
    profileData,
    notifications,
    loading,
    error,
    refreshProfile,
    updateProfile,
    updateNotifications,
    invalidateCache,
  };
}
