import { ErrorHandler, ErrorType, ErrorSeverity } from './errorHandler';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  lastChecked: number;
}

export interface NetworkCallback {
  onConnectivityChange?: (status: NetworkStatus) => void;
  onConnectionQualityChange?: (quality: NetworkStatus['connectionQuality']) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

class EnhancedNetworkMonitor {
  private static instance: EnhancedNetworkMonitor;
  private errorHandler = ErrorHandler.getInstance();
  private callbacks: NetworkCallback[] = [];
  private currentStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    connectionQuality: 'unknown',
    lastChecked: Date.now(),
  };
  private isMonitoring = false;
  private checkInterval: any | null = null;
  private lastKnownStatus: NetworkStatus | null = null;

  static getInstance(): EnhancedNetworkMonitor {
    if (!EnhancedNetworkMonitor.instance) {
      EnhancedNetworkMonitor.instance = new EnhancedNetworkMonitor();
    }
    return EnhancedNetworkMonitor.instance;
  }

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  private async initializeNetworkMonitoring() {
    try {
      // Get initial network state
      await this.checkNetworkStatus();
      
      // Start monitoring
      this.startMonitoring();
    } catch (error) {
      await this.errorHandler.handleSilentError(error, {
        operation: 'enhanced_network_monitor_init',
        component: 'EnhancedNetworkMonitor',
      });
    }
  }

  private async checkNetworkStatus(): Promise<NetworkStatus> {
    const startTime = Date.now();
    let isConnected = false;
    let connectionQuality: NetworkStatus['connectionQuality'] = 'unknown';
    let type: NetworkStatus['type'] = 'unknown';

    try {
      // Test multiple endpoints for better reliability
      const testUrls = [
        'https://www.google.com',
        'https://www.cloudflare.com',
        'https://httpbin.org/status/200'
      ];

      let successfulTests = 0;
      let totalResponseTime = 0;

      for (const url of testUrls) {
        try {
          const testStart = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            successfulTests++;
            totalResponseTime += Date.now() - testStart;
          }
        } catch (error) {
          // Continue testing other URLs
          continue;
        }
      }

      // Determine connection status
      isConnected = successfulTests > 0;
      
      if (isConnected) {
        // Determine connection quality based on response time
        const avgResponseTime = totalResponseTime / successfulTests;
        if (avgResponseTime < 500) {
          connectionQuality = 'excellent';
        } else if (avgResponseTime < 2000) {
          connectionQuality = 'good';
        } else {
          connectionQuality = 'poor';
        }

        // Try to determine connection type (basic detection)
        type = await this.detectConnectionType();
      }

    } catch (error) {
      console.error('Network check failed:', error);
      isConnected = false;
      connectionQuality = 'unknown';
    }

    const newStatus: NetworkStatus = {
      isConnected,
      isInternetReachable: isConnected,
      type,
      connectionQuality,
      lastChecked: Date.now(),
    };

    // Update status and notify callbacks if changed
    this.updateStatus(newStatus);

    return newStatus;
  }

  private async detectConnectionType(): Promise<NetworkStatus['type']> {
    try {
      // Basic connection type detection using navigator.connection (if available)
      if (typeof navigator !== 'undefined' && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType) {
          // This is a web API, but gives us some insight
          if (connection.effectiveType.includes('4g') || connection.effectiveType.includes('5g')) {
            return 'cellular';
          }
        }
      }

      // For React Native, we could use other methods
      // For now, return unknown and let the app determine based on context
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private updateStatus(newStatus: NetworkStatus) {
    const previousStatus = this.currentStatus;
    this.currentStatus = newStatus;

    // Check if status actually changed
    const statusChanged = 
      previousStatus.isConnected !== newStatus.isConnected ||
      previousStatus.connectionQuality !== newStatus.connectionQuality ||
      previousStatus.type !== newStatus.type;

    if (statusChanged) {
      console.log('Network status changed:', {
        from: {
          connected: previousStatus.isConnected,
          quality: previousStatus.connectionQuality,
          type: previousStatus.type
        },
        to: {
          connected: newStatus.isConnected,
          quality: newStatus.connectionQuality,
          type: newStatus.type
        }
      });

      // Notify callbacks
      this.callbacks.forEach(callback => {
        if (callback.onConnectivityChange) {
          callback.onConnectivityChange(newStatus);
        }
        
        // Check if connection status changed
        if (previousStatus.isConnected !== newStatus.isConnected) {
          if (!newStatus.isConnected && callback.onOffline) {
            callback.onOffline();
          } else if (newStatus.isConnected && callback.onOnline) {
            callback.onOnline();
          }
        }
        
        // Check if connection quality changed
        if (previousStatus.connectionQuality !== newStatus.connectionQuality) {
          if (callback.onConnectionQualityChange) {
            callback.onConnectionQualityChange(newStatus.connectionQuality);
          }
        }
      });
    }
  }

  private startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Check network status every 10 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkNetworkStatus();
    }, 10000);

    // Also check when app becomes active (if possible)
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    // For React Native, you could use AppState
    // For now, we'll rely on the interval
    console.log('Network monitoring started');
  }

  // Public methods
  public getCurrentStatus(): NetworkStatus {
    return this.currentStatus;
  }

  public isOnline(): boolean {
    return this.currentStatus.isConnected;
  }

  public isOffline(): boolean {
    return !this.isOnline();
  }

  public getConnectionQuality(): NetworkStatus['connectionQuality'] {
    return this.currentStatus.connectionQuality;
  }

  public getConnectionType(): NetworkStatus['type'] {
    return this.currentStatus.type;
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

  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
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

  public async forceCheck(): Promise<NetworkStatus> {
    return await this.checkNetworkStatus();
  }

  public async testConnection(url: string = 'https://www.google.com'): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch (error) {
      await this.errorHandler.handleSilentError(error, {
        operation: 'connection_test',
        component: 'EnhancedNetworkMonitor',
      });
      return false;
    }
  }

  public destroy() {
    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.callbacks = [];
  }
}

// Export singleton instance
export const enhancedNetworkMonitor = EnhancedNetworkMonitor.getInstance();

// Export convenience functions
export const isOnline = () => enhancedNetworkMonitor.isOnline();
export const isOffline = () => enhancedNetworkMonitor.isOffline();
export const getNetworkStatus = () => enhancedNetworkMonitor.getCurrentStatus();
export const waitForConnection = (timeoutMs?: number) => enhancedNetworkMonitor.waitForConnection(timeoutMs);
export const testConnection = (url?: string) => enhancedNetworkMonitor.testConnection(url);
export const forceCheckNetwork = () => enhancedNetworkMonitor.forceCheck(); 