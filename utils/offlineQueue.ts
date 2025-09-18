import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkMonitor } from './networkMonitor';
import { enhancedCache } from './enhancedCacheManager';
import { errorHandler } from './errorHandler';

// Types for offline actions
export interface OfflineAction {
  id: string;
  type: 'ping' | 'message' | 'upload' | 'profile_update' | 'listing_create' | 'listing_update';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  metadata?: {
    userId?: string;
    listingId?: string;
    chatId?: string;
    imageUrls?: string[];
  };
}

export interface QueueStatus {
  totalActions: number;
  pendingActions: number;
  failedActions: number;
  lastSyncTime: number | null;
  isProcessing: boolean;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
}

// Queue configuration
const QUEUE_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 5000, 15000], // Exponential backoff
  MAX_QUEUE_SIZE: 100,
  SYNC_BATCH_SIZE: 10,
  STORAGE_KEY: 'offline_action_queue',
  STATUS_KEY: 'offline_queue_status',
};

class OfflineQueueManager {
  private static instance: OfflineQueueManager;
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  private syncCallbacks: ((result: SyncResult) => void)[] = [];
  private networkListener: (() => void) | null = null;

  static getInstance(): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager();
    }
    return OfflineQueueManager.instance;
  }

  private constructor() {
    this.initializeQueue();
    this.setupNetworkListener();
  }

  private async initializeQueue() {
    try {
      // Load existing queue from storage
      const storedQueue = await AsyncStorage.getItem(QUEUE_CONFIG.STORAGE_KEY);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }

      // Load status
      const storedStatus = await AsyncStorage.getItem(QUEUE_CONFIG.STATUS_KEY);
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        this.isProcessing = status.isProcessing || false;
      }

    } catch (error) {
      console.error('Error initializing offline queue:', error);
      await errorHandler.handleSilentError(error, {
        operation: 'initialize_offline_queue',
        component: 'OfflineQueueManager',
      });
    }
  }

  private setupNetworkListener() {
    // Listen for network connectivity changes
    this.networkListener = () => {
      if (networkMonitor.isOnline() && this.queue.length > 0) {
        this.processQueue();
      }
    };

    networkMonitor.addCallback({
      onOnline: this.networkListener,
    });
  }

  // Add action to queue
  async addAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const actionId = this.generateActionId();
    const newAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      // Add to memory queue
      this.queue.push(newAction);

      // Sort by priority and timestamp
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // High priority first
        }
        
        return a.timestamp - b.timestamp; // Older first
      });

      // Limit queue size
      if (this.queue.length > QUEUE_CONFIG.MAX_QUEUE_SIZE) {
        this.queue = this.queue.slice(0, QUEUE_CONFIG.MAX_QUEUE_SIZE);
      }

      // Save to storage
      await this.saveQueue();

      // Action added to offline queue successfully

      // Try to process immediately if online
      if (networkMonitor.isOnline()) {
        this.processQueue();
      }

      return actionId;
    } catch (error) {
      console.error('Error adding action to queue:', error);
      await errorHandler.handleSilentError(error, {
        operation: 'add_offline_action',
        component: 'OfflineQueueManager',
      });
      throw error;
    }
  }

  // Process the queue
  async processQueue(): Promise<SyncResult> {
    if (this.isProcessing || this.queue.length === 0) {
      return {
        success: true,
        processedCount: 0,
        failedCount: 0,
        errors: [],
      };
    }

    this.isProcessing = true;
    await this.updateStatus();

    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      // Processing offline queue silently

      // Process actions in batches
      const batchSize = QUEUE_CONFIG.SYNC_BATCH_SIZE;
      const batches = this.chunkArray(this.queue, batchSize);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(action => this.processAction(action))
        );

        // Handle batch results
        batchResults.forEach((batchResult, index) => {
          const action = batch[index];
          
          if (batchResult.status === 'fulfilled' && batchResult.value) {
            // Success - remove from queue
            this.removeAction(action.id);
            result.processedCount++;
          } else {
            // Failed - increment retry count or remove
            if (action.retryCount < action.maxRetries) {
              action.retryCount++;
              // Action failed, retry count incremented
            } else {
              // Max retries reached - remove from queue
              this.removeAction(action.id);
              result.failedCount++;
              result.errors.push(`Action ${action.type} failed after ${action.maxRetries} retries`);
            }
          }
        });

        // Save queue after each batch
        await this.saveQueue();
      }

      // Queue processing completed silently
    } catch (error) {
      console.error('Error processing offline queue:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      await errorHandler.handleSilentError(error, {
        operation: 'process_offline_queue',
        component: 'OfflineQueueManager',
      });
    } finally {
      this.isProcessing = false;
      await this.updateStatus();
      
      // Notify callbacks
      this.syncCallbacks.forEach(callback => callback(result));
    }

    return result;
  }

  // Process individual action
  private async processAction(action: OfflineAction): Promise<boolean> {
    try {
      // Add delay based on retry count
      if (action.retryCount > 0) {
        const delay = QUEUE_CONFIG.RETRY_DELAYS[Math.min(action.retryCount - 1, QUEUE_CONFIG.RETRY_DELAYS.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Execute action based on type
      switch (action.type) {
        case 'ping':
          return await this.executePingAction(action);
        case 'message':
          return await this.executeMessageAction(action);
        case 'upload':
          return await this.executeUploadAction(action);
        case 'profile_update':
          return await this.executeProfileUpdateAction(action);
        case 'listing_create':
          return await this.executeListingCreateAction(action);
        case 'listing_update':
          return await this.executeListingUpdateAction(action);
        default:
          // Unknown action type
          return false;
      }
    } catch (error) {
      console.error(`Error processing action ${action.id}:`, error);
      return false;
    }
  }

  // Action executors
  private async executePingAction(action: OfflineAction): Promise<boolean> {
    try {
      const { createPing } = await import('./activitySupabase');
      await createPing(action.data);
      return true;
    } catch (error) {
      console.error('Ping action failed:', error);
      return false;
    }
  }

  private async executeMessageAction(action: OfflineAction): Promise<boolean> {
    // Chat functionality removed - using WhatsApp instead
    return true;
  }

  private async executeUploadAction(action: OfflineAction): Promise<boolean> {
    try {
      const { EnhancedImageService } = await import('./enhancedImageService');
      const imageService = EnhancedImageService.getInstance();
      await imageService.uploadImage(action.data.imageUri, action.data.bucket, action.data.path);
      return true;
    } catch (error) {
      console.error('Upload action failed:', error);
      return false;
    }
  }

  private async executeProfileUpdateAction(action: OfflineAction): Promise<boolean> {
    try {
      const { supabase } = await import('./supabaseClient');
      const { error } = await supabase
        .from('users')
        .update(action.data.updates)
        .eq('id', action.data.userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Profile update action failed:', error);
      return false;
    }
  }

  private async executeListingCreateAction(action: OfflineAction): Promise<boolean> {
    try {
      const { addListing } = await import('./listingSupabase');
      await addListing(action.data);
      // Invalidate marketplace caches so new listing appears
      await enhancedCache.invalidateRelated('marketplace_list_v3');
      return true;
    } catch (error) {
      console.error('Listing create action failed:', error);
      return false;
    }
  }

  private async executeListingUpdateAction(action: OfflineAction): Promise<boolean> {
    try {
      const { updateListing } = await import('./listingSupabase');
      await updateListing(action.data.listingId, action.data.updates);
      // Invalidate marketplace caches so updates reflect
      await enhancedCache.invalidateRelated('marketplace_list_v3');
      return true;
    } catch (error) {
      console.error('Listing update action failed:', error);
      return false;
    }
  }

  // Queue management
  private removeAction(actionId: string) {
    this.queue = this.queue.filter(action => action.id !== actionId);
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_CONFIG.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  private async updateStatus() {
    try {
      const status: QueueStatus = {
        totalActions: this.queue.length,
        pendingActions: this.queue.filter(a => a.retryCount === 0).length,
        failedActions: this.queue.filter(a => a.retryCount >= a.maxRetries).length,
        lastSyncTime: this.isProcessing ? Date.now() : null,
        isProcessing: this.isProcessing,
      };
      
      await AsyncStorage.setItem(QUEUE_CONFIG.STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error updating queue status:', error);
    }
  }

  // Public methods
  async getQueueStatus(): Promise<QueueStatus> {
    await this.updateStatus();
    const stored = await AsyncStorage.getItem(QUEUE_CONFIG.STATUS_KEY);
    return stored ? JSON.parse(stored) : {
      totalActions: 0,
      pendingActions: 0,
      failedActions: 0,
      lastSyncTime: null,
      isProcessing: false,
    };
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
    await this.updateStatus();
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    return this.queue.filter(action => action.retryCount < action.maxRetries);
  }

  onSyncComplete(callback: (result: SyncResult) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      const index = this.syncCallbacks.indexOf(callback);
      if (index > -1) {
        this.syncCallbacks.splice(index, 1);
      }
    };
  }

  // Utility methods
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Cleanup
  destroy() {
    if (this.networkListener) {
      // Note: This would need proper cleanup in a real NetInfo implementation
      this.networkListener = null;
    }
    this.syncCallbacks = [];
  }
}

// Export singleton instance
export const offlineQueue = OfflineQueueManager.getInstance();

// Export convenience functions
export const addOfflineAction = (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => 
  offlineQueue.addAction(action);

export const processOfflineQueue = () => offlineQueue.processQueue();
export const getQueueStatus = () => offlineQueue.getQueueStatus();
export const clearOfflineQueue = () => offlineQueue.clearQueue(); 