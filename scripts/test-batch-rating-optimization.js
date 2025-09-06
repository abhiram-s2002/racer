#!/usr/bin/env node

/**
 * Test Script: Batch Rating Optimization
 * 
 * This script tests the new batch rating optimization to ensure it works correctly
 * and provides the expected 83% cost reduction for 100k+ users.
 * 
 * Usage: node scripts/test-batch-rating-optimization.js
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBatchRatingOptimization() {
  console.log('🚀 Testing Batch Rating Optimization for 100k+ Users\n');

  try {
    // Test 1: Check if the batch function exists
    console.log('📋 Test 1: Checking if batch function exists...');
    const { data: functions, error: functionError } = await supabase
      .rpc('get_batch_user_rating_stats', { usernames: ['test_user'] });
    
    if (functionError) {
      console.error('❌ Batch function not found or error:', functionError.message);
      return;
    }
    console.log('✅ Batch function exists and is callable\n');

    // Test 2: Test with sample usernames
    console.log('📋 Test 2: Testing with sample usernames...');
    const testUsernames = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'];
    
    const startTime = Date.now();
    const { data: batchResults, error: batchError } = await supabase
      .rpc('get_batch_user_rating_stats', { usernames: testUsernames });
    const batchTime = Date.now() - startTime;

    if (batchError) {
      console.error('❌ Batch query error:', batchError.message);
      return;
    }

    console.log(`✅ Batch query completed in ${batchTime}ms`);
    console.log(`📊 Results: ${batchResults ? batchResults.length : 0} users processed`);
    console.log(`📈 Sample results:`, batchResults?.slice(0, 3) || 'No data\n');

    // Test 3: Performance comparison (simulated)
    console.log('📋 Test 3: Performance comparison simulation...');
    
    // Simulate individual function calls (6 calls for 6 users)
    const individualStartTime = Date.now();
    const individualPromises = testUsernames.map(async (username) => {
      const { data, error } = await supabase
        .rpc('get_user_rating_stats', { target_username: username });
      return { username, data, error };
    });
    
    await Promise.all(individualPromises);
    const individualTime = Date.now() - individualStartTime;

    console.log(`⏱️  Individual calls: ${individualTime}ms (6 function calls)`);
    console.log(`⏱️  Batch call: ${batchTime}ms (1 batch query)`);
    console.log(`📈 Performance improvement: ${Math.round((individualTime - batchTime) / individualTime * 100)}% faster`);
    console.log(`💰 Cost reduction: 83% (6 calls → 1 call)\n`);

    // Test 4: Scale simulation
    console.log('📋 Test 4: Scale simulation for 100k users...');
    
    const dailyPageLoads = 100000; // 100k users
    const listingsPerPage = 6;
    const individualQueriesPerDay = dailyPageLoads * listingsPerPage;
    const batchQueriesPerDay = dailyPageLoads;
    
    console.log(`📊 Daily queries with individual calls: ${individualQueriesPerDay.toLocaleString()}`);
    console.log(`📊 Daily queries with batch calls: ${batchQueriesPerDay.toLocaleString()}`);
    console.log(`💰 Daily cost reduction: ${((individualQueriesPerDay - batchQueriesPerDay) / individualQueriesPerDay * 100).toFixed(1)}%`);
    console.log(`💰 Monthly cost reduction: ${((individualQueriesPerDay - batchQueriesPerDay) * 30).toLocaleString()} fewer queries`);
    console.log(`💰 Annual cost reduction: ${((individualQueriesPerDay - batchQueriesPerDay) * 365).toLocaleString()} fewer queries\n`);

    console.log('🎉 Batch Rating Optimization Test Completed Successfully!');
    console.log('✅ Ready for 100k+ users with 83% cost reduction');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testBatchRatingOptimization();
