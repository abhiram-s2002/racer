// Secure storage via encryption module
import { cacheManager } from './cacheManager';

interface SecureCacheConfig {
  namespace: string;
  ttl?: number; // Time to live in seconds, defaults to 1 hour
}

class SecureCache {
  private namespace: string;
  private ttl: number;

  constructor(config: SecureCacheConfig) {
    this.namespace = config.namespace;
    this.ttl = config.ttl || 3600; // Default 1 hour TTL
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Store encrypted data in secure storage
   */
  async set<T>(key: string, data: T): Promise<void> {
    await cacheManager.set(this.getKey(key), data, 'USER');
  }

  /**
   * Retrieve and decrypt data from secure storage
   */
  async get<T>(key: string): Promise<T | null> {
    return await cacheManager.get<T>(this.getKey(key), 'USER');
  }

  /**
   * Remove data from secure storage
   */
  async remove(key: string): Promise<void> {
    await cacheManager.remove(this.getKey(key), 'USER');
  }

  /**
   * Clear all data for this namespace
   */
  async clear(): Promise<void> {
    await cacheManager.clear('USER');
  }

  /**
   * Store user profile securely
   */
  async setUserProfile(username: string, profile: any): Promise<void> {
    await this.set(`profile:${username}`, profile);
  }

  /**
   * Get user profile from secure storage
   */
  async getUserProfile(username: string): Promise<any> {
    return await this.get(`profile:${username}`);
  }

  /**
   * Store authentication tokens securely
   */
  async setAuthTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await this.set('auth:tokens', tokens);
  }

  /**
   * Get authentication tokens from secure storage
   */
  async getAuthTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    return await this.get('auth:tokens');
  }

  /**
   * Store sensitive app settings
   */
  async setSecureSettings(settings: any): Promise<void> {
    await this.set('app:secure_settings', settings);
  }

  /**
   * Get sensitive app settings
   */
  async getSecureSettings(): Promise<any> {
    return await this.get('app:secure_settings');
  }

  /**
   * Store encrypted messages
   */
  async setEncryptedMessages(chatId: string, messages: any[]): Promise<void> {
    await this.set(`messages:${chatId}`, messages);
  }

  /**
   * Get encrypted messages
   */
  async getEncryptedMessages(chatId: string): Promise<any[]> {
    const messages = await this.get<any[]>(`messages:${chatId}`);
    return messages || [];
  }

  /**
   * Store payment information securely
   */
  async setPaymentInfo(userId: string, paymentInfo: any): Promise<void> {
    await this.set(`payment:${userId}`, paymentInfo);
  }

  /**
   * Get payment information
   */
  async getPaymentInfo(userId: string): Promise<any> {
    return await this.get(`payment:${userId}`);
  }
}

// Create instances for different types of secure data
export const userSecureCache = new SecureCache({ namespace: 'user', ttl: 86400 }); // 24 hours
export const authSecureCache = new SecureCache({ namespace: 'auth', ttl: 3600 }); // 1 hour
export const messageSecureCache = new SecureCache({ namespace: 'messages', ttl: 7200 }); // 2 hours
export const paymentSecureCache = new SecureCache({ namespace: 'payment', ttl: 3600 }); // 1 hour 