/**
 * Utility functions for handling bio with social media links
 * Stores social links as JSON within the bio field for flexibility
 */

export interface BioData {
  text: string;
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
  };
}

/**
 * Parse bio string to extract text and social links
 * Handles both old plain text format and new JSON format
 */
export function parseBio(bioString: string | null | undefined): BioData {
  if (!bioString) {
    return { text: '' };
  }

  try {
    // Try to parse as JSON first (new format)
    const parsed = JSON.parse(bioString);
    if (parsed.text !== undefined) {
      return parsed as BioData;
    }
  } catch {
    // Not JSON, treat as plain text (legacy format)
  }

  // Legacy format - return as plain text
  return { text: bioString };
}

/**
 * Convert BioData to string for database storage
 */
export function stringifyBio(bioData: BioData): string {
  // If no social links, just store as plain text for simplicity
  if (!bioData.socialLinks || Object.keys(bioData.socialLinks).length === 0) {
    return bioData.text;
  }

  // Store as JSON if there are social links
  return JSON.stringify(bioData);
}

/**
 * Validate social media URL
 */
export function validateSocialUrl(url: string, platform: 'instagram' | 'youtube' | 'facebook'): boolean {
  if (!url.trim()) return true; // Empty is valid (optional field)
  
  const patterns = {
    instagram: /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/,
    youtube: /^https?:\/\/(www\.)?(youtube\.com\/(c\/|channel\/|@)?|youtu\.be\/)[a-zA-Z0-9._-]+\/?$/,
    facebook: /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/
  };

  return patterns[platform].test(url.trim());
}

/**
 * Format social media URL for display
 */
export function formatSocialUrl(url: string, platform: 'instagram' | 'youtube' | 'facebook'): string {
  if (!url.trim()) return '';
  
  let formatted = url.trim();
  
  // Ensure it has protocol
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = 'https://' + formatted;
  }
  
  return formatted;
}

/**
 * Extract username from social media URL for display
 */
export function extractSocialUsername(url: string, platform: 'instagram' | 'youtube' | 'facebook'): string {
  if (!url.trim()) return '';
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    
    switch (platform) {
      case 'instagram':
        return urlObj.pathname.replace('/', '');
      case 'youtube':
        // Handle different YouTube URL formats
        if (urlObj.pathname.startsWith('/@')) {
          return urlObj.pathname.replace('/@', '');
        } else if (urlObj.pathname.startsWith('/c/')) {
          return urlObj.pathname.replace('/c/', '');
        } else if (urlObj.pathname.startsWith('/channel/')) {
          return urlObj.pathname.replace('/channel/', '');
        }
        return urlObj.pathname.replace('/', '');
      case 'facebook':
        return urlObj.pathname.replace('/', '');
      default:
        return '';
    }
  } catch {
    return url;
  }
}

/**
 * Get social media platform icon (you can replace with actual icons)
 */
export function getSocialIcon(platform: 'instagram' | 'youtube' | 'facebook'): string {
  const icons = {
    instagram: '📷',
    youtube: '📺', 
    facebook: '👥'
  };
  return icons[platform];
}

