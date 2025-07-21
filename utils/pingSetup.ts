import { supabase } from './supabaseClient';

// eslint-disable-next-line no-undef
declare const console: Console;

// Check if pings table exists
export async function checkPingsTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pings')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist
      return false;
    }
    
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking pings table:', error);
    return false;
  }
}

// Initialize ping system (only check pings table, use local storage for limits)
export async function initializePingSystem(): Promise<boolean> {
  try {
    // Check if pings table exists (this is still needed for storing ping records)
    const pingsTableExists = await checkPingsTableExists();
    
    if (!pingsTableExists) {
      // eslint-disable-next-line no-console
      console.log('Pings table does not exist. Please run the migration:');
      // eslint-disable-next-line no-console
      console.log('supabase/migrations/20250116_create_pings_table.sql');
      return false;
    }
    
    // Check if ping_analytics table exists (optional, for analytics)
    const { error: analyticsError } = await supabase
      .from('ping_analytics')
      .select('id')
      .limit(1);
    
    if (analyticsError && analyticsError.code === '42P01') {
      // eslint-disable-next-line no-console
      console.log('Ping analytics table does not exist. Analytics will be disabled.');
      // Don't return false - analytics is optional
    }
    
    // Note: ping_limits table is no longer needed - using local storage instead
    // eslint-disable-next-line no-console
    console.log('Ping system is properly initialized. Using local storage for ping limits.');
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error initializing ping system:', error);
    return false;
  }
}

// Get ping system status
export async function getPingSystemStatus(): Promise<{
  pingsTableExists: boolean;
  analyticsTableExists: boolean;
  limitsTableExists: boolean;
  isReady: boolean;
}> {
  const pingsTableExists = await checkPingsTableExists();
  
  let analyticsTableExists = false;
  
  if (pingsTableExists) {
    try {
      const { error: analyticsError } = await supabase
        .from('ping_analytics')
        .select('id')
        .limit(1);
      
      analyticsTableExists = !analyticsError || analyticsError.code !== '42P01';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error checking analytics table:', error);
    }
  }
  
  return {
    pingsTableExists,
    analyticsTableExists,
    limitsTableExists: true, // Always true since we use local storage
    isReady: pingsTableExists // Only need pings table, limits are local
  };
} 