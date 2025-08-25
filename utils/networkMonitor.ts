// Note: @react-native-community/netinfo needs to be installed
// npm install @react-native-community/netinfo

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
    // NetInfo listener added (mock)
  },
};

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  isWifi: boolean;
  isCellular: boolean;
  isEthernet: boolean;
}

export interface NetworkCallback {
  onConnectivityChange?: (status: NetworkStatus) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

class NetworkMonitor {
  private static instance: NetworkMonitor;
  private callbacks: NetworkCallback[] = [];
  private currentStatus: NetworkStatus | null = null;
  private isMonitoring = false;

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
      // Network monitoring initialization failed - this is expected in some environments
      // NetworkMonitor: Initialization failed (expected in some environments)
      
      // Set default offline status
      this.currentStatus = {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        isWifi: false,
        isCellular: false,
        isEthernet: false
      };
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
      isEthernet: type === 'ethernet'
    };
  }

  private startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Listen for network state changes
    NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });
  }

  private async handleNetworkChange(state: NetInfoState) {
    const previousStatus = this.currentStatus;
    const newStatus = this.parseNetworkState(state);
    
    this.currentStatus = newStatus;
    
    // Log network change
    // Network status changed silently
    
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
    // NetworkMonitor: Device went offline (expected behavior)
    
    // This is expected behavior, not an error
    // Just log as info and continue
  }

  private async handleOnline() {
    // Device came online
    
    // No connection quality testing needed
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
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      // Connection test failed - this is expected behavior, not an error
      // NetworkMonitor: Connection test failed (expected when offline)
      return false;
    }
  }

  public destroy() {
    this.isMonitoring = false;
    this.callbacks = [];
  }

  // Enable/disable verbose logging (useful for development)
  public setVerboseLogging(enabled: boolean) {
    if (enabled) {
      // NetworkMonitor: Verbose logging enabled
    } else {
      // NetworkMonitor: Verbose logging disabled
    }
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
export const setNetworkVerboseLogging = (enabled: boolean) => networkMonitor.setVerboseLogging(enabled); 