// Note: @react-native-community/netinfo needs to be installed
// npm install @react-native-community/netinfo
import { ErrorHandler } from './errorHandler';

// Temporary interface until netinfo is installed
interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
  details?: any;
}

// Temporary NetInfo mock until package is installed
const NetInfo = {
  fetch: async (): Promise<NetInfoState> => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: (callback: (state: NetInfoState) => void) => {
    // Mock implementation
    console.log('NetInfo listener added (mock)');
  },
};

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
  isEthernet: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
}

export interface NetworkCallback {
  onConnectivityChange?: (status: NetworkStatus) => void;
  onConnectionQualityChange?: (quality: NetworkStatus['connectionQuality']) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

class NetworkMonitor {
  private static instance: NetworkMonitor;
  private errorHandler = ErrorHandler.getInstance();
  private callbacks: NetworkCallback[] = [];
  private currentStatus: NetworkStatus | null = null;
  private isMonitoring = false;
  private connectionTestInterval: any | null = null;

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  private async initializeNetworkMonitoring() {
    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.currentStatus = this.parseNetworkState(state);
      
      // Start monitoring
      this.startMonitoring();
    } catch (error) {
      await this.errorHandler.handleSilentError(error, {
        operation: 'network_monitor_init',
        component: 'NetworkMonitor',
      });
    }
  }

  private parseNetworkState(state: NetInfoState): NetworkStatus {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable;
    const type = state.type || 'unknown';
    
    return {
      isConnected,
      isInternetReachable,
      type,
      isWifi: type === 'wifi',
      isCellular: type === 'cellular',
      isEthernet: type === 'ethernet',
      connectionQuality: this.determineConnectionQuality(state),
    };
  }

  private determineConnectionQuality(state: NetInfoState): NetworkStatus['connectionQuality'] {
    if (!state.isConnected) return 'unknown';
    
    // For WiFi, check signal strength if available
    if (state.type === 'wifi' && state.details) {
      const wifiDetails = state.details as any;
      if (wifiDetails.strength !== undefined) {
        if (wifiDetails.strength >= 80) return 'excellent';
        if (wifiDetails.strength >= 60) return 'good';
        return 'poor';
      }
    }
    
    // For cellular, check generation if available
    if (state.type === 'cellular' && state.details) {
      const cellularDetails = state.details as any;
      if (cellularDetails.cellularGeneration) {
        if (['5g', '4g'].includes(cellularDetails.cellularGeneration)) return 'excellent';
        if (['3g'].includes(cellularDetails.cellularGeneration)) return 'good';
        return 'poor';
      }
    }
    
    // Default based on connection type
    if (state.type === 'wifi' || state.type === 'ethernet') return 'good';
    if (state.type === 'cellular') return 'good';
    
    return 'unknown';
  }

  private startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Listen for network state changes
    NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
    
    // Start connection quality monitoring
    this.startConnectionQualityMonitoring();
  }

  private async handleNetworkChange(state: NetInfoState) {
    const previousStatus = this.currentStatus;
    const newStatus = this.parseNetworkState(state);
    
    this.currentStatus = newStatus;
    
    // Log network change
    console.log('Network status changed:', {
      from: previousStatus?.isConnected,
      to: newStatus.isConnected,
      type: newStatus.type,
      quality: newStatus.connectionQuality,
    });
    
    // Notify callbacks
    this.callbacks.forEach(callback => {
      if (callback.onConnectivityChange) {
        callback.onConnectivityChange(newStatus);
      }
      
      // Check if connection status changed
      if (previousStatus?.isConnected !== newStatus.isConnected) {
        if (!newStatus.isConnected && callback.onOffline) {
          callback.onOffline();
        } else if (newStatus.isConnected && callback.onOnline) {
          callback.onOnline();
        }
      }
      
      // Check if connection quality changed
      if (previousStatus?.connectionQuality !== newStatus.connectionQuality) {
        if (callback.onConnectionQualityChange) {
          callback.onConnectionQualityChange(newStatus.connectionQuality);
        }
      }
    });
    
    // Handle offline scenario
    if (!newStatus.isConnected && previousStatus?.isConnected) {
      await this.handleOffline();
    }
    
    // Handle online scenario
    if (newStatus.isConnected && !previousStatus?.isConnected) {
      await this.handleOnline();
    }
  }

  private async handleOffline() {
    console.log('Device went offline');
    
    await this.errorHandler.handleSilentError(
      new Error('Network connection lost'),
      {
        operation: 'network_offline',
        component: 'NetworkMonitor',
      }
    );
  }

  private async handleOnline() {
    console.log('Device came online');
    
    // Test connection quality
    await this.testConnectionQuality();
  }

  private startConnectionQualityMonitoring() {
    // Test connection quality every 30 seconds
    this.connectionTestInterval = setInterval(async () => {
      if (this.currentStatus?.isConnected) {
        await this.testConnectionQuality();
      }
    }, 30000);
  }

  private async testConnectionQuality() {
    try {
      const startTime = Date.now();
      
      // Test with a small request
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Determine quality based on response time
      let quality: NetworkStatus['connectionQuality'] = 'unknown';
      if (responseTime < 500) quality = 'excellent';
      else if (responseTime < 2000) quality = 'good';
      else quality = 'poor';
      
      // Update current status if quality changed
      if (this.currentStatus && this.currentStatus.connectionQuality !== quality) {
        this.currentStatus.connectionQuality = quality;
        
        this.callbacks.forEach(callback => {
          if (callback.onConnectionQualityChange) {
            callback.onConnectionQualityChange(quality);
          }
        });
      }
    } catch (error) {
      // Connection test failed, mark as poor quality
      if (this.currentStatus) {
        this.currentStatus.connectionQuality = 'poor';
      }
      
      await this.errorHandler.handleSilentError(error, {
        operation: 'connection_quality_test',
        component: 'NetworkMonitor',
      });
    }
  }

  // Public methods
  public getCurrentStatus(): NetworkStatus | null {
    return this.currentStatus;
  }

  public isOnline(): boolean {
    return this.currentStatus?.isConnected ?? false;
  }

  public isOffline(): boolean {
    return !this.isOnline();
  }

  public getConnectionQuality(): NetworkStatus['connectionQuality'] {
    return this.currentStatus?.connectionQuality ?? 'unknown';
  }

  public addCallback(callback: NetworkCallback): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  public async waitForConnection(timeoutMs = 30000): Promise<boolean> {
    if (this.isOnline()) return true;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeoutMs);
      
      const unsubscribe = this.addCallback({
        onOnline: () => {
          clearTimeout(timeout);
          unsubscribe();
          resolve(true);
        },
      });
    });
  }

  public async testConnection(url = 'https://www.google.com'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      await this.errorHandler.handleSilentError(error, {
        operation: 'connection_test',
        component: 'NetworkMonitor',
      });
      return false;
    }
  }

  public destroy() {
    this.isMonitoring = false;
    
    if (this.connectionTestInterval) {
      clearInterval(this.connectionTestInterval);
      this.connectionTestInterval = null;
    }
    
    this.callbacks = [];
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();

// Export convenience functions
export const isOnline = () => networkMonitor.isOnline();
export const isOffline = () => networkMonitor.isOffline();
export const getNetworkStatus = () => networkMonitor.getCurrentStatus();
export const waitForConnection = (timeoutMs?: number) => networkMonitor.waitForConnection(timeoutMs);
export const testConnection = (url?: string) => networkMonitor.testConnection(url); 