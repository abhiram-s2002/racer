import { offlineQueue, addOfflineAction } from './offlineQueue';
import { networkMonitor } from './networkMonitor';

export async function testOfflineQueue() {
  console.log('🧪 Testing Offline Queue System...');

  try {
    // Test 1: Add actions to queue
    console.log('📝 Test 1: Adding actions to queue...');
    
    const pingActionId = await addOfflineAction({
      type: 'ping',
      data: {
        listing_id: 'test-listing-1',
        sender_username: 'testuser',
        receiver_username: 'seller1',
        message: 'Test ping message'
      },
      priority: 'high',
      maxRetries: 3
    });
    
    const messageActionId = await addOfflineAction({
      type: 'message',
      data: {
        chatId: 'test-chat-1',
        senderUsername: 'testuser',
        text: 'Test message'
      },
      priority: 'high',
      maxRetries: 3
    });

    console.log('✅ Added actions:', { pingActionId, messageActionId });

    // Test 2: Check queue status
    console.log('📊 Test 2: Checking queue status...');
    const status = await offlineQueue.getQueueStatus();
    console.log('Queue status:', status);

    // Test 3: Get pending actions
    console.log('📋 Test 3: Getting pending actions...');
    const pendingActions = await offlineQueue.getPendingActions();
    console.log('Pending actions:', pendingActions.length);

    // Test 4: Check network status
    console.log('🌐 Test 4: Checking network status...');
    const isOnline = networkMonitor.isOnline();
    console.log('Network online:', isOnline);

    // Test 5: Process queue (if online)
    if (isOnline) {
      console.log('🔄 Test 5: Processing queue...');
      const result = await offlineQueue.processQueue();
      console.log('Process result:', result);
    } else {
      console.log('⚠️ Skipping queue processing (offline)');
    }

    // Test 6: Final status check
    console.log('📊 Test 6: Final status check...');
    const finalStatus = await offlineQueue.getQueueStatus();
    console.log('Final queue status:', finalStatus);

    console.log('✅ Offline queue test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Offline queue test failed:', error);
    return false;
  }
}

export async function clearTestQueue() {
  try {
    await offlineQueue.clearQueue();
    console.log('🧹 Test queue cleared');
  } catch (error) {
    console.error('❌ Failed to clear test queue:', error);
  }
}

// Manual test functions
export const testFunctions = {
  addTestPing: () => addOfflineAction({
    type: 'ping',
    data: {
      listing_id: `test-${Date.now()}`,
      sender_username: 'testuser',
      receiver_username: 'seller1',
      message: 'Test ping from manual test'
    },
    priority: 'high',
    maxRetries: 3
  }),

  addTestMessage: () => addOfflineAction({
    type: 'message',
    data: {
      chatId: `test-chat-${Date.now()}`,
      senderUsername: 'testuser',
      text: 'Test message from manual test'
    },
    priority: 'high',
    maxRetries: 3
  }),

  getStatus: () => offlineQueue.getQueueStatus(),
  
  processQueue: () => offlineQueue.processQueue(),
  
  clearQueue: () => offlineQueue.clearQueue(),
  
  getPendingActions: () => offlineQueue.getPendingActions()
}; 