import { supabase } from './supabaseClient';
import { ErrorHandler } from './errorHandler';

const errorHandler = ErrorHandler.getInstance();

interface BatchedRequest {
  id: string;
  type: 'user_profile' | 'user_rating' | 'listing_details' | 'ping_status';
  params: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface BatchResult {
  [requestId: string]: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

/**
 * Request batching utility for combining multiple small operations
 */
export class RequestBatcher {
  private static instance: RequestBatcher;
  private pendingRequests = new Map<string, BatchedRequest>();
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY = 50; // 50ms delay to collect requests
  private readonly MAX_BATCH_SIZE = 20; // Maximum requests per batch

  static getInstance(): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher();
    }
    return RequestBatcher.instance;
  }

  /**
   * Add a request to the batch queue
   */
  async addRequest<T>(
    type: BatchedRequest['type'],
    params: any,
    timeout = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const request: BatchedRequest = {
        id: requestId,
        type,
        params,
        resolve,
        reject
      };

      this.pendingRequests.set(requestId, request);

      // Set timeout for individual request
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timed out`));
      }, timeout);

      // Clear timeout when request is processed
      const originalResolve = request.resolve;
      request.resolve = (value) => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };

      // Schedule batch processing
      this.scheduleBatch();
    });
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) {
      return; // Already scheduled
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process the current batch of requests
   */
  private async processBatch(): Promise<void> {
    this.batchTimeout = null;

    if (this.pendingRequests.size === 0) {
      return;
    }

    const requests = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();

    // Group requests by type
    const groupedRequests = this.groupRequestsByType(requests);

    // Process each group
    for (const [type, typeRequests] of groupedRequests) {
      try {
        await this.processRequestGroup(type, typeRequests);
      } catch (error) {
        // Handle errors for this group
        typeRequests.forEach(request => {
          request.reject(error);
        });
      }
    }
  }

  /**
   * Group requests by type
   */
  private groupRequestsByType(requests: BatchedRequest[]): Map<string, BatchedRequest[]> {
    const grouped = new Map<string, BatchedRequest[]>();
    
    requests.forEach(request => {
      if (!grouped.has(request.type)) {
        grouped.set(request.type, []);
      }
      grouped.get(request.type)!.push(request);
    });

    return grouped;
  }

  /**
   * Process a group of requests of the same type
   */
  private async processRequestGroup(type: string, requests: BatchedRequest[]): Promise<void> {
    switch (type) {
      case 'user_profile':
        await this.processUserProfileBatch(requests);
        break;
      case 'user_rating':
        await this.processUserRatingBatch(requests);
        break;
      case 'listing_details':
        await this.processListingDetailsBatch(requests);
        break;
      case 'ping_status':
        await this.processPingStatusBatch(requests);
        break;
      default:
        // Unknown type, reject all requests
        requests.forEach(request => {
          request.reject(new Error(`Unknown request type: ${type}`));
        });
    }
  }

  /**
   * Process user profile batch requests
   */
  private async processUserProfileBatch(requests: BatchedRequest[]): Promise<void> {
    const usernames = requests.map(req => req.params.username).filter(Boolean);
    
    if (usernames.length === 0) {
      requests.forEach(req => req.resolve(null));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('username, name, avatar_url, email, phone, location_display, bio, verification_status, verified_at, expires_at')
        .in('username', usernames);

      if (error) {
        throw error;
      }

      const userMap = new Map();
      if (data) {
        data.forEach(user => {
          userMap.set(user.username, user);
        });
      }

      // Resolve each request
      requests.forEach(request => {
        const user = userMap.get(request.params.username);
        request.resolve(user || null);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Process user rating batch requests
   */
  private async processUserRatingBatch(requests: BatchedRequest[]): Promise<void> {
    const usernames = requests.map(req => req.params.username).filter(Boolean);
    
    if (usernames.length === 0) {
      requests.forEach(req => req.resolve(null));
      return;
    }

    try {
      // Optimized: Use batch function for 100k+ users
      // This reduces multiple individual function calls to 1 batch query
      // For 100k users: 600k queries/day → 100k queries/day (83% cost reduction)
      const { data, error } = await supabase
        .rpc('get_batch_user_rating_stats', { usernames: usernames });

      if (error) {
        throw error;
      }

      // Create rating map from batch results
      const ratingMap = new Map();
      
      if (data && data.length > 0) {
        data.forEach((item: { 
          rated_username: string; 
          average_rating: number; 
          total_ratings: number 
        }) => {
          if (item.total_ratings > 0) {
            ratingMap.set(item.rated_username, {
              rating: item.average_rating.toFixed(1),
              reviewCount: item.total_ratings
            });
          }
        });
      }

      // Resolve each request
      requests.forEach(request => {
        const rating = ratingMap.get(request.params.username);
        request.resolve(rating || null);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Process listing details batch requests
   */
  private async processListingDetailsBatch(requests: BatchedRequest[]): Promise<void> {
    const listingIds = requests.map(req => req.params.listingId).filter(Boolean);
    
    if (listingIds.length === 0) {
      requests.forEach(req => req.resolve(null));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, description, price, category, thumbnail_images, preview_images')
        .in('id', listingIds);

      if (error) {
        throw error;
      }

      const listingMap = new Map();
      if (data) {
        data.forEach(listing => {
          listingMap.set(listing.id, listing);
        });
      }

      // Resolve each request
      requests.forEach(request => {
        const listing = listingMap.get(request.params.listingId);
        request.resolve(listing || null);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Process ping status batch requests
   */
  private async processPingStatusBatch(requests: BatchedRequest[]): Promise<void> {
    const pingKeys = requests.map(req => `${req.params.senderUsername}_${req.params.listingId}`);
    
    if (pingKeys.length === 0) {
      requests.forEach(req => req.resolve(false));
      return;
    }

    try {
      const senderUsernames = [...new Set(requests.map(req => req.params.senderUsername))];
      const listingIds = [...new Set(requests.map(req => req.params.listingId))];

      const { data, error } = await supabase
        .from('pings')
        .select('sender_username, listing_id, status')
        .in('sender_username', senderUsernames)
        .in('listing_id', listingIds)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      const pingMap = new Set();
      if (data) {
        data.forEach(ping => {
          pingMap.add(`${ping.sender_username}_${ping.listing_id}`);
        });
      }

      // Resolve each request
      requests.forEach(request => {
        const key = `${request.params.senderUsername}_${request.params.listingId}`;
        request.resolve(pingMap.has(key));
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }

  /**
   * Get current batch statistics
   */
  getStats(): { pendingRequests: number; types: string[] } {
    const types = [...new Set(Array.from(this.pendingRequests.values()).map(req => req.type))];
    return {
      pendingRequests: this.pendingRequests.size,
      types
    };
  }

  /**
   * Clear all pending requests
   */
  clearPending(): void {
    this.pendingRequests.forEach(request => {
      request.reject(new Error('Batch cleared'));
    });
    this.pendingRequests.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Export singleton instance
export const requestBatcher = RequestBatcher.getInstance();
