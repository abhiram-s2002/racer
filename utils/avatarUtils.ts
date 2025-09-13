/**
 * Avatar utility functions for consistent avatar display across the app
 */

import defaultAvatar from '../assets/images/icon.png';

/**
 * Get the appropriate avatar source for display
 * @param avatarUrl - The avatar URL from the database (could be uploaded image or pixel art)
 * @returns Image source object for React Native Image component
 */
export function getAvatarSource(avatarUrl?: string | null) {
  if (!avatarUrl) {
    return defaultAvatar;
  }
  
  // If it's a pixel art URL or any other URL, use it directly
  return { uri: avatarUrl };
}

/**
 * Get avatar source with fallback to default
 * @param avatarUrl - The avatar URL from the database
 * @param fallbackUrl - Optional fallback URL (e.g., pixel art)
 * @returns Image source object for React Native Image component
 */
export function getAvatarSourceWithFallback(avatarUrl?: string | null, fallbackUrl?: string) {
  if (avatarUrl) {
    return { uri: avatarUrl };
  }
  
  if (fallbackUrl) {
    return { uri: fallbackUrl };
  }
  
  return defaultAvatar;
}

/**
 * Check if an avatar URL is a pixel art URL
 * @param avatarUrl - The avatar URL to check
 * @returns boolean indicating if it's a pixel art URL
 */
export function isPixelArtAvatar(avatarUrl?: string | null): boolean {
  return avatarUrl?.includes('dicebear.com') || avatarUrl?.includes('pixel-art') || false;
}

/**
 * Check if an avatar URL is an uploaded image
 * @param avatarUrl - The avatar URL to check
 * @returns boolean indicating if it's an uploaded image
 */
export function isUploadedAvatar(avatarUrl?: string | null): boolean {
  return avatarUrl?.includes('avatars/') || false;
}
