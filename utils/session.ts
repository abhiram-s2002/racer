import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'user_session';

export interface SessionData {
  token: string;
  username: string;
  expiresAt: string; // ISO string
}

/**
 * Set the session data securely
 */
export async function setSession(session: SessionData) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

/**
 * Get the current session data
 */
export async function getSession(): Promise<SessionData | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear the session (logout)
 */
export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/**
 * Check if the session is valid (not expired)
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const now = new Date();
  const expires = new Date(session.expiresAt);
  return now < expires;
}

/**
 * Get the username from the current session
 */
export async function getSessionUsername(): Promise<string | null> {
  const session = await getSession();
  return session?.username || null;
}

/**
 * Example: Create a new session after login
 */
export async function createSession(token: string, username: string, durationHours = 168) {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
  await setSession({ token, username, expiresAt });
} 