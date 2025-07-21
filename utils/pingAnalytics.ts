/* global console */
import { recordPing as recordLocalPing, getPingStats } from './localPingLimits';

export interface PingInsights {
  total_pings_sent: number;
  total_pings_received: number;
  accepted_pings: number;
  rejected_pings: number;
  acceptance_rate: number;
  average_response_time_minutes: number;
  daily_pings_sent: number;
  daily_pings_limit: number;
  remaining_pings: number;
}





// Record a ping using local storage
export async function recordPing(username: string): Promise<void> {
  try {
    await recordLocalPing(username);
    console.log('Ping recorded locally for user:', username);
  } catch (error) {
    console.error('Error recording ping locally:', error);
  }
}

// Get ping insights for a user using local storage
export async function getPingInsights(username: string): Promise<PingInsights | null> {
  try {
    // Get local ping stats
    const localStats = await getPingStats(username);
    
    // For now, return basic insights from local storage
    // In the future, you could combine this with database ping history
    const insights: PingInsights = {
      total_pings_sent: localStats.dailyPingsSent, // Daily count for now
      total_pings_received: 0, // Would need database for this
      accepted_pings: 0, // Would need database for this
      rejected_pings: 0, // Would need database for this
      acceptance_rate: 0, // Would need database for this
      average_response_time_minutes: 0, // Would need database for this
      daily_pings_sent: localStats.dailyPingsSent,
      daily_pings_limit: localStats.dailyPingsLimit,
      remaining_pings: localStats.remainingPings
    };
    
    return insights;
  } catch (error) {
    console.error('Error getting ping insights:', error);
    return null;
  }
}

// Format response time for display
export function formatResponseTime(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 minute';
  } else if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  } else if (minutes < 1440) { // 24 hours
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.round(minutes / 1440);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}

// Format cooldown time for display
export function formatCooldownTime(cooldownUntil: string): string {
  const now = new Date();
  const cooldown = new Date(cooldownUntil);
  const diffMs = cooldown.getTime() - now.getTime();
  const diffSeconds = Math.ceil(diffMs / 1000);
  
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.ceil(diffSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (diffSeconds < 86400) {
    const hours = Math.ceil(diffSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.ceil(diffSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}

// Get ping status color with response time context
export function getPingStatusColorWithContext(status: string, responseTimeMinutes?: number): string {
  switch (status) {
    case 'pending':
      if (responseTimeMinutes && responseTimeMinutes > 60) {
        return '#F59E0B'; // Orange for slow response
      }
      return '#3B82F6'; // Blue for normal pending
    case 'accepted':
      return '#22C55E';
    case 'rejected':
      return '#EF4444';
    default:
      return '#64748B';
  }
}

// Get ping status description with context
export function getPingStatusDescription(status: string, responseTimeMinutes?: number): string {
  switch (status) {
    case 'pending':
      if (responseTimeMinutes && responseTimeMinutes > 60) {
        return 'Pending (Slow response)';
      }
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

// Calculate ping success rate
export function calculateSuccessRate(accepted: number, rejected: number): number {
  const total = accepted + rejected;
  if (total === 0) return 0;
  return Math.round((accepted / total) * 100);
}

// Get ping performance rating
export function getPerformanceRating(acceptanceRate: number, avgResponseTime: number): string {
  if (acceptanceRate >= 80 && avgResponseTime <= 30) {
    return 'Excellent';
  } else if (acceptanceRate >= 60 && avgResponseTime <= 60) {
    return 'Good';
  } else if (acceptanceRate >= 40 && avgResponseTime <= 120) {
    return 'Fair';
  } else {
    return 'Needs Improvement';
  }
}

// Get performance color
export function getPerformanceColor(rating: string): string {
  switch (rating) {
    case 'Excellent':
      return '#22C55E';
    case 'Good':
      return '#3B82F6';
    case 'Fair':
      return '#F59E0B';
    case 'Needs Improvement':
      return '#EF4444';
    default:
      return '#64748B';
  }
} 