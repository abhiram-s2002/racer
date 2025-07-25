import { supabase } from './supabaseClient';

// Sign up with email
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data?.user, error };
}

// Sign up with phone
export async function signUpWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ 
    phone, 
    password,
    options: {
      data: {
        phone: phone
      }
    }
  });
  return { user: data?.user, error };
}

// Sign in with email
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user, error };
}

// Sign in with phone
export async function signInWithPhone(phone: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  return { user: data?.user, error };
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Get current user
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
} 