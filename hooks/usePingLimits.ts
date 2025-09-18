/* global console */
import { useState, useEffect } from 'react';
import { checkPingLimit as checkLocalPingLimit, recordPing as recordLocalPing } from '@/utils/localPingLimits';
import { checkPingTimeLimit } from '@/utils/activitySupabase';

export interface PingLimitInfo {
  canPing: boolean;
  remainingPings: number;
  maxPingsPerDay: number;
  lastPingDate: string | null;
  nextResetTime: string | null;
  timeRemaining?: string;
  message: string;
  source: 'local' | 'database';
}

export function usePingLimits(username: string | null) {
  const [limitInfo, setLimitInfo] = useState<PingLimitInfo>({
    canPing: true,
    remainingPings: 3,
    maxPingsPerDay: 3,
    lastPingDate: null,
    nextResetTime: null,
    message: 'OK',
    source: 'local'
  });
  const [loading, setLoading] = useState(false);
  const [lastDatabaseCheck, setLastDatabaseCheck] = useState<number>(0);

  const checkPingLimit = async (listingId?: string, forceDatabaseCheck = false): Promise<PingLimitInfo> => {
    if (!username) {
      const defaultInfo = {
        canPing: true,
        remainingPings: 50,
        maxPingsPerDay: 50,
        lastPingDate: null,
        nextResetTime: null,
        message: 'OK',
        source: 'local' as const
      };
      setLimitInfo(defaultInfo);
      return defaultInfo;
    }

    setLoading(true);
    try {
      const localResult = await checkLocalPingLimit(username);
      let databaseResult = null;

      // Only check database when user actually tries to ping (forceDatabaseCheck = true)
      if (forceDatabaseCheck && listingId) {
        try {
          databaseResult = await checkPingTimeLimit(username, listingId);
          setLastDatabaseCheck(Date.now());
        } catch (error) {
          // console.error('Database ping check failed, using local:', error);
        }
      }

      // Use database result if available and more restrictive
      const finalResult = databaseResult && !databaseResult.canPing ? databaseResult : localResult;

      // Calculate next reset time (next day at midnight)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const updatedInfo = {
        canPing: finalResult.canPing,
        remainingPings: localResult.remainingPings,
        maxPingsPerDay: 5, // Local system uses 5
        lastPingDate: null,
        nextResetTime: tomorrow.toISOString(),
        timeRemaining: 'timeRemainingFormatted' in finalResult ? finalResult.timeRemainingFormatted : (typeof finalResult.timeRemaining === 'string' ? finalResult.timeRemaining : undefined),
        message: finalResult.message,
        source: databaseResult ? 'database' as const : 'local' as const
      };
      
      setLimitInfo(updatedInfo);
      return updatedInfo;

    } catch (error) {
      // console.error('Ping limit check error:', error);
      // Default to allowing ping if there's an error
      const errorInfo = {
        canPing: true,
        remainingPings: 50,
        maxPingsPerDay: 50,
        lastPingDate: null,
        nextResetTime: null,
        message: 'Unable to check limits',
        source: 'local' as const
      };
      setLimitInfo(errorInfo);
      return errorInfo;
    } finally {
      setLoading(false);
    }
  };

  const recordPing = async (listingId: string) => {
    if (!username) return;

    try {
      // Record locally immediately
      await recordLocalPing(username);
      
      // Force database check on next ping attempt
      setLastDatabaseCheck(0);
      
      // Refresh limits
      await checkPingLimit(listingId, true);
    } catch (error) {
      // console.error('Error recording ping:', error);
    }
  };

  const getPingLimitMessage = (): string => {
    if (!username) {
      return '';
    }

    if (limitInfo.remainingPings === 0) {
      return 'Daily limit reached';
    }

    if (limitInfo.remainingPings === 1) {
      return 'Last ping today';
    }

    return `${limitInfo.remainingPings} pings left`;
  };

  const getPingLimitColor = (): string => {
    if (limitInfo.remainingPings === 0) {
      return '#EF4444'; // Red
    }
    if (limitInfo.remainingPings === 1) {
      return '#F59E0B'; // Orange
    }
    return '#10B981'; // Green
  };

  // Check limits when username changes
  useEffect(() => {
    checkPingLimit();
  }, [username]);

  return {
    limitInfo,
    loading,
    checkPingLimit,
    recordPing,
    getPingLimitMessage,
    getPingLimitColor
  };
} 