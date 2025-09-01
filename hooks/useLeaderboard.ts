import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

export interface LeaderboardUser {
  username: string;
  total_omni_earned: number;
  rank: number;
  last_updated?: string;
}

export interface LeaderboardData {
  topUsers: LeaderboardUser[];
  currentUserRank: LeaderboardUser | null;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
}

export const useLeaderboard = (currentUsername: string) => {
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    if (!currentUsername) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch top 20 users
      const { data: topUsersData, error: topUsersError } = await supabase
        .from('leaderboard_cache')
        .select('username, total_omni_earned, rank, last_updated')
        .order('rank', { ascending: true })
        .limit(20);

      if (topUsersError) throw topUsersError;

      // Fetch current user's rank
      const { data: currentUserData, error: currentUserError } = await supabase
        .from('leaderboard_cache')
        .select('username, total_omni_earned, rank, last_updated')
        .eq('username', currentUsername)
        .single();

      if (currentUserError && currentUserError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is okay
        throw currentUserError;
      }

      // Get last updated timestamp
      const { data: timestampData, error: timestampError } = await supabase
        .from('leaderboard_cache')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1);

      if (timestampError) throw timestampError;

      setTopUsers(topUsersData || []);
      setCurrentUserRank(currentUserData);
      setLastUpdated(timestampData?.[0]?.last_updated || null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUsername]);

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'Never updated';
    
    const now = new Date();
    const updated = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Updated just now';
    if (diffHours < 24) return `Updated ${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Updated ${diffDays} days ago`;
  };

  return {
    topUsers,
    currentUserRank,
    lastUpdated: formatLastUpdated(lastUpdated),
    loading,
    error,
    refreshLeaderboard: fetchLeaderboard
  };
};
