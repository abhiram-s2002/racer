/* global console */
import { supabase } from './supabaseClient';

export type ActivityType = 'listing' | 'received_ping' | 'sent_ping';
export type PingStatus = 'pending' | 'accepted' | 'rejected';

export interface Activity {
  id: string;
  type: ActivityType;
  listing_id?: string;
  title?: string;
  price?: string;
  image?: string;
  is_active?: boolean;
  username: string;
  user_name?: string;
  user_avatar?: string;
  status?: PingStatus;
  message?: string;
  created_at: string;
}

// New interface for the dedicated pings table
export interface Ping {
  id: string;
  listing_id: string;
  sender_username: string;
  receiver_username: string;
  message: string;
  status: PingStatus;
  created_at: string;
  responded_at?: string;
  response_message?: string;
  listing?: {
    title: string;
    price: number;
    images: string[];
    username: string;
  };
}

// Interface for ping limits
export interface PingLimit {
  id: string;
  username: string;
  listing_id: string;
  ping_count: number;
  last_ping_at: string;
  created_at: string;
}

// Fetch all activities for a user
export async function getActivities(userId: string, page = 1, pageSize = 20): Promise<Activity[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('username', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data as Activity[];
}

// Add a new ping activity
export async function addPingActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert([activity])
    .select()
    .single();
  if (error) throw error;
  return data as Activity;
}

// Update ping status
export async function updatePingStatus(pingId: string, status: PingStatus): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update({ status })
    .eq('id', pingId)
    .select()
    .single();
  if (error) throw error;
  return data as Activity;
}

// Delete an activity
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ===== NEW PING FUNCTIONS =====

// Create a new ping using the time-based system
export async function createPing(ping: Omit<Ping, 'id' | 'created_at'>): Promise<Ping> {
  console.log('Creating ping with time-based validation:', ping);

  // Use the new time-based ping creation function
  const { data, error } = await supabase
    .rpc('create_ping_with_limits', {
      listing_id_param: ping.listing_id,
      sender_username_param: ping.sender_username,
      receiver_username_param: ping.receiver_username,
      message_param: ping.message
    });

  if (error) {
    console.error('Error creating ping:', error);
    throw error;
  }

  const result = data?.[0] as any; // Get first row from the result array
  
  // Check if the ping was blocked due to time limit
  if (!result?.success) {
    if (result.error === 'time_limit') {
      const timeRemaining = Math.ceil(result.time_remaining_minutes);
      const hours = Math.floor(timeRemaining / 60);
      const minutes = timeRemaining % 60;
      
      let timeMessage = '';
      if (hours > 0) {
        timeMessage = `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        timeMessage = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      }
      
      throw new Error(`You can ping again in ${timeMessage}. Please wait before sending another ping.`);
    } else {
      throw new Error(result.message || 'Failed to create ping');
    }
  }

  console.log('Ping created successfully:', result);

  // Return the created ping data
  return {
    id: result.ping_id,
    listing_id: ping.listing_id,
    sender_username: ping.sender_username,
    receiver_username: ping.receiver_username,
    message: ping.message,
    status: 'pending',
    created_at: result.created_at
  } as Ping;
}

// Get pings sent by a user
export async function getSentPings(username: string): Promise<Ping[]> {
  const { data, error } = await supabase
    .from('pings')
    .select(`
      *,
      listings!inner(title, price, images, username)
    `)
    .eq('sender_username', username)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Ping[];
}

// Get pings received by a user
export async function getReceivedPings(username: string): Promise<Ping[]> {
  const { data, error } = await supabase
    .from('pings')
    .select(`
      *,
      listings!inner(title, price, images, username)
    `)
    .eq('receiver_username', username)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Ping[];
}

// Update ping status in the new pings table
export async function updatePingStatusNew(pingId: string, status: PingStatus, responseMessage?: string): Promise<Ping> {
  const updateData: any = { status };
  if (responseMessage) {
    updateData.response_message = responseMessage;
  }

  const { data, error } = await supabase
    .from('pings')
    .update(updateData)
    .eq('id', pingId)
    .select()
    .single();

  if (error) throw error;
  return data as Ping;
}

// Get ping by ID
export async function getPingById(pingId: string): Promise<Ping | null> {
  const { data, error } = await supabase
    .from('pings')
    .select('*')
    .eq('id', pingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  return data as Ping;
}

// Check if user can ping a listing
export async function canPingListing(username: string, listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('check_ping_limit', {
      username_param: username
    });

  if (error) throw error;
  return data?.[0]?.can_send || false;
}

// Get ping statistics for a user
export async function getPingStats(username: string): Promise<{
  sent: number;
  received: number;
  pending: number;
  accepted: number;
  rejected: number;
}> {
  const { data, error } = await supabase
    .from('pings')
    .select('sender_username, receiver_username, status')
    .or(`sender_username.eq.${username},receiver_username.eq.${username}`);

  if (error) throw error;

  const stats = {
    sent: 0,
    received: 0,
    pending: 0,
    accepted: 0,
    rejected: 0
  };

  data?.forEach(ping => {
    if (ping.sender_username === username) {
      stats.sent++;
      if (ping.status === 'pending') stats.pending++;
      else if (ping.status === 'accepted') stats.accepted++;
      else if (ping.status === 'rejected') stats.rejected++;
    } else {
      stats.received++;
    }
  });

  return stats;
} 

// Check if user can ping a listing based on time limits
export async function checkPingTimeLimit(username: string, listingId: string): Promise<{
  canPing: boolean;
  timeRemaining?: number; // in minutes
  timeRemainingFormatted?: string;
  lastPingTime?: string;
  message: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('check_ping_time_limit', {
        username_param: username,
        listing_id_param: listingId
      });

    if (error) {
      console.error('Error checking ping time limit:', error);
      // Default to allowing ping if there's an error
      return {
        canPing: true,
        message: 'Unable to check ping limits'
      };
    }

    const result = data?.[0] as any; // Get first row from the result array
    const canPing = result?.can_ping as boolean;
    const timeRemaining = result?.time_remaining as string; // interval type comes as string

    // Convert interval to minutes and format for display
    let timeRemainingMinutes = 0;
    let timeRemainingFormatted = '';
    
    if (timeRemaining && timeRemaining !== '00:00:00') {
      // Parse interval string like "00:05:30" to minutes
      const parts = timeRemaining.split(':');
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      
      timeRemainingMinutes = hours * 60 + minutes + Math.ceil(seconds / 60);
      
      if (hours > 0) {
        timeRemainingFormatted = `${hours}h ${minutes}m`;
      } else {
        timeRemainingFormatted = `${minutes}m`;
      }
    }

    return {
      canPing,
      timeRemaining: timeRemainingMinutes,
      timeRemainingFormatted,
      lastPingTime: result?.last_ping_time,
      message: result?.message || 'OK'
    };
  } catch (error) {
    console.error('Error in checkPingTimeLimit:', error);
    return {
      canPing: true,
      message: 'Unable to check ping limits'
    };
  }
} 

// Check if user already has a pending ping to a listing
export const checkExistingPing = async (listingId: string, senderUsername: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('pings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('sender_username', senderUsername)
      .eq('status', 'pending')
      .limit(1);

    if (error) {
      console.error('Error checking existing ping:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking existing ping:', error);
    return false;
  }
}; 

// Create chat from ping
export const createChatFromPing = async (pingId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('create_chat_from_ping', {
      ping_id: pingId
    });

    if (error) {
      console.error('Error creating chat from ping:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating chat from ping:', error);
    return null;
  }
}; 