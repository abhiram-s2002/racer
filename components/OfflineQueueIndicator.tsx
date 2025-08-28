import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import { networkMonitor } from '@/utils/networkMonitor';
import { offlineQueue, QueueStatus, SyncResult } from '@/utils/offlineQueue';

interface OfflineQueueIndicatorProps {
  showDetails?: boolean;
  onSyncComplete?: (result: SyncResult) => void;
}

export default function OfflineQueueIndicator({ 
  showDetails = false, 
  onSyncComplete 
}: OfflineQueueIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    totalActions: 0,
    pendingActions: 0,
    failedActions: 0,
    lastSyncTime: null,
    isProcessing: false,
  });

  useEffect(() => {
    // Initialize network status
    setIsOnline(networkMonitor.isOnline());

    // Listen for network changes
    const unsubscribe = networkMonitor.addCallback({
      onOnline: () => setIsOnline(true),
      onOffline: () => setIsOnline(false),
    });

    // Load initial queue status
    loadQueueStatus();

    // Listen for sync completion
    const syncUnsubscribe = offlineQueue.onSyncComplete((result) => {
      loadQueueStatus();
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    });

    // Update status periodically
    const interval = setInterval(loadQueueStatus, 5000);

    return () => {
      unsubscribe();
      syncUnsubscribe();
      clearInterval(interval);
    };
  }, [onSyncComplete]);

  const loadQueueStatus = async () => {
    try {
      const status = await offlineQueue.getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
              // Error loading queue status
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const result = await offlineQueue.processQueue();
      
      if (result.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${result.processedCount} actions.${result.failedCount > 0 ? ` ${result.failedCount} actions failed.` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sync Failed',
          'Some actions could not be synced. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Sync Error',
        'An error occurred while syncing. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleClearQueue = () => {
    Alert.alert(
      'Clear Offline Queue',
      'This will remove all pending offline actions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await offlineQueue.clearQueue();
            loadQueueStatus();
          },
        },
      ]
    );
  };

  // Don't show indicator if no offline actions and online
  if (queueStatus.totalActions === 0 && isOnline) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Main Status Bar */}
      <View style={[styles.statusBar, !isOnline && styles.offlineStatus]}>
        <View style={styles.statusContent}>
          {/* Network Status Icon */}
          {isOnline ? (
            <Wifi size={16} color="#22C55E" />
          ) : (
            <WifiOff size={16} color="#EF4444" />
          )}

          {/* Status Text */}
          <Text style={[styles.statusText, !isOnline && styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>

          {/* Queue Status */}
          {queueStatus.totalActions > 0 && (
            <View style={styles.queueInfo}>
              {queueStatus.isProcessing ? (
                <RefreshCw size={14} color="#F59E0B" style={styles.spinning} />
              ) : queueStatus.failedActions > 0 ? (
                <AlertCircle size={14} color="#EF4444" />
              ) : (
                <Clock size={14} color="#3B82F6" />
              )}
              
              <Text style={styles.queueText}>
                {queueStatus.isProcessing 
                  ? 'Syncing...' 
                  : `${queueStatus.pendingActions} pending`
                }
              </Text>
            </View>
          )}

          {/* Manual Sync Button */}
          {queueStatus.totalActions > 0 && isOnline && !queueStatus.isProcessing && (
            <TouchableOpacity 
              style={styles.syncButton} 
              onPress={handleManualSync}
            >
              <RefreshCw size={14} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>

        {/* Success Indicator */}
        {queueStatus.totalActions === 0 && isOnline && (
          <View style={styles.successIndicator}>
            <CheckCircle size={16} color="#22C55E" />
            <Text style={styles.successText}>All synced</Text>
          </View>
        )}
      </View>

      {/* Detailed View */}
      {showDetails && queueStatus.totalActions > 0 && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Actions:</Text>
            <Text style={styles.detailValue}>{queueStatus.totalActions}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pending:</Text>
            <Text style={styles.detailValue}>{queueStatus.pendingActions}</Text>
          </View>
          
          {queueStatus.failedActions > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Failed:</Text>
              <Text style={[styles.detailValue, styles.failedText]}>
                {queueStatus.failedActions}
              </Text>
            </View>
          )}

          {queueStatus.lastSyncTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Sync:</Text>
              <Text style={styles.detailValue}>
                {new Date(queueStatus.lastSyncTime).toLocaleTimeString()}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.retryButton]} 
              onPress={handleManualSync}
              disabled={!isOnline || queueStatus.isProcessing}
            >
              <Text style={styles.actionButtonText}>Retry Sync</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.clearButton]} 
              onPress={handleClearQueue}
            >
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>
                Clear Queue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  offlineStatus: {
    backgroundColor: '#FEF2F2',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  offlineText: {
    color: '#DC2626',
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  queueText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  syncButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  successIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  failedText: {
    color: '#DC2626',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  clearButtonText: {
    color: '#6B7280',
  },
}); 