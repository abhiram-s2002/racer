// TypeScript module declarations for missing types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { encode as btoa, decode as atob } from 'base-64';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { TextEncoder, TextDecoder } from 'text-encoding';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare let console: Console;

// Remove all previous globalThis/Buffer/require polyfills
// Use imported btoa, atob, TextEncoder, and TextDecoder directly in the code

const ENCRYPTION_KEY = 'omnimart_encryption_key_2024';
const SALT = 'omnimart_salt_2024';

/**
 * Generate a secure encryption key
 */
export async function generateEncryptionKey(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input + SALT
  );
}

/**
 * Encrypt text data
 */
export async function encryptText(text: string, key?: string): Promise<string> {
  if (!text) return '';
  
  const encryptionKey = key || ENCRYPTION_KEY;
  const textBytes = new TextEncoder().encode(text);
  const keyBytes = new TextEncoder().encode(encryptionKey);
  
  // Simple XOR encryption (for demonstration - use stronger encryption in production)
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypt text data
 */
export async function decryptText(encryptedText: string, key?: string): Promise<string> {
  if (!encryptedText) return '';
  
  try {
    const encryptionKey = key || ENCRYPTION_KEY;
    const keyBytes = new TextEncoder().encode(encryptionKey);
    
    // Convert from base64
    const encrypted = new Uint8Array(
      atob(encryptedText).split('').map((char: string) => char.charCodeAt(0))
    );
    
    // XOR decryption
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
          // Decryption failed
    return '';
  }
}

/**
 * Encrypt sensitive user data
 */
export async function encryptUserData(data: any): Promise<string> {
  const jsonString = JSON.stringify(data);
  return await encryptText(jsonString);
}

/**
 * Decrypt sensitive user data
 */
export async function decryptUserData(encryptedData: string): Promise<any> {
  const decrypted = await decryptText(encryptedData);
  try {
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

/**
 * Encrypt phone number
 */
export async function encryptPhoneNumber(phone: string): Promise<string> {
  return await encryptText(phone);
}

/**
 * Decrypt phone number
 */
export async function decryptPhoneNumber(encryptedPhone: string): Promise<string> {
  return await decryptText(encryptedPhone);
}

/**
 * Encrypt message content
 */
export async function encryptMessage(message: string): Promise<string> {
  return await encryptText(message);
}

/**
 * Decrypt message content
 */
export async function decryptMessage(encryptedMessage: string): Promise<string> {
  return await decryptText(encryptedMessage);
}

/**
 * Secure storage wrapper with encryption
 */
export class SecureStorage {
  /**
   * Store encrypted data
   */
  static async setEncryptedItem(key: string, value: any): Promise<void> {
    const encrypted = await encryptUserData(value);
    await AsyncStorage.setItem(key, encrypted);
  }

  /**
   * Get and decrypt data
   */
  static async getEncryptedItem(key: string): Promise<any> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return await decryptUserData(encrypted);
  }

  /**
   * Remove encrypted item
   */
  static async removeEncryptedItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  /**
   * Store encrypted user profile
   */
  static async setEncryptedUserProfile(username: string, profile: any): Promise<void> {
    const key = `encrypted_user_${username}`;
    await this.setEncryptedItem(key, profile);
  }

  /**
   * Get encrypted user profile
   */
  static async getEncryptedUserProfile(username: string): Promise<any> {
    const key = `encrypted_user_${username}`;
    return await this.getEncryptedItem(key);
  }

  /**
   * Store encrypted messages
   */
  static async setEncryptedMessages(chatId: string, messages: any[]): Promise<void> {
    const key = `encrypted_messages_${chatId}`;
    await this.setEncryptedItem(key, messages);
  }

  /**
   * Get encrypted messages
   */
  static async getEncryptedMessages(chatId: string): Promise<any[]> {
    const key = `encrypted_messages_${chatId}`;
    const messages = await this.getEncryptedItem(key);
    return messages || [];
  }
}

/**
 * Password hashing utilities
 */
export class PasswordUtils {
  /**
   * Hash a password for storage
   */
  static async hashPassword(password: string): Promise<string> {
    return await hashString(password);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashString(password);
    return passwordHash === hash;
  }

  /**
   * Generate a secure password
   */
  static generateSecurePassword(length = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}

/**
 * Data masking utilities
 */
export class DataMasking {
  /**
   * Mask phone number for display
   */
  static maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 4) return phone;
    const last4 = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4);
    return masked + last4;
  }

  /**
   * Mask email address for display
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    const maskedLocal = local.slice(0, 2) + '*'.repeat(local.length - 2);
    return maskedLocal + '@' + domain;
  }

  /**
   * Mask credit card number
   */
  static maskCreditCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4);
    return masked + last4;
  }
}

/**
 * Encryption test utilities
 */
export class EncryptionTest {
  /**
   * Test encryption/decryption
   */
  static async testEncryption(): Promise<boolean> {
    try {
      const originalText = 'Hello, this is a test message!';
      const encrypted = await encryptText(originalText);
      const decrypted = await decryptText(encrypted);
      return originalText === decrypted;
    } catch (error) {
      // Encryption test failed
      return false;
    }
  }

  /**
   * Test user data encryption
   */
  static async testUserDataEncryption(): Promise<boolean> {
    try {
      const userData = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com'
      };
      const encrypted = await encryptUserData(userData);
      const decrypted = await decryptUserData(encrypted);
      return JSON.stringify(userData) === JSON.stringify(decrypted);
    } catch (error) {
      // User data encryption test failed
      return false;
    }
  }
} 