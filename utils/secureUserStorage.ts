declare var console: any;
import { SecureStorage, encryptPhoneNumber, decryptPhoneNumber } from './encryption';

/**
 * Secure User Storage with Encryption
 * Stores sensitive user data in encrypted format
 */
export class SecureUserStorage {
  private static readonly USERS_KEY = 'secure_users';
  private static readonly PHONE_NUMBERS_KEY = 'encrypted_phone_numbers';

  /**
   * Store user with encrypted sensitive data
   */
  static async storeSecureUser(user: any): Promise<void> {
    // Encrypt phone number
    const encryptedPhone = await encryptPhoneNumber(user.phoneNumber);
    
    // Create secure user object
    const secureUser = {
      ...user,
      phoneNumber: encryptedPhone, // Store encrypted phone
    };
    
    // Store in encrypted storage
    await SecureStorage.setEncryptedItem(`${this.USERS_KEY}_${user.id}`, secureUser);
  }

  /**
   * Get user with decrypted sensitive data
   */
  static async getSecureUser(username: string): Promise<any | null> {
    try {
      const secureUser = await SecureStorage.getEncryptedItem(`${this.USERS_KEY}_${username}`);
      if (!secureUser) return null;
      
      // Decrypt phone number
      const decryptedPhone = await decryptPhoneNumber(secureUser.phoneNumber);
      
      return {
        ...secureUser,
        phoneNumber: decryptedPhone,
      };
    } catch (error) {
      console.error('Error getting secure user:', error);
      return null;
    }
  }

  /**
   * Update user's sensitive data securely
   */
  static async updateSecureUser(username: string, updates: Partial<any>): Promise<void> {
    const existingUser = await this.getSecureUser(username);
    if (!existingUser) throw new Error('User not found');
    
    const updatedUser = { ...existingUser, ...updates };
    
    // Re-encrypt if phone number changed
    if (updates.phoneNumber && updates.phoneNumber !== existingUser.phoneNumber) {
      updatedUser.phoneNumber = await encryptPhoneNumber(updates.phoneNumber);
    }
    
    await this.storeSecureUser(updatedUser);
  }

  /**
   * Get user's phone number (decrypted)
   */
  static async getUserPhoneNumber(username: string): Promise<string | null> {
    const user = await this.getSecureUser(username);
    return user?.phoneNumber || null;
  }

  /**
   * Store encrypted phone number mapping
   */
  static async storePhoneNumberMapping(phoneNumber: string, username: string): Promise<void> {
    const encryptedPhone = await encryptPhoneNumber(phoneNumber);
    const mapping = { phoneNumber: encryptedPhone, username };
    await SecureStorage.setEncryptedItem(`${this.PHONE_NUMBERS_KEY}_${username}`, mapping);
  }

  /**
   * Find user by phone number (encrypted lookup)
   */
  static async findUserByPhoneNumber(phoneNumber: string): Promise<any | null> {
    try {
      // This is a simplified lookup - in production, you'd have an index
      
      // For demo purposes, we'll check against known users
      const knownUsernames = ['user_1', 'user_2', 'user_3'];
      
      for (const username of knownUsernames) {
        const user = await this.getSecureUser(username);
        if (user && user.phoneNumber === phoneNumber) {
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }

  /**
   * Delete secure user data
   */
  static async deleteSecureUser(username: string): Promise<void> {
    await SecureStorage.removeEncryptedItem(`${this.USERS_KEY}_${username}`);
    await SecureStorage.removeEncryptedItem(`${this.PHONE_NUMBERS_KEY}_${username}`);
  }

  /**
   * Get all secure users (for admin purposes)
   */
  static async getAllSecureUsers(): Promise<any[]> {
    try {
      const knownUsernames = ['user_1', 'user_2', 'user_3'];
      const users: any[] = [];
      
      for (const username of knownUsernames) {
        const user = await this.getSecureUser(username);
        if (user) {
          users.push(user);
        }
      }
      
      return users;
    } catch (error) {
      console.error('Error getting all secure users:', error);
      return [];
    }
  }

  /**
   * Test secure storage functionality
   */
  static async testSecureStorage(): Promise<boolean> {
    try {
      const testUser: any = {
        id: 'test_user',
        phoneNumber: '+1234567890',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg'
      };
      
      // Store user
      await this.storeSecureUser(testUser);
      
      // Retrieve user
      const retrievedUser = await this.getSecureUser('test_user');
      
      // Verify data integrity
      const isCorrect = retrievedUser !== null && 
                       retrievedUser.phoneNumber === testUser.phoneNumber &&
                       retrievedUser.name === testUser.name;
      
      // Clean up
      await this.deleteSecureUser('test_user');
      
      return isCorrect;
    } catch (error) {
      console.error('Secure storage test failed:', error);
      return false;
    }
  }
} 