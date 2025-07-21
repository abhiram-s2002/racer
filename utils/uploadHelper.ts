import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Helper utility for robust file uploads
 */
export class UploadHelper {
  /**
   * Convert any URI to a blob that can be uploaded
   */
  static async uriToBlob(uri: string): Promise<Blob> {
    try {
      console.log(`Converting URI to blob: ${uri.substring(0, 50)}...`);
      
      if (Platform.OS === 'web') {
        // Web platform: use fetch
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
      } else {
        // React Native: Use a simpler approach with fetch
        // This should work for file:// URIs in React Native
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }
        return await response.blob();
      }
    } catch (error) {
      console.error('Error converting URI to blob:', error);
      throw new Error(`Failed to convert URI to blob: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MIME type from URI
   */
  private static getMimeTypeFromUri(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg'; // Default fallback
    }
  }

  /**
   * Validate if URI is accessible
   */
  static async validateUri(uri: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri, { method: 'HEAD' });
        return response.ok;
      } else {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        return fileInfo.exists;
      }
    } catch (error) {
      console.error('Error validating URI:', error);
      return false;
    }
  }

  /**
   * Get file size from URI
   */
  static async getFileSize(uri: string): Promise<number> {
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(uri, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
      } else {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        return (fileInfo as any).size || 0;
      }
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }
} 