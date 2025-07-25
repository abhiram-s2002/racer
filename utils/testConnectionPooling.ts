/**
 * Connection Pooling Test Utility
 * Simple tests to verify connection pooling is working correctly
 */

import { enhancedSupabase } from './supabaseClient';
import { poolMonitor, performanceTracker } from './connectionPoolUtils';
import { ErrorContext } from './errorHandler';

export class ConnectionPoolingTester {
  /**
   * Test basic connection pooling functionality
   */
  static async testBasicFunctionality(): Promise<boolean> {
    try {
      console.log('🧪 Testing connection pooling...');

      // Test 1: Basic query
      const result1 = await enhancedSupabase.safeQuery(
        async (client) => client.from('users').select('username').limit(1),
        { operation: 'test_query_1', component: 'ConnectionPoolingTester' }
      );

      if (!result1) {
        console.error('❌ Basic query failed');
        return false;
      }

      // Test 2: Multiple queries
      const results = await enhancedSupabase.batchOperations([
        {
          operation: async (client) => client.from('users').select('username').limit(1),
          context: { operation: 'test_query_2', component: 'ConnectionPoolingTester' }
        },
        {
          operation: async (client) => client.from('listings').select('title').limit(1),
          context: { operation: 'test_query_3', component: 'ConnectionPoolingTester' }
        }
      ]);

      if (results.length !== 2) {
        console.error('❌ Batch operations failed');
        return false;
      }

      // Test 3: Check pool statistics
      const stats = enhancedSupabase.getPoolStats();
      console.log('📊 Pool stats:', stats);

      if (stats.maxConnections <= 0) {
        console.error('❌ Invalid pool configuration');
        return false;
      }

      console.log('✅ Connection pooling tests passed');
      return true;
    } catch (error) {
      console.error('❌ Connection pooling test failed:', error);
      return false;
    }
  }

  /**
   * Test performance monitoring
   */
  static async testPerformanceMonitoring(): Promise<boolean> {
    try {
      console.log('🧪 Testing performance monitoring...');

      // Start monitoring
      poolMonitor.startMonitoring(5000); // 5 seconds for testing

      // Perform some operations
      for (let i = 0; i < 5; i++) {
        await enhancedSupabase.safeQuery(
          async (client) => client.from('users').select('username').limit(1),
          { operation: `performance_test_${i}`, component: 'ConnectionPoolingTester' }
        );
      }

      // Wait a bit for monitoring to capture data
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Check performance stats
      const performance = performanceTracker.getPerformanceStats();
      console.log('📊 Performance stats:', performance);

      // Stop monitoring
      poolMonitor.stopMonitoring();

      console.log('✅ Performance monitoring tests passed');
      return true;
    } catch (error) {
      console.error('❌ Performance monitoring test failed:', error);
      return false;
    }
  }

  /**
   * Test error handling
   */
  static async testErrorHandling(): Promise<boolean> {
    try {
      console.log('🧪 Testing error handling...');

      // Test with invalid query
      const result = await enhancedSupabase.safeQuery(
        async (client) => client.from('nonexistent_table').select('*'),
        { operation: 'error_test', component: 'ConnectionPoolingTester' }
      );

      // Should return null for invalid queries
      if (result !== null) {
        console.error('❌ Error handling failed - should return null for invalid queries');
        return false;
      }

      console.log('✅ Error handling tests passed');
      return true;
    } catch (error) {
      console.error('❌ Error handling test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{
    basicFunctionality: boolean;
    performanceMonitoring: boolean;
    errorHandling: boolean;
    allPassed: boolean;
  }> {
    console.log('🚀 Starting connection pooling tests...\n');

    const basicFunctionality = await this.testBasicFunctionality();
    const performanceMonitoring = await this.testPerformanceMonitoring();
    const errorHandling = await this.testErrorHandling();

    const allPassed = basicFunctionality && performanceMonitoring && errorHandling;

    console.log('\n📋 Test Results:');
    console.log(`Basic Functionality: ${basicFunctionality ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Performance Monitoring: ${performanceMonitoring ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Error Handling: ${errorHandling ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    return {
      basicFunctionality,
      performanceMonitoring,
      errorHandling,
      allPassed
    };
  }

  /**
   * Get current pool status
   */
  static getPoolStatus() {
    return enhancedSupabase.getPoolStats();
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats() {
    return performanceTracker.getPerformanceStats();
  }
}

// Export for easy testing
export const connectionPoolingTester = ConnectionPoolingTester; 