/**
 * Marketplace Image Analytics Service
 * Tracks upload performance, usage statistics, and error reporting
 */

import { supabase } from './supabaseClient';
import { MARKETPLACE_IMAGE_CONFIG } from './marketplaceImageConfig';

export interface ImageUploadMetrics {
  uploadId: string;
  username: string;
  timestamp: Date;
  fileSize: number;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
  uploadDuration: number;
  compressionRatio: number;
  success: boolean;
  error?: string;
  bucket: string;
  imageType: 'listing' | 'avatar';
}

export interface ImageUsageStats {
  totalUploads: number;
  totalStorageUsed: number;
  averageFileSize: number;
  successRate: number;
  averageUploadTime: number;
  mostUsedBuckets: { bucket: string; count: number }[];
  uploadTrends: { date: string; count: number }[];
}

export class MarketplaceImageAnalytics {
  private static uploadMetrics: ImageUploadMetrics[] = [];
  private static isEnabled = MARKETPLACE_IMAGE_CONFIG.ANALYTICS.ENABLE_UPLOAD_TRACKING;

  /**
   * Track image upload metrics
   */
  static async trackUpload(metrics: Omit<ImageUploadMetrics, 'timestamp'>): Promise<void> {
    if (!this.isEnabled) return;

    const uploadMetric: ImageUploadMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.uploadMetrics.push(uploadMetric);

    // Store in Supabase for persistence
    try {
      await supabase.from('image_upload_metrics').insert({
        upload_id: metrics.uploadId,
        username: metrics.username,
        timestamp: uploadMetric.timestamp.toISOString(),
        file_size: metrics.fileSize,
        original_width: metrics.originalDimensions.width,
        original_height: metrics.originalDimensions.height,
        processed_width: metrics.processedDimensions.width,
        processed_height: metrics.processedDimensions.height,
        upload_duration: metrics.uploadDuration,
        compression_ratio: metrics.compressionRatio,
        success: metrics.success,
        error: metrics.error,
        bucket: metrics.bucket,
        image_type: metrics.imageType,
      });
    } catch (error) {
      console.error('Failed to store upload metrics:', error);
    }
  }

  /**
   * Get image usage statistics
   */
  static async getUsageStats(username?: string): Promise<ImageUsageStats> {
    try {
      let query = supabase
        .from('image_upload_metrics')
        .select('*');

      if (username) {
        query = query.eq('username', username);
      }

      const { data: metrics, error } = await query;

      if (error) {
        console.error('Failed to fetch usage stats:', error);
        return this.getDefaultStats();
      }

      if (!metrics || metrics.length === 0) {
        return this.getDefaultStats();
      }

      const totalUploads = metrics.length;
      const totalStorageUsed = metrics.reduce((sum, m) => sum + m.file_size, 0);
      const averageFileSize = totalStorageUsed / totalUploads;
      const successfulUploads = metrics.filter(m => m.success).length;
      const successRate = (successfulUploads / totalUploads) * 100;
      const averageUploadTime = metrics.reduce((sum, m) => sum + m.upload_duration, 0) / totalUploads;

      // Calculate bucket usage
      const bucketCounts = metrics.reduce((acc, m) => {
        acc[m.bucket] = (acc[m.bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedBuckets = Object.entries(bucketCounts)
        .map(([bucket, count]) => ({ bucket, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate upload trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentMetrics = metrics.filter(m => 
        new Date(m.timestamp) >= thirtyDaysAgo
      );

      const uploadTrends = this.calculateUploadTrends(recentMetrics);

      return {
        totalUploads,
        totalStorageUsed,
        averageFileSize,
        successRate,
        averageUploadTime,
        mostUsedBuckets,
        uploadTrends,
      };
    } catch (error) {
      console.error('Error calculating usage stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Calculate upload trends over time
   */
  private static calculateUploadTrends(metrics: any[]): { date: string; count: number }[] {
    const trends: Record<string, number> = {};

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0];
      trends[date] = (trends[date] || 0) + 1;
    });

    return Object.entries(trends)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get default stats when no data is available
   */
  private static getDefaultStats(): ImageUsageStats {
    return {
      totalUploads: 0,
      totalStorageUsed: 0,
      averageFileSize: 0,
      successRate: 0,
      averageUploadTime: 0,
      mostUsedBuckets: [],
      uploadTrends: [],
    };
  }

  /**
   * Track performance metrics
   */
  static async trackPerformance(operation: string, duration: number, success: boolean): Promise<void> {
    if (!MARKETPLACE_IMAGE_CONFIG.ANALYTICS.ENABLE_PERFORMANCE_MONITORING) return;

    try {
      await supabase.from('image_performance_metrics').insert({
        operation,
        duration,
        success,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track performance metrics:', error);
    }
  }

  /**
   * Track error occurrences
   */
  static async trackError(error: Error, context: string, username?: string): Promise<void> {
    if (!MARKETPLACE_IMAGE_CONFIG.ANALYTICS.ENABLE_ERROR_REPORTING) return;

    try {
      await supabase.from('image_error_logs').insert({
        error_message: error.message,
        error_stack: error.stack,
        context,
        username,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }

  /**
   * Get storage usage by bucket
   */
  static async getStorageUsage(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('image_upload_metrics')
        .select('bucket, file_size');

      if (error) {
        console.error('Failed to fetch storage usage:', error);
        return {};
      }

      const usage: Record<string, number> = {};
      data?.forEach(metric => {
        usage[metric.bucket] = (usage[metric.bucket] || 0) + metric.file_size;
      });

      return usage;
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return {};
    }
  }

  /**
   * Clear old analytics data
   */
  static async clearOldData(daysToKeep = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      await supabase
        .from('image_upload_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      await supabase
        .from('image_performance_metrics')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      await supabase
        .from('image_error_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      console.log(`Cleared analytics data older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to clear old analytics data:', error);
    }
  }
} 