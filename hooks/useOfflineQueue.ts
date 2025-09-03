import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, OfflineAction, QueueStatus, SyncResult } from '@/utils/offlineQueue';
import { networkMonitor } from '@/utils/networkMonitor';

export function useOfflineQueue() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    totalActions: 0,
    pendingActions: 0,
    failedActions: 0,
    lastSyncTime: null,
    isProcessing: false,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);

  // Load queue status
  const loadQueueStatus = useCallback(async () => {
    try {
      const status = await offlineQueue.getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      // Silent error handling
    }
  }, []);

  // Load pending actions
  const loadPendingActions = useCallback(async () => {
    try {
      const actions = await offlineQueue.getPendingActions();
      setPendingActions(actions);
    } catch (error) {
      // Silent error handling
    }
  }, []);

  // Add action to queue
  const addAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const actionId = await offlineQueue.addAction(action);
    await loadQueueStatus();
    await loadPendingActions();
    return actionId;
  }, [loadQueueStatus, loadPendingActions]);

  // Process queue manually
  const processQueue = useCallback(async (): Promise<SyncResult> => {
    const result = await offlineQueue.processQueue();
    await loadQueueStatus();
    await loadPendingActions();
    return result;
  }, [loadQueueStatus, loadPendingActions]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    await offlineQueue.clearQueue();
    await loadQueueStatus();
    await loadPendingActions();
  }, [loadQueueStatus, loadPendingActions]);

  // Convenience methods for common actions
  const addPingAction = useCallback(async (pingData: any, priority: 'high' | 'medium' | 'low' = 'medium') => {
    return addAction({
      type: 'ping',
      data: pingData,
      priority,
      maxRetries: 3,
    });
  }, [addAction]);

  const addMessageAction = useCallback(async (messageData: any, priority: 'high' | 'medium' | 'low' = 'high') => {
    return addAction({
      type: 'message',
      data: messageData,
      priority,
      maxRetries: 3,
    });
  }, [addAction]);

  const addUploadAction = useCallback(async (uploadData: any, priority: 'high' | 'medium' | 'low' = 'low') => {
    return addAction({
      type: 'upload',
      data: uploadData,
      priority,
      maxRetries: 2,
    });
  }, [addAction]);

  const addProfileUpdateAction = useCallback(async (profileData: any, priority: 'high' | 'medium' | 'low' = 'medium') => {
    return addAction({
      type: 'profile_update',
      data: profileData,
      priority,
      maxRetries: 3,
    });
  }, [addAction]);

  const addListingCreateAction = useCallback(async (listingData: any, priority: 'high' | 'medium' | 'low' = 'high') => {
    return addAction({
      type: 'listing_create',
      data: listingData,
      priority,
      maxRetries: 3,
    });
  }, [addAction]);

  const addListingUpdateAction = useCallback(async (listingData: any, priority: 'high' | 'medium' | 'low' = 'medium') => {
    return addAction({
      type: 'listing_update',
      data: listingData,
      priority,
      maxRetries: 3,
    });
  }, [addAction]);

  useEffect(() => {
    // Initialize network status
    setIsOnline(networkMonitor.isOnline());

    // Listen for network changes
    const unsubscribe = networkMonitor.addCallback({
      onOnline: () => setIsOnline(true),
      onOffline: () => setIsOnline(false),
    });

    // Load initial data
    loadQueueStatus();
    loadPendingActions();

    // Listen for sync completion
    const syncUnsubscribe = offlineQueue.onSyncComplete(() => {
      loadQueueStatus();
      loadPendingActions();
    });

    // Update periodically - minimal frequency since no real-time needed
    const interval = setInterval(() => {
      loadQueueStatus();
      loadPendingActions();
    }, 120000); // 2 minutes since no real-time

    return () => {
      unsubscribe();
      syncUnsubscribe();
      clearInterval(interval);
    };
  }, [loadQueueStatus, loadPendingActions]);

  return {
    // State (simplified - no UI monitoring)
    isOnline,
    
    // Actions
    addAction,
    addPingAction,
    addMessageAction,
    addUploadAction,
    addProfileUpdateAction,
    addListingCreateAction,
    addListingUpdateAction,
    processQueue,
    clearQueue,
    
    // Computed values (simplified)
    hasPendingActions: queueStatus.totalActions > 0,
    isProcessing: queueStatus.isProcessing,
    canSync: isOnline && queueStatus.totalActions > 0 && !queueStatus.isProcessing,
  };
} 