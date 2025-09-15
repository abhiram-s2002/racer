/**
 * Verification utility functions
 * Helper functions for checking user verification status
 */


// Flexible type for verification check
interface VerificationUser {
  verification_status?: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
}

/**
 * Check if a user is currently verified (not expired)
 * @param user - User object with verification fields
 * @returns boolean - true if user is verified and not expired
 */
export function isUserVerified(user: VerificationUser | null | undefined): boolean {
  if (!user) return false;
  
  // Check if user has verification status
  if (user.verification_status !== 'verified') return false;
  
  // Check if verification has expired
  if (user.expires_at) {
    const now = new Date();
    const expiresAt = new Date(user.expires_at);
    return expiresAt > now;
  }
  
  // If no expiration date, consider verified
  return true;
}

/**
 * Get verification status for display
 * @param user - User object with verification fields
 * @returns 'verified' | 'not_verified'
 */
export function getVerificationStatus(user: VerificationUser | null | undefined): 'verified' | 'not_verified' {
  return isUserVerified(user) ? 'verified' : 'not_verified';
}

/**
 * Check if verification is expiring soon (within 7 days)
 * @param user - User object with verification fields
 * @returns boolean - true if verification expires within 7 days
 */
export function isVerificationExpiringSoon(user: VerificationUser | null | undefined): boolean {
  if (!user || !user.expires_at) return false;
  
  const now = new Date();
  const expiresAt = new Date(user.expires_at);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}
