/**
 * Connection Pool Utilities
 * Helper functions for managing and monitoring connection pooling
 */

import { enhancedSupabase } from './supabaseClient';
import { ErrorContext } from './errorHandler';

// Connection pool monitoring
export class ConnectionPoolMonitor {
  private static instance: ConnectionPoolMonitor;
  private monitoringInterval: any = null;
  private isMonitoring = false;

  static getInstance(): ConnectionPoolMonitor {
    if (!ConnectionPoolMonitor.instance) {
      ConnectionPoolMonitor.instance = new ConnectionPoolMonitor();
    }
    return ConnectionPoolMonitor.instance;
  }

  // Start monitoring connection pool
  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) {
      console.warn('Connection pool monitoring is already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      const stats = enhancedSupabase.getPoolStats();
      this.logPoolStats(stats);
    }, intervalMs);

    // Connection pool monitoring started
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    // Connection pool monitoring stopped
  }

  // Log pool statistics
  private logPoolStats(stats: any): void {
    const { activeConnections, maxConnections, utilizationRate } = stats;
    
    if (utilizationRate > 80) {
      console.warn(`⚠️ High connection pool utilization: ${utilizationRate.toFixed(1)}% (${activeConnections}/${maxConnections})`);
    } else if (utilizationRate > 60) {
      console.info(`ℹ️ Moderate connection pool utilization: ${utilizationRate.toFixed(1)}% (${activeConnections}/${maxConnections})`);
    } else {
      // Healthy connection pool utilization
    }
  }

  // Get current pool status
  getPoolStatus(): any {
    return enhancedSupabase.getPoolStats();
  }
}

// Optimized query helpers
export class OptimizedQueries {
  /**
   * Execute a query with connection pooling and performance monitoring
   */
  static async executeQuery<T>(
    operation: (client: any) => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    return enhancedSupabase.safeQuery(operation, context, userId);
  }

  /**
   * Execute multiple queries in batch using a single connection
   */
  static async executeBatchQueries<T>(
    operations: Array<{
      operation: (client: any) => Promise<{ data: any; error: any }>;
      context: ErrorContext;
    }>,
    userId?: string
  ): Promise<Array<T | null>> {
    return enhancedSupabase.batchOperations(operations, userId);
  }

  /**
   * Execute a mutation with connection pooling
   */
  static async executeMutation<T>(
    operation: (client: any) => Promise<{ data: T | null; error: any }>,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    return enhancedSupabase.safeMutation(operation, context, userId);
  }

  /**
   * Execute an RPC call with connection pooling
   */
  static async executeRPC<T>(
    functionName: string,
    params: any,
    context: ErrorContext,
    userId?: string
  ): Promise<T | null> {
    return enhancedSupabase.safeRPC(functionName, params, context, userId);
  }
}

// Connection pool configuration helpers
export class PoolConfig {
  /**
   * Get recommended pool settings based on user count
   */
  static getRecommendedSettings(userCount: number) {
    if (userCount < 1000) {
      return {
        maxConnections: 50,
        idleTimeout: 60000,
        connectionTimeout: 8000,
        eventsPerSecond: 10,
      };
    } else if (userCount < 10000) {
      return {
        maxConnections: 100,
        idleTimeout: 90000,
        connectionTimeout: 6000,
        eventsPerSecond: 15,
      };
    } else if (userCount < 50000) {
      return {
        maxConnections: 200,
        idleTimeout: 120000,
        connectionTimeout: 5000,
        eventsPerSecond: 20,
      };
    } else {
      return {
        maxConnections: 500,
        idleTimeout: 180000,
        connectionTimeout: 3000,
        eventsPerSecond: 30,
      };
    }
  }

  /**
   * Validate pool configuration
   */
  static validateConfig(config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.maxConnections || config.maxConnections < 1) {
      errors.push('maxConnections must be at least 1');
    }

    if (!config.idleTimeout || config.idleTimeout < 1000) {
      errors.push('idleTimeout must be at least 1000ms');
    }

    if (!config.connectionTimeout || config.connectionTimeout < 1000) {
      errors.push('connectionTimeout must be at least 1000ms');
    }

    if (!config.eventsPerSecond || config.eventsPerSecond < 1) {
      errors.push('eventsPerSecond must be at least 1');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Performance tracking
export class PerformanceTracker {
  private static queryTimes: Map<string, number[]> = new Map();
  private static mutationTimes: Map<string, number[]> = new Map();

  /**
   * Track query performance
   */
  static trackQuery(operation: string, duration: number): void {
    if (!this.queryTimes.has(operation)) {
      this.queryTimes.set(operation, []);
    }
    this.queryTimes.get(operation)!.push(duration);

    // Keep only last 100 measurements
    const times = this.queryTimes.get(operation)!;
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Track mutation performance
   */
  static trackMutation(operation: string, duration: number): void {
    if (!this.mutationTimes.has(operation)) {
      this.mutationTimes.set(operation, []);
    }
    this.mutationTimes.get(operation)!.push(duration);

    // Keep only last 100 measurements
    const times = this.mutationTimes.get(operation)!;
    if (times.length > 100) {
      times.shift();
    }
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): any {
    const stats: any = {
      queries: {},
      mutations: {},
    };

    // Calculate query stats
    for (const [operation, times] of this.queryTimes.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      stats.queries[operation] = {
        average: avg.toFixed(2),
        max: max.toFixed(2),
        min: min.toFixed(2),
        count: times.length,
      };
    }

    // Calculate mutation stats
    for (const [operation, times] of this.mutationTimes.entries()) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);
      
      stats.mutations[operation] = {
        average: avg.toFixed(2),
        max: max.toFixed(2),
        min: min.toFixed(2),
        count: times.length,
      };
    }

    return stats;
  }

  /**
   * Clear performance data
   */
  static clearPerformanceData(): void {
    this.queryTimes.clear();
    this.mutationTimes.clear();
  }
}

// Export singleton instances
export const poolMonitor = ConnectionPoolMonitor.getInstance();
export const optimizedQueries = OptimizedQueries;
export const poolConfig = PoolConfig;
export const performanceTracker = PerformanceTracker; 