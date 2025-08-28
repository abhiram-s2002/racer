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
      // React Native: Use fetch for file:// URIs
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      // Error converting URI to blob
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
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      // Error validating URI
      return false;
    }
  }

  /**
   * Get file size from URI
   */
  static async getFileSize(uri: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return (fileInfo as any).size || 0;
    } catch (error) {
      // Error getting file size
      return 0;
    }
  }
} 