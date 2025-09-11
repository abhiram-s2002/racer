// Test Component for Google Play Subscriptions
// Use this component to test subscription functionality during development

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { CreditCard, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react-native';
import { useSubscription } from '../hooks/useSubscription';
import { SUBSCRIPTION_PRODUCTS } from '../utils/subscriptionService';

const SubscriptionTestComponent: React.FC = () => {
  const {
    isLoading,
    isInitialized,
    subscriptions,
    currentSubscriptions,
    hasActiveSubscription,
    error,
    initialize,
    loadSubscriptions,
    purchaseSubscription,
    restorePurchases,
    checkSubscriptionStatus,
    clearError,
  } = useSubscription();

  const [testStatus, setTestStatus] = useState<string>('');

  const runTest = async (testName: string, testFunction: () => Promise<void>) => {
    try {
      setTestStatus(`Running ${testName}...`);
      await testFunction();
      setTestStatus(`${testName} completed successfully`);
    } catch (error) {
      setTestStatus(`${testName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testInitialize = () => runTest('Initialize', initialize);
  const testLoadSubscriptions = () => runTest('Load Subscriptions', loadSubscriptions);
  const testRestorePurchases = () => runTest('Restore Purchases', restorePurchases);

  const testPurchaseMonthly = () => runTest('Purchase Monthly', () => 
    purchaseSubscription(SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION)
  );

  const testPurchaseAnnual = () => runTest('Purchase Annual', () => 
    purchaseSubscription(SUBSCRIPTION_PRODUCTS.ANNUAL_VERIFICATION)
  );

  const testCheckStatus = async () => {
    try {
      setTestStatus('Checking subscription status...');
      const status = await checkSubscriptionStatus(SUBSCRIPTION_PRODUCTS.MONTHLY_VERIFICATION);
      setTestStatus(`Status check completed: ${status ? 'Active' : 'Inactive'}`);
    } catch (error) {
      setTestStatus(`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Test Panel</Text>
        <Text style={styles.subtitle}>Test Google Play subscription functionality</Text>
      </View>

      {/* Status Display */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Initialized:</Text>
          <View style={[styles.statusIndicator, isInitialized ? styles.statusActive : styles.statusInactive]}>
            {isInitialized ? <CheckCircle size={16} color="#FFFFFF" /> : <XCircle size={16} color="#FFFFFF" />}
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Has Subscription:</Text>
          <View style={[styles.statusIndicator, hasActiveSubscription ? styles.statusActive : styles.statusInactive]}>
            {hasActiveSubscription ? <CheckCircle size={16} color="#FFFFFF" /> : <XCircle size={16} color="#FFFFFF" />}
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Loading:</Text>
          <View style={[styles.statusIndicator, isLoading ? styles.statusActive : styles.statusInactive]}>
            {isLoading ? <CheckCircle size={16} color="#FFFFFF" /> : <XCircle size={16} color="#FFFFFF" />}
          </View>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError} style={styles.clearErrorButton}>
            <Text style={styles.clearErrorText}>Clear Error</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Test Status */}
      {testStatus && (
        <View style={styles.testStatusContainer}>
          <Text style={styles.testStatusText}>{testStatus}</Text>
        </View>
      )}

      {/* Test Buttons */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Basic Tests</Text>
        
        <TouchableOpacity onPress={testInitialize} style={styles.testButton}>
          <Info size={20} color="#22C55E" />
          <Text style={styles.testButtonText}>Initialize Service</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={testLoadSubscriptions} style={styles.testButton}>
          <RefreshCw size={20} color="#22C55E" />
          <Text style={styles.testButtonText}>Load Subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={testRestorePurchases} style={styles.testButton}>
          <RefreshCw size={20} color="#22C55E" />
          <Text style={styles.testButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={testCheckStatus} style={styles.testButton}>
          <CheckCircle size={20} color="#22C55E" />
          <Text style={styles.testButtonText}>Check Status</Text>
        </TouchableOpacity>
      </View>

      {/* Purchase Tests */}
      <View style={styles.testSection}>
        <Text style={styles.sectionTitle}>Purchase Tests</Text>
        
        <TouchableOpacity onPress={testPurchaseMonthly} style={styles.purchaseButton}>
          <CreditCard size={20} color="#FFFFFF" />
          <Text style={styles.purchaseButtonText}>Test Monthly Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={testPurchaseAnnual} style={styles.purchaseButton}>
          <CreditCard size={20} color="#FFFFFF" />
          <Text style={styles.purchaseButtonText}>Test Annual Purchase</Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Info */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Subscription Info</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Available Subscriptions:</Text>
          <Text style={styles.infoValue}>{subscriptions.length}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Current Subscriptions:</Text>
          <Text style={styles.infoValue}>{currentSubscriptions.length}</Text>
        </View>

        {subscriptions.length > 0 && (
          <View style={styles.subscriptionList}>
            <Text style={styles.subscriptionListTitle}>Available Products:</Text>
            {subscriptions.map((sub, index) => (
              <View key={index} style={styles.subscriptionItem}>
                <Text style={styles.subscriptionId}>{sub.productId}</Text>
                <Text style={styles.subscriptionPrice}>{sub.title}</Text>
              </View>
            ))}
          </View>
        )}

        {currentSubscriptions.length > 0 && (
          <View style={styles.subscriptionList}>
            <Text style={styles.subscriptionListTitle}>Current Purchases:</Text>
            {currentSubscriptions.map((purchase, index) => (
              <View key={index} style={styles.subscriptionItem}>
                <Text style={styles.subscriptionId}>{purchase.productId}</Text>
                <Text style={styles.subscriptionPrice}>{purchase.productId}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusActive: {
    backgroundColor: '#22C55E',
  },
  statusInactive: {
    backgroundColor: '#EF4444',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    marginBottom: 8,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  clearErrorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  testStatusContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  testStatusText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#0369A1',
  },
  testSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#22C55E',
    marginLeft: 8,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#22C55E',
    borderRadius: 8,
    marginBottom: 8,
  },
  purchaseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
  subscriptionList: {
    marginTop: 12,
  },
  subscriptionListTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 4,
  },
  subscriptionId: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    flex: 1,
  },
  subscriptionPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
  },
});

export default SubscriptionTestComponent;
