import { supabase } from './supabaseClient';
import { enhancedCache } from './enhancedCacheManager';
import { advancedRateLimiter } from './advancedRateLimiter';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  avgResponseTime: number;
  totalOperations: number;
  errorRate: number;
  cacheHitRate: number;
  slowQueries: number;
}

export interface SystemHealth {
  database: {
    connections: number;
    cacheHitRatio: number;
    slowQueries: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    totalEntries: number;
  };
  rateLimiting: {
    blockedRequests: number;
    totalRequests: number;
  };
  app: {
    memoryUsage: number;
    cpuUsage: number;
    batteryLevel: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private flushInterval = 30000; // 30 seconds
  private flushTimer?: number;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
    }

  constructor() {
    this.startPeriodicFlush();
  }

  /**
   * Track operation performance
   */
  async trackOperation<T>(
    operation: string,
    operationFn: () => Promise<T>,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operationFn();
      const duration = performance.now() - startTime;
      
      await this.recordMetric({
        operation,
        duration,
        timestamp: new Date().toISOString(),
        userId,
        metadata: { ...metadata, success: true },
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      await this.recordMetric({
        operation,
        duration,
        timestamp: new Date().toISOString(),
        userId,
        metadata: { 
          ...metadata, 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        },
      });
      
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      this.metrics.push(metric);
      
      // Keep metrics array size manageable
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics);
      }
      
      // Flush immediately for critical operations
      if (metric.duration > 5000 || metric.metadata?.critical) {
        await this.flushMetrics();
      }
    } catch (error) {
      console.error('Record metric error:', error);
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(timeWindow: number = 3600000): Promise<PerformanceStats> {
    try {
      const now = Date.now();
      const windowStart = now - timeWindow;
      
      const recentMetrics = this.metrics.filter(
        metric => new Date(metric.timestamp).getTime() > windowStart
      );
      
      if (recentMetrics.length === 0) {
        return {
          avgResponseTime: 0,
          totalOperations: 0,
          errorRate: 0,
          cacheHitRate: 0,
          slowQueries: 0,
        };
      }
      
      const totalOperations = recentMetrics.length;
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;
      const errorCount = recentMetrics.filter(m => m.metadata?.success === false).length;
      const errorRate = (errorCount / totalOperations) * 100;
      const slowQueries = recentMetrics.filter(m => m.duration > 1000).length;
      
      const cacheStats = await enhancedCache.getStats();
      
      return {
        avgResponseTime,
        totalOperations,
        errorRate,
        cacheHitRate: cacheStats.hitRate,
        slowQueries,
      };
    } catch (error) {
      console.error('Get performance stats error:', error);
      return {
        avgResponseTime: 0,
        totalOperations: 0,
        errorRate: 0,
        cacheHitRate: 0,
        slowQueries: 0,
      };
    }
  }

  /**
   * Get system health overview
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const [dbStats, cacheStats, rateLimitStats] = await Promise.all([
        this.getDatabaseHealth(),
        this.getCacheHealth(),
        this.getRateLimitHealth(),
      ]);

    return {
        database: dbStats,
        cache: cacheStats,
        rateLimiting: rateLimitStats,
        app: await this.getAppHealth(),
    };
    } catch (error) {
      console.error('Get system health error:', error);
      return {
        database: { connections: 0, cacheHitRatio: 0, slowQueries: 0 },
        cache: { hitRate: 0, memoryUsage: 0, totalEntries: 0 },
        rateLimiting: { blockedRequests: 0, totalRequests: 0 },
        app: { memoryUsage: 0, cpuUsage: 0, batteryLevel: 0 },
      };
    }
  }

  /**
   * Get database health metrics
   */
  private async getDatabaseHealth(): Promise<SystemHealth['database']> {
    // Temporarily disabled to prevent database errors
    // Enable when you need database health monitoring
    return { connections: 0, cacheHitRatio: 0, slowQueries: 0 };
    
    // TODO: Uncomment when you need database health monitoring
    /*
    try {
      const { data, error } = await supabase.rpc('get_database_stats');
      
      if (error || !data) {
        return { connections: 0, cacheHitRatio: 0, slowQueries: 0 };
      }
      
      return {
        connections: data.active_connections || 0,
        cacheHitRatio: data.cache_hit_ratio || 0,
        slowQueries: data.slow_queries || 0,
      };
    } catch (error) {
      console.error('Database health check error:', error);
      return { connections: 0, cacheHitRatio: 0, slowQueries: 0 };
    }
    */
  }

  /**
   * Get cache health metrics
   */
  private async getCacheHealth(): Promise<SystemHealth['cache']> {
    try {
      const stats = await enhancedCache.getStats();
      return {
        hitRate: stats.hitRate,
        memoryUsage: stats.memoryUsage,
        totalEntries: stats.totalEntries,
      };
    } catch (error) {
      console.error('Cache health check error:', error);
      return { hitRate: 0, memoryUsage: 0, totalEntries: 0 };
    }
  }

  /**
   * Get rate limiting health metrics
   */
  private async getRateLimitHealth(): Promise<SystemHealth['rateLimiting']> {
    try {
      const stats = await advancedRateLimiter.getStats();
      return {
        blockedRequests: 0, // Would need to track this separately
        totalRequests: stats.totalRequests,
      };
    } catch (error) {
      console.error('Rate limit health check error:', error);
      return { blockedRequests: 0, totalRequests: 0 };
    }
  }

  /**
   * Get app health metrics
   */
  private async getAppHealth(): Promise<SystemHealth['app']> {
    try {
      // These would be platform-specific implementations
      return {
        memoryUsage: 0, // Would use React Native's Performance API
        cpuUsage: 0, // Would use platform-specific APIs
        batteryLevel: 0, // Would use expo-battery
      };
    } catch (error) {
      console.error('App health check error:', error);
      return { memoryUsage: 0, cpuUsage: 0, batteryLevel: 0 };
    }
  }

  /**
   * Flush metrics to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    // For now, just log metrics and clear memory
    // Enable database storage when you need performance analytics
    console.log(`📊 Performance metrics collected: ${this.metrics.length} operations`);
    
    // Log slow operations for debugging
    const slowOperations = this.metrics.filter(m => m.duration > 1000);
    if (slowOperations.length > 0) {
      console.warn(`🐌 Slow operations detected:`, slowOperations.map(m => ({
        operation: m.operation,
        duration: `${m.duration}ms`
      })));
    }
    
    // Clear metrics from memory
    this.metrics = [];
    
    // TODO: Enable database storage when scaling to 10k+ users
    // Uncomment the code below when you need performance analytics
    /*
    let metricsToFlush: PerformanceMetric[] = [];
    
    try {
      metricsToFlush = [...this.metrics];
      this.metrics = [];
      
      // Check if performance_metrics table exists before inserting
      const { data: tableExists, error: checkError } = await supabase
        .from('performance_metrics')
        .select('operation')
        .limit(1);
      
      if (checkError) {
        console.warn('Performance metrics table not available, skipping flush:', checkError.message);
        this.metrics.unshift(...metricsToFlush);
        return;
      }
      
      // Batch insert metrics
      const { error } = await supabase
        .from('performance_metrics')
        .insert(metricsToFlush.map(metric => ({
          operation: metric.operation,
          duration_ms: Math.round(metric.duration),
          user_count: metric.userId ? 1 : 0,
          timestamp: metric.timestamp,
          metadata: metric.metadata || {},
        })));
      
      if (error) {
        console.error('Flush metrics error:', error.message || error);
        this.metrics.unshift(...metricsToFlush);
      } else {
        console.log(`Successfully flushed ${metricsToFlush.length} metrics to database`);
      }
    } catch (error) {
      console.error('Flush metrics error:', error instanceof Error ? error.message : error);
      if (this.metrics.length === 0 && metricsToFlush.length > 0) {
        this.metrics.unshift(...metricsToFlush);
      }
    }
    */
  }

  /**
   * Start periodic metric flushing
   */
  private startPeriodicFlush(): void {
    // Temporarily disabled to prevent database errors
    // Enable when you need performance analytics
    console.log('📊 Performance monitoring active (console logging only)');
    
    // TODO: Uncomment when you need database storage
    /*
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
    */
  }

  /**
   * Stop periodic metric flushing
   */
  stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get slow operations
   */
  async getSlowOperations(threshold: number = 1000): Promise<PerformanceMetric[]> {
    return this.metrics.filter(metric => metric.duration > threshold);
  }

  /**
   * Get error patterns
   */
  async getErrorPatterns(): Promise<Record<string, number>> {
    const errors: Record<string, number> = {};
    
    this.metrics
      .filter(metric => metric.metadata?.success === false)
      .forEach(metric => {
        const errorType = metric.metadata?.error || 'unknown';
        errors[errorType] = (errors[errorType] || 0) + 1;
      });
    
    return errors;
  }

/**
   * Get operation breakdown
   */
  async getOperationBreakdown(): Promise<Record<string, { count: number; avgDuration: number }>> {
    const breakdown: Record<string, { count: number; avgDuration: number; totalDuration: number }> = {};
    
    this.metrics.forEach(metric => {
      if (!breakdown[metric.operation]) {
        breakdown[metric.operation] = { count: 0, avgDuration: 0, totalDuration: 0 };
      }
      
      breakdown[metric.operation].count++;
      breakdown[metric.operation].totalDuration += metric.duration;
      breakdown[metric.operation].avgDuration = breakdown[metric.operation].totalDuration / breakdown[metric.operation].count;
    });
    
    // Remove totalDuration from result
    const result: Record<string, { count: number; avgDuration: number }> = {};
    Object.entries(breakdown).forEach(([operation, stats]) => {
      result[operation] = { count: stats.count, avgDuration: stats.avgDuration };
    });
    
    return result;
  }

  /**
   * Generate performance report
   */
  async generateReport(): Promise<{
    stats: PerformanceStats;
    health: SystemHealth;
    slowOperations: PerformanceMetric[];
    errorPatterns: Record<string, number>;
    operationBreakdown: Record<string, { count: number; avgDuration: number }>;
  }> {
    const [stats, health, slowOperations, errorPatterns, operationBreakdown] = await Promise.all([
      this.getPerformanceStats(),
      this.getSystemHealth(),
      this.getSlowOperations(),
      this.getErrorPatterns(),
      this.getOperationBreakdown(),
    ]);
    
    return {
      stats,
      health,
      slowOperations,
      errorPatterns,
      operationBreakdown,
  };
  }

/**
   * Clean up old metrics
   */
  async cleanupOldMetrics(olderThanDays: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      this.metrics = this.metrics.filter(
        metric => new Date(metric.timestamp) > cutoffDate
      );
      
      // Also clean up database metrics
      const { error } = await supabase
        .from('performance_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());
      
      if (error) {
        console.error('Cleanup old metrics error:', error);
      }
    } catch (error) {
      console.error('Cleanup old metrics error:', error);
}
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance decorator for easy usage
export function trackPerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.trackOperation(
        operationName,
        () => method.apply(this, args),
        undefined,
        { method: propertyName, class: target.constructor.name }
      );
    };
  };
} 