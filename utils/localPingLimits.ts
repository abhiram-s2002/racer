/**
 * Local ping limits utility
 * Simple in-memory storage for ping limits
 */

interface PingRecord {
  username: string;
  count: number;
  date: string;
}

// In-memory storage for ping limits
const pingRecords = new Map<string, PingRecord>();

/**
 * Check if user can ping (local check)
 */
export async function checkPingLimit(username: string): Promise<{
  canPing: boolean;
  remainingPings: number;
  maxPingsPerDay: number;
  lastPingDate: string | null;
  timeRemaining?: number;
  timeRemainingFormatted?: string;
  lastPingTime?: string;
  message: string;
}> {
  const today = new Date().toDateString();
  const record = pingRecords.get(username);
  
  // If no record or different day, reset count
  if (!record || record.date !== today) {
    return {
      canPing: true,
      remainingPings: 10, // Default limit
      maxPingsPerDay: 10,
      lastPingDate: null,
      message: 'You can ping now'
    };
  }
  
  const remainingPings = Math.max(0, 10 - record.count);
  
  return {
    canPing: record.count < 10,
    remainingPings,
    maxPingsPerDay: 10,
    lastPingDate: record.date,
    message: record.count < 10 ? `You have ${remainingPings} pings remaining` : 'Daily ping limit reached'
  };
}

/**
 * Record a ping locally
 */
export async function recordPing(username: string): Promise<void> {
  const today = new Date().toDateString();
  const record = pingRecords.get(username);
  
  if (!record || record.date !== today) {
    // New day, start fresh
    pingRecords.set(username, {
      username,
      count: 1,
      date: today
    });
  } else {
    // Same day, increment count
    record.count += 1;
    pingRecords.set(username, record);
  }
}
