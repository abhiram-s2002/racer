/**
 * Local Ping Limits Management
 * Handles ping limits using AsyncStorage for offline functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PingLimitResult {
  canPing: boolean;
  remainingPings: number;
  dailyPingsLimit: number;
  dailyPingsSent: number;
  message: string;
  timeRemaining?: string;
  timeRemainingFormatted?: string;
}

export interface PingStats {
  dailyPingsSent: number;
  dailyPingsLimit: number;
  remainingPings: number;
  lastPingDate: string | null;
}

const PING_LIMIT_KEY = 'ping_limits';
const DAILY_LIMIT = 5; // 5 pings per day
const PING_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between pings

/**
 * Get ping limits for a user from local storage
 */
export async function checkPingLimit(username: string): Promise<PingLimitResult> {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    const today = now.toDateString();
    
    // Reset daily count if it's a new day
    if (limits.lastPingDate !== today) {
      limits.dailyPingsSent = 0;
      limits.lastPingDate = today;
      await savePingLimits(username, limits);
    }

    const canPing = limits.dailyPingsSent < limits.dailyPingsLimit;
    const remainingPings = Math.max(0, limits.dailyPingsLimit - limits.dailyPingsSent);

    return {
      canPing,
      remainingPings,
      dailyPingsLimit: limits.dailyPingsLimit,
      dailyPingsSent: limits.dailyPingsSent,
      message: canPing ? 'OK' : 'Daily ping limit reached',
      timeRemaining: canPing ? undefined : '24 hours',
      timeRemainingFormatted: canPing ? undefined : '24 hours'
    };
  } catch (error) {
    console.error('Error checking ping limit:', error);
    return {
      canPing: true,
      remainingPings: DAILY_LIMIT,
      dailyPingsLimit: DAILY_LIMIT,
      dailyPingsSent: 0,
      message: 'OK'
    };
  }
}

/**
 * Record a ping for a user in local storage
 */
export async function recordPing(username: string): Promise<void> {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    const today = now.toDateString();
    
    // Reset daily count if it's a new day
    if (limits.lastPingDate !== today) {
      limits.dailyPingsSent = 0;
      limits.lastPingDate = today;
    }

    limits.dailyPingsSent++;
    await savePingLimits(username, limits);
  } catch (error) {
    console.error('Error recording ping:', error);
  }
}

/**
 * Get ping statistics for a user
 */
export async function getPingStats(username: string): Promise<PingStats> {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    const today = now.toDateString();
    
    // Reset daily count if it's a new day
    if (limits.lastPingDate !== today) {
      limits.dailyPingsSent = 0;
      limits.lastPingDate = today;
      await savePingLimits(username, limits);
    }

    return {
      dailyPingsSent: limits.dailyPingsSent,
      dailyPingsLimit: limits.dailyPingsLimit,
      remainingPings: Math.max(0, limits.dailyPingsLimit - limits.dailyPingsSent),
      lastPingDate: limits.lastPingDate
    };
  } catch (error) {
    console.error('Error getting ping stats:', error);
    return {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      remainingPings: DAILY_LIMIT,
      lastPingDate: null
    };
  }
}

/**
 * Get ping limits from AsyncStorage
 */
async function getPingLimits(username: string): Promise<PingStats> {
  try {
    const key = `${PING_LIMIT_KEY}_${username}`;
    const stored = await AsyncStorage.getItem(key);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        dailyPingsSent: parsed.dailyPingsSent || 0,
        dailyPingsLimit: parsed.dailyPingsLimit || DAILY_LIMIT,
        remainingPings: parsed.remainingPings || DAILY_LIMIT,
        lastPingDate: parsed.lastPingDate || null
      };
    }
    
    return {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      remainingPings: DAILY_LIMIT,
      lastPingDate: null
    };
  } catch (error) {
    console.error('Error getting ping limits from storage:', error);
    return {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      remainingPings: DAILY_LIMIT,
      lastPingDate: null
    };
  }
}

/**
 * Save ping limits to AsyncStorage
 */
async function savePingLimits(username: string, limits: PingStats): Promise<void> {
  try {
    const key = `${PING_LIMIT_KEY}_${username}`;
    await AsyncStorage.setItem(key, JSON.stringify(limits));
  } catch (error) {
    console.error('Error saving ping limits to storage:', error);
  }
}

/**
 * Reset ping limits for a user
 */
export async function resetPingLimits(username: string): Promise<void> {
  try {
    const key = `${PING_LIMIT_KEY}_${username}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error resetting ping limits:', error);
  }
}

/**
 * Get all ping limits (for debugging)
 */
export async function getAllPingLimits(): Promise<Record<string, PingStats>> {
  try {
    const allLimits: Record<string, PingStats> = {};
    const keys = await AsyncStorage.getAllKeys();
    
    if (keys) {
      for (const key of keys) {
        if (key && key.startsWith(PING_LIMIT_KEY)) {
          const username = key.replace(`${PING_LIMIT_KEY}_`, '');
          const limits = await getPingLimits(username);
          allLimits[username] = limits;
        }
      }
    }
    
    return allLimits;
  } catch (error) {
    console.error('Error getting all ping limits:', error);
    return {};
  }
}
