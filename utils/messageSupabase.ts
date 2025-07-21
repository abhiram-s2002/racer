import { supabase } from './supabaseClient';

export interface Chat {
  id: string;
  listing_id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  last_message?: string;
  last_sender?: string;
  updated_at: string;
  pingContext?: {
    id: string;
    listing_id: string;
    sender_username: string;
    receiver_username: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    responded_at?: string;
    response_message?: string;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_username: string;
  text: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

// Get all chats for a user (as participant_a or participant_b)
export async function getChatsForUser(username: string, page = 1, pageSize = 20): Promise<Chat[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .or(`participant_a.eq.${username},participant_b.eq.${username}`)
    .order('updated_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data as Chat[];
}

// Create a new chat
export async function createChat({ listing_id, participant_a, participant_b }: { listing_id: string; participant_a: string; participant_b: string; }): Promise<Chat> {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ listing_id, participant_a, participant_b }])
    .select()
    .single();
  if (error) throw error;
  return data as Chat;
}

// Update last message and sender in a chat
export async function updateChatLastMessage(chatId: string, lastMessage: string, lastSender: string): Promise<void> {
  const { error } = await supabase
    .from('chats')
    .update({ last_message: lastMessage, last_sender: lastSender, updated_at: new Date().toISOString() })
    .eq('id', chatId);
  if (error) throw error;
}

// Get all messages for a chat
export async function getMessagesForChat(chatId: string, page = 1, pageSize = 30): Promise<Message[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .range(from, to);
  if (error) throw error;
  // Map sender_id to sender_username if needed (for backward compatibility)
  return (data as any[]).map(msg => ({
    ...msg,
    sender_username: msg.sender_username || msg.sender_id || '',
  })) as Message[];
}

// Send a new message
export async function sendMessage({ chat_id, sender_username, text }: { chat_id: string; sender_username: string; text: string; }): Promise<Message> {
  // 1. Fetch user profile from users table
  const { data: user } = await supabase
    .from('users')
    .select('username, name, avatar_url')
    .eq('username', sender_username)
    .single();
  let name = 'Unknown User';
  let avatar_url = null;
  if (user) {
    name = user.name || 'Unknown User';
    avatar_url = user.avatar_url || null;
  }
  // 2. Upsert user profile into users table (optional, for consistency)
  await supabase
    .from('users')
    .upsert([
      {
        username: sender_username,
        name,
        avatar_url,
      },
    ]);
  // 3. Insert the message
  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id, sender_username, text }])
    .select()
    .single();
  if (error) throw error;
  return data as Message;
}

// Update message status
export async function updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ status })
    .eq('id', messageId);
  if (error) throw error;
}

// Mark all messages in a chat as read for a user
export async function markMessagesAsRead(chatId: string, username: string): Promise<void> {
  // Update all messages in the chat where the receiver is the current user and status is not 'read'
  const { error } = await supabase
    .from('messages')
    .update({ status: 'read' })
    .eq('chat_id', chatId)
    .neq('sender_username', username)
    .neq('status', 'read');
  if (error) throw error;
}

// Get unread message count for a chat for a user
export async function getUnreadCountForChat(chatId: string, username: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .neq('sender_username', username)
    .neq('status', 'read');
  if (error) throw error;
  return count || 0;
} 