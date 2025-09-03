import { Environment } from './environment';
import * as Crypto from 'expo-crypto';

/**
 * Google Analytics Configuration
 * Analytics and user behavior tracking using Measurement Protocol
 */

interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
}

class GoogleAnalyticsService {
  private static instance: GoogleAnalyticsService;
  private isInitialized = false;
  private measurementId: string = '';
  private clientId: string = '';
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  static getInstance(): GoogleAnalyticsService {
    if (!GoogleAnalyticsService.instance) {
      GoogleAnalyticsService.instance = new GoogleAnalyticsService();
    }
    return GoogleAnalyticsService.instance;
  }

  /**
   * Initialize Google Analytics
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const trackingId = Environment.googleAnalyticsId;
    
    // For development, use the hardcoded Measurement ID if environment variable is not available
    const developmentId = 'G-1RN9LQFY3G';
    const finalId = trackingId || (Environment.isDevelopment ? developmentId : undefined);
    
    if (!finalId || finalId.includes('your-google-analytics-id')) {
      console.log('Google Analytics tracking ID not provided, skipping initialization');
      return;
    }

    try {
      this.measurementId = finalId;
      this.clientId = await this.generateClientId();
      this.isInitialized = true;
      
      // Start periodic flush
      this.startFlushTimer();
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  /**
   * Generate a unique client ID
   */
  private async generateClientId(): Promise<string> {
    try {
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const timestamp = Date.now();
      return `${timestamp}.${randomBytes.toString('hex')}`;
    } catch (error) {
      // Fallback to simple timestamp-based ID
      return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Send events to Google Analytics using Measurement Protocol
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    // For development, just simulate success without logging
    if (Environment.isDevelopment) {
      return;
    }

    // Production: Send to Google Analytics
    try {
      const payload = {
        client_id: this.clientId,
        events: events
      };

      const response = await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        console.log('✅ Google Analytics Events sent successfully:', events.length, 'events');
      } else {
        console.warn('❌ Failed to send analytics events:', response.status, response.statusText);
        // Re-queue events for retry
        this.eventQueue.unshift(...events);
      }
    } catch (error) {
      console.warn('❌ Error sending analytics events:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Add event to queue
   */
  private addEvent(eventName: string, parameters?: Record<string, any>): void {
    if (!this.isInitialized) return;

    const event: AnalyticsEvent = {
      name: eventName,
      parameters: {
        ...parameters,
        timestamp_micros: Date.now() * 1000,
      }
    };

    this.eventQueue.push(event);

    // Flush immediately for important events
    if (['user_registration', 'user_login', 'listing_created'].includes(eventName)) {
      this.flushEvents();
    }
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName: string): void {
    this.addEvent('page_view', {
      page_title: screenName,
      page_location: `/${screenName.toLowerCase().replace(/\s+/g, '_')}`
    });
  }

  /**
   * Track custom event
   */
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    this.addEvent('custom_event', {
      event_category: category,
      event_action: action,
      event_label: label,
      value: value
    });
  }

  /**
   * Track user property
   */
  setUserProperty(property: string, value: string): void {
    this.addEvent('user_property', {
      property_name: property,
      property_value: value
    });
  }

  /**
   * Track user ID
   */
  setUserId(userId: string): void {
    this.addEvent('user_id_set', {
      user_id: userId
    });
  }

  /**
   * Track timing
   */
  trackTiming(category: string, variable: string, time: number, label?: string): void {
    this.addEvent('timing', {
      timing_category: category,
      timing_variable: variable,
      timing_value: time,
      timing_label: label
    });
  }

  /**
   * Track ecommerce transaction
   */
  trackPurchase(transactionId: string, affiliation: string, revenue: number, tax: number, shipping: number, currency: string): void {
    this.addEvent('purchase', {
      transaction_id: transactionId,
      affiliation: affiliation,
      value: revenue,
      tax: tax,
      shipping: shipping,
      currency: currency
    });
  }

  /**
   * Track app-specific events
   */
  trackListingView(listingId: string, category: string, price: number): void {
    this.addEvent('listing_view', {
      listing_id: listingId,
      listing_category: category,
      listing_price: price
    });
  }

  trackPingSent(receiverUsername: string): void {
    this.addEvent('ping_sent', {
      receiver_username: receiverUsername
    });
  }

  trackPingAccepted(senderUsername: string): void {
    this.addEvent('ping_accepted', {
      sender_username: senderUsername
    });
  }

  trackPingRejected(senderUsername: string): void {
    this.addEvent('ping_rejected', {
      sender_username: senderUsername
    });
  }

  trackListingCreated(category: string, price: number): void {
    this.addEvent('listing_created', {
      listing_category: category,
      listing_price: price
    });
  }

  trackUserRegistration(): void {
    this.addEvent('user_registration', {});
  }

  trackUserLogin(): void {
    this.addEvent('user_login', {});
  }

  trackSearch(query: string, resultsCount: number): void {
    this.addEvent('search_query', {
      search_term: query,
      results_count: resultsCount
    });
  }

  trackFilterUsed(filterType: string, filterValue: string): void {
    this.addEvent('filter_used', {
      filter_type: filterType,
      filter_value: filterValue
    });
  }

  /**
   * Manually flush events (for testing)
   */
  async flushNow(): Promise<void> {
    await this.flushEvents();
  }

  /**
   * Get current event queue size (for testing)
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }
}

// Export singleton instance
export const googleAnalytics = GoogleAnalyticsService.getInstance();

// Export convenience functions
export const trackScreenView = (screenName: string) => googleAnalytics.trackScreenView(screenName);
export const trackEvent = (category: string, action: string, label?: string, value?: number) => 
  googleAnalytics.trackEvent(category, action, label, value);
export const trackListingView = (listingId: string, category: string, price: number) => 
  googleAnalytics.trackListingView(listingId, category, price);
export const trackPingSent = (receiverUsername: string) => googleAnalytics.trackPingSent(receiverUsername);
export const trackPingAccepted = (senderUsername: string) => googleAnalytics.trackPingAccepted(senderUsername);
export const trackPingRejected = (senderUsername: string) => googleAnalytics.trackPingRejected(senderUsername);
export const trackListingCreated = (category: string, price: number) => 
  googleAnalytics.trackListingCreated(category, price);
export const trackUserRegistration = () => googleAnalytics.trackUserRegistration();
export const trackUserLogin = () => googleAnalytics.trackUserLogin();
export const trackSearch = (query: string, resultsCount: number) => 
  googleAnalytics.trackSearch(query, resultsCount);
export const trackFilterUsed = (filterType: string, filterValue: string) => 
  googleAnalytics.trackFilterUsed(filterType, filterValue);
