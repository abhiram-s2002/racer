import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { CheckCircle, XCircle, RefreshCw, CreditCard } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';

const SubscriptionVerificationTest: React.FC = () => {
  const { user } = useAuth();
  const {
    isLoading,
    isInitialized,
    subscriptions,
    hasActiveSubscription,
    isVerified,
    verificationStatus,
    verificationExpiresAt,
    purchaseSubscription,
    refreshVerificationStatus,
    error
  } = useSubscription();

  const [testResults, setTestResults] = useState<any>(null);

  const runTests = async () => {
    try {
      const results = {
        userAuthenticated: !!user,
        subscriptionServiceInitialized: isInitialized,
        subscriptionsLoaded: subscriptions.length > 0,
        hasActiveSubscription,
        isVerified,
        verificationStatus,
        verificationExpiresAt,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
    }
  };

  const testPurchase = async (productId: string) => {
    try {
      await purchaseSubscription(productId);
      // Refresh status after purchase
      setTimeout(() => {
        refreshVerificationStatus();
        runTests();
      }, 2000);
    } catch (error) {
      console.error('Purchase test error:', error);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      runTests();
    }
  }, [isInitialized, hasActiveSubscription, isVerified]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription & Verification Test</Text>
      
      {/* Status Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>User Authenticated:</Text>
          {user ? <CheckCircle size={16} color="#22C55E" /> : <XCircle size={16} color="#EF4444" />}
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Service Initialized:</Text>
          {isInitialized ? <CheckCircle size={16} color="#22C55E" /> : <XCircle size={16} color="#EF4444" />}
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Has Active Subscription:</Text>
          {hasActiveSubscription ? <CheckCircle size={16} color="#22C55E" /> : <XCircle size={16} color="#EF4444" />}
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Is Verified:</Text>
          {isVerified ? <CheckCircle size={16} color="#22C55E" /> : <XCircle size={16} color="#EF4444" />}
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Verification Status:</Text>
          <Text style={[styles.statusValue, { color: isVerified ? '#22C55E' : '#EF4444' }]}>
            {verificationStatus || 'Unknown'}
          </Text>
        </View>
        
        {verificationExpiresAt && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Expires At:</Text>
            <Text style={styles.statusValue}>
              {new Date(verificationExpiresAt).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Available Subscriptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Subscriptions</Text>
        {subscriptions.map((sub) => (
          <View key={sub.productId} style={styles.subscriptionItem}>
            <Text style={styles.subscriptionTitle}>{sub.title}</Text>
            <Text style={styles.subscriptionPrice}>
              {sub.platform === 'android' && sub.subscriptionOfferDetails?.[0]?.pricingPhases?.pricingPhaseList?.[0]?.formattedPrice || sub.title}
            </Text>
            <Text style={styles.subscriptionId}>{sub.productId}</Text>
          </View>
        ))}
      </View>

      {/* Test Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={runTests}
          disabled={isLoading}
        >
          <RefreshCw size={16} color="#FFFFFF" />
          <Text style={styles.testButtonText}>Refresh Status</Text>
        </TouchableOpacity>

        {subscriptions.length > 0 && (
          <>
            <TouchableOpacity 
              style={[styles.testButton, styles.purchaseButton]} 
              onPress={() => testPurchase(subscriptions[0].productId)}
              disabled={isLoading}
            >
              <CreditCard size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Test Monthly Purchase</Text>
            </TouchableOpacity>

            {subscriptions.length > 1 && (
              <TouchableOpacity 
                style={[styles.testButton, styles.purchaseButton]} 
                onPress={() => testPurchase(subscriptions[1].productId)}
                disabled={isLoading}
              >
                <CreditCard size={16} color="#FFFFFF" />
                <Text style={styles.testButtonText}>Test Annual Purchase</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Test Results */}
      {testResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <Text style={styles.testResults}>
            {JSON.stringify(testResults, null, 2)}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  subscriptionItem: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subscriptionPrice: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '500',
  },
  subscriptionId: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  purchaseButton: {
    backgroundColor: '#22C55E',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  testResults: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});

export default SubscriptionVerificationTest;
