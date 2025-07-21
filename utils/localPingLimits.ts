import AsyncStorage from '@react-native-async-storage/async-storage';

// eslint-disable-next-line no-undef
declare const console: Console;

export interface PingLimit {
  dailyPingsSent: number;
  dailyPingsLimit: number;
  lastResetDate: string;
  lastPingTime: string | null;
}

export interface PingLimitResult {
  canPing: boolean;
  remainingPings: number;
  timeRemaining?: string;
  message: string;
}

const PING_LIMIT_KEY = 'ping_limits';
const DAILY_LIMIT = 5; // 5 pings per day

// Get ping limits for a user
export const getPingLimits = async (username: string): Promise<PingLimit> => {
  try {
    const stored = await AsyncStorage.getItem(`${PING_LIMIT_KEY}_${username}`);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Create default limits if none exist
    const defaultLimits: PingLimit = {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      lastResetDate: new Date().toDateString(),
      lastPingTime: null
    };
    
    await storePingLimits(username, defaultLimits);
    return defaultLimits;
  } catch (error) {
    console.error('Error getting ping limits:', error);
    return {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      lastResetDate: new Date().toDateString(),
      lastPingTime: null
    };
  }
};

// Store ping limits for a user
export const storePingLimits = async (username: string, limits: PingLimit): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${PING_LIMIT_KEY}_${username}`, JSON.stringify(limits));
  } catch (error) {
    console.error('Error storing ping limits:', error);
  }
};

// Check if user can ping (daily limits + cooldown)
export const checkPingLimit = async (username: string): Promise<PingLimitResult> => {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    const today = now.toDateString();
    
    // Reset daily count if it's a new day
    if (limits.lastResetDate !== today) {
      limits.dailyPingsSent = 0;
      limits.lastResetDate = today;
      await storePingLimits(username, limits);
    }
    
    // Check daily limit
    if (limits.dailyPingsSent >= limits.dailyPingsLimit) {
      return {
        canPing: false,
        remainingPings: 0,
        message: 'Daily ping limit reached. Please try again tomorrow.'
      };
    }
    

    
    return {
      canPing: true,
      remainingPings: limits.dailyPingsLimit - limits.dailyPingsSent,
      message: 'OK'
    };
  } catch (error) {
    console.error('Error checking ping limit:', error);
    return {
      canPing: true,
      remainingPings: DAILY_LIMIT,
      message: 'OK'
    };
  }
};

// Record a ping (increment count)
export const recordPing = async (username: string): Promise<void> => {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    
    // Increment daily ping count
    limits.dailyPingsSent += 1;
    limits.lastPingTime = now.toISOString();
    
    await storePingLimits(username, limits);
  } catch (error) {
    console.error('Error recording ping:', error);
  }
};

// Reset ping limits (for testing or admin purposes)
export const resetPingLimits = async (username: string): Promise<void> => {
  try {
    const limits: PingLimit = {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      lastResetDate: new Date().toDateString(),
      lastPingTime: null
    };
    
    await storePingLimits(username, limits);
  } catch (error) {
    console.error('Error resetting ping limits:', error);
  }
};

// Get ping statistics for a user
export const getPingStats = async (username: string): Promise<{
  dailyPingsSent: number;
  dailyPingsLimit: number;
  remainingPings: number;
}> => {
  try {
    const limits = await getPingLimits(username);
    const now = new Date();
    
    // Reset daily count if it's a new day
    if (limits.lastResetDate !== now.toDateString()) {
      limits.dailyPingsSent = 0;
      limits.lastResetDate = now.toDateString();
      await storePingLimits(username, limits);
    }
    
    return {
      dailyPingsSent: limits.dailyPingsSent,
      dailyPingsLimit: limits.dailyPingsLimit,
      remainingPings: limits.dailyPingsLimit - limits.dailyPingsSent
    };
  } catch (error) {
    console.error('Error getting ping stats:', error);
    return {
      dailyPingsSent: 0,
      dailyPingsLimit: DAILY_LIMIT,
      remainingPings: DAILY_LIMIT
    };
  }
};

// Clear all ping limits (for logout or cleanup)
export const clearPingLimits = async (username: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${PING_LIMIT_KEY}_${username}`);
  } catch (error) {
    console.error('Error clearing ping limits:', error);
  }
}; 