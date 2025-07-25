import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

import { User, AuthState } from '@/utils/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setError(authError.message);
          return;
        }

        if (!authUser) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Get user profile from users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          setError(profileError.message);
          return;
        }

        if (mounted) {
          setUser({
            id: authUser.id,
            username: profile?.username || authUser.user_metadata?.username || '',
            email: authUser.email || '',
            name: profile?.name || authUser.user_metadata?.name || '',
            avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url,
            isAvailable: profile?.isAvailable ?? true,
            created_at: profile?.created_at || new Date().toISOString(),
            updated_at: profile?.updated_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        if (mounted) {
          setError('Failed to fetch user data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUser();
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
    }
  };

  return {
    user,
    loading,
    error,
    signOut,
    isAuthenticated: !!user,
  };
} 