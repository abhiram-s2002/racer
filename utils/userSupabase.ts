import { supabase } from '@/utils/supabaseClient';

// Create a new user
export async function createUser({ id, username, email, name, avatar_url }: { id: string; username: string; email: string; name: string; avatar_url?: string }) {
  const { data, error } = await supabase.from('users').insert([
    { id, username, email, name, avatar_url }
  ]);
  return { data, error };
}

// Get user by id
export async function getUserById(id: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  return { data, error };
}

// Get user by username
export async function getUserByUsername(username: string) {
  const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
  return { data, error };
}

// Update user by id
export async function updateUser(id: string, updates: Partial<{ username: string; email: string; name: string; avatar_url: string }>) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
  return { data, error };
}

// Delete user by id
export async function deleteUser(id: string) {
  const { data, error } = await supabase.from('users').delete().eq('id', id);
  return { data, error };
} 