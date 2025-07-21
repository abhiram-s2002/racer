import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler, ErrorContext } from './errorHandler';
import { SUPABASE_CONFIG } from './supabaseConfig';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Enhanced Supabase client with error handling
export class EnhancedSupabaseClient {
  private static instance: EnhancedSupabaseClient;

  static getInstance(): EnhancedSupabaseClient {
    if (!EnhancedSupabaseClient.instance) {
      EnhancedSupabaseClient.instance = new EnhancedSupabaseClient();
    }
    return EnhancedSupabaseClient.instance;
  }

  // Wrapper for database operations with error handling
  async safeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      
      if (result.error) {
        await errorHandler.handleError(result.error, context, true, userId);
        return null;
      }
      
      return result.data;
    } catch (error) {
      await errorHandler.handleError(error, context, true, userId);
      return null;
    }
  }

  // Wrapper for database operations with silent error handling
  async safeQuerySilent<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      
      if (result.error) {
        await errorHandler.handleSilentError(result.error, context, userId);
        return null;
      }
      
      return result.data;
    } catch (error) {
      await errorHandler.handleSilentError(error, context, userId);
      return null;
    }
  }

  // Wrapper for database mutations with error handling
  async safeMutation<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      
      if (result.error) {
        await errorHandler.handleError(result.error, context, true, userId);
        return null;
      }
      
      return result.data;
    } catch (error) {
      await errorHandler.handleError(error, context, true, userId);
      return null;
    }
  }

  // Wrapper for RPC calls with error handling
  async safeRPC<T>(
    functionName: string,
    params: any,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    return this.safeQuery(
      async () => {
        const result = await supabase.rpc(functionName, params);
        return result;
      },
      { ...context, operation: `RPC: ${functionName}` },
      userId
    );
  }
}

export const enhancedSupabase = EnhancedSupabaseClient.getInstance(); 