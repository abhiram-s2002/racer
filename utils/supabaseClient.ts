import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorHandler, ErrorContext } from './errorHandler';
import { SUPABASE_CONFIG, FEATURE_FLAGS } from './supabaseConfig';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Connection pooling configuration for different environments
const CONNECTION_POOL_CONFIG = {
  development: {
    maxConnections: 10,
    idleTimeout: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
    eventsPerSecond: 5,
  },
  staging: {
    maxConnections: 50,
    idleTimeout: 60000, // 1 minute
    connectionTimeout: 8000, // 8 seconds
    eventsPerSecond: 10,
  },
  production: {
    maxConnections: 200,
    idleTimeout: 120000, // 2 minutes
    connectionTimeout: 5000, // 5 seconds
    eventsPerSecond: 20,
  },
};

// Get current environment for connection pooling
const getCurrentEnvironment = () => {
  if (__DEV__) return 'development';
  // You can add more sophisticated environment detection here
  return 'production';
};

const currentEnv = getCurrentEnvironment();
const poolConfig = CONNECTION_POOL_CONFIG[currentEnv as keyof typeof CONNECTION_POOL_CONFIG];

// Create the main Supabase client with connection pooling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'racer-marketplace',
      'X-Environment': currentEnv,
    },
  },
  realtime: {
    params: {
      eventsPerSecond: poolConfig.eventsPerSecond,
    },
  },
});

// Connection pool manager for handling multiple connections
class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private activeConnections: Map<string, SupabaseClient> = new Map();
  private connectionCount = 0;
  private maxConnections = poolConfig.maxConnections;

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  // Get a connection from the pool
  getConnection(connectionId?: string): SupabaseClient {
    const id = connectionId || `conn_${Date.now()}_${Math.random()}`;
    
    if (this.activeConnections.has(id)) {
      const connection = this.activeConnections.get(id);
      if (connection) return connection;
    }

    if (this.connectionCount >= this.maxConnections) {
      // Reuse existing connection if pool is full
      const oldestConnection = this.activeConnections.values().next().value;
      if (oldestConnection) return oldestConnection;
    }

    // Create new connection
    const newConnection = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'X-Client-Info': 'racer-marketplace',
          'X-Connection-Id': id,
          'X-Environment': currentEnv,
        },
      },
      realtime: {
        params: {
          eventsPerSecond: poolConfig.eventsPerSecond,
        },
      },
    });

    this.activeConnections.set(id, newConnection);
    this.connectionCount++;

    // Clean up connection after idle timeout
    setTimeout(() => {
      this.releaseConnection(id);
    }, poolConfig.idleTimeout);

    return newConnection;
  }

  // Release a connection back to the pool
  releaseConnection(connectionId: string): void {
    if (this.activeConnections.has(connectionId)) {
      this.activeConnections.delete(connectionId);
      this.connectionCount--;
    }
  }

  // Get pool statistics
  getPoolStats() {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      availableConnections: this.maxConnections - this.connectionCount,
      utilizationRate: (this.connectionCount / this.maxConnections) * 100,
    };
  }

  // Clean up all connections
  cleanup(): void {
    this.activeConnections.clear();
    this.connectionCount = 0;
  }
}

// Enhanced Supabase client with connection pooling and error handling
export class EnhancedSupabaseClient {
  private static instance: EnhancedSupabaseClient;
  private poolManager: ConnectionPoolManager;

  constructor() {
    this.poolManager = ConnectionPoolManager.getInstance();
  }

  static getInstance(): EnhancedSupabaseClient {
    if (!EnhancedSupabaseClient.instance) {
      EnhancedSupabaseClient.instance = new EnhancedSupabaseClient();
    }
    return EnhancedSupabaseClient.instance;
  }

  // Get a connection from the pool
  private getConnection(): SupabaseClient {
    return this.poolManager.getConnection();
  }

  // Wrapper for database operations with connection pooling and error handling
  async safeQuery<T>(
    operation: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    const startTime = Date.now();
    const connection = this.getConnection();

    try {
      const result = await operation(connection);
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      if (FEATURE_FLAGS.performanceMonitoring && duration > 1000) {
        console.warn(`Slow query detected: ${context.operation} took ${duration}ms`);
      }
      
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
    operation: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    const connection = this.getConnection();

    try {
      const result = await operation(connection);
      
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

  // Wrapper for database mutations with connection pooling and error handling
  async safeMutation<T>(
    operation: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    const startTime = Date.now();
    const connection = this.getConnection();

    try {
      const result = await operation(connection);
      
      // Log performance metrics
      const duration = Date.now() - startTime;
      if (FEATURE_FLAGS.performanceMonitoring && duration > 2000) {
        console.warn(`Slow mutation detected: ${context.operation} took ${duration}ms`);
      }
      
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

  // Wrapper for RPC calls with connection pooling and error handling
  async safeRPC<T>(
    functionName: string,
    params: any,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    return this.safeQuery(
      async (client) => {
        const result = await client.rpc(functionName, params);
        return result;
      },
      { ...context, operation: `RPC: ${functionName}` },
      userId
    );
  }

  // Batch operations with connection pooling
  async batchOperations<T>(
    operations: Array<{
      operation: (client: SupabaseClient) => Promise<{ data: any; error: any }>;
      context: ErrorContext;
    }>,
    userId?: string
  ): Promise<Array<T | null>> {
    const connection = this.getConnection();
    const results: Array<T | null> = [];

    for (const { operation, context } of operations) {
      try {
        const result = await operation(connection);
        
        if (result.error) {
          await errorHandler.handleSilentError(result.error, context, userId);
          results.push(null);
        } else {
          results.push(result.data);
        }
      } catch (error) {
        await errorHandler.handleSilentError(error, context, userId);
        results.push(null);
      }
    }

    return results;
  }

  // Get connection pool statistics
  getPoolStats() {
    return this.poolManager.getPoolStats();
  }

  // Cleanup connections
  cleanup() {
    this.poolManager.cleanup();
  }
}

export const enhancedSupabase = EnhancedSupabaseClient.getInstance();

// Performance monitoring for connection pool
if (FEATURE_FLAGS.performanceMonitoring) {
  setInterval(() => {
    const stats = enhancedSupabase.getPoolStats();
    if (stats.utilizationRate > 80) {
      console.warn(`High connection pool utilization: ${stats.utilizationRate.toFixed(1)}%`);
    }
  }, 30000); // Check every 30 seconds
}

// Note: React Native doesn't have window events, so cleanup is handled differently
// The connection pool will automatically clean up idle connections 