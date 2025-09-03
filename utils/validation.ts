/* global console */
/**
 * Input Validation Utilities for OmniMart
 * Provides security and data quality validation for all user inputs
 */

import { mockCategories } from './mockData';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export interface ValidationOptions {
  minLength?: number;
  maxLength?: number;
  allowSpecialChars?: boolean;
  allowNumbers?: boolean;
  allowSpaces?: boolean;
}

/**
 * Sanitize text input to prevent XSS and injection attacks
 */
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .replace(/&/g, '&amp;') // Encode ampersands
    .replace(/"/g, '&quot;') // Encode quotes
    .replace(/'/g, '&#x27;') // Encode apostrophes
    .replace(/\//g, '&#x2F;'); // Encode forward slashes
};

/**
 * Validate and sanitize listing title
 */
export const validateListingTitle = (title: string): ValidationResult => {
  const sanitized = sanitizeText(title);
  
  if (!sanitized) {
    return { isValid: false, error: 'Title is required' };
  }
  
  if (sanitized.length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Title must be less than 100 characters' };
  }
  
  // Check for suspicious patterns
  if (sanitized.toLowerCase().includes('script') || 
      sanitized.toLowerCase().includes('javascript') ||
      sanitized.toLowerCase().includes('onload') ||
      sanitized.toLowerCase().includes('onerror')) {
    return { isValid: false, error: 'Title contains invalid content' };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: sanitized,
    error: undefined 
  };
};

/**
 * Validate and sanitize listing description
 */
export const validateListingDescription = (description: string): ValidationResult => {
  const sanitized = sanitizeText(description);

  // If description is empty, that's OK (optional)
  if (!sanitized) {
    return { isValid: true, sanitizedValue: '', error: undefined };
  }

  // No minimum length requirement for description

  if (sanitized.length > 1000) {
    return { isValid: false, error: 'Description must be less than 1000 characters' };
  }

  // Check for suspicious patterns
  if (sanitized.toLowerCase().includes('script') || 
      sanitized.toLowerCase().includes('javascript') ||
      sanitized.toLowerCase().includes('onload') ||
      sanitized.toLowerCase().includes('onerror')) {
    return { isValid: false, error: 'Description contains invalid content' };
  }

  return { 
    isValid: true, 
    sanitizedValue: sanitized,
    error: undefined 
  };
};

/**
 * Validate and sanitize user messages
 */
export const validateMessage = (message: string): ValidationResult => {
  const sanitized = sanitizeText(message);
  
  if (!sanitized) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (sanitized.length > 500) {
    return { isValid: false, error: 'Message must be less than 500 characters' };
  }
  
  // Check for spam patterns
  const spamPatterns = [
    /(buy|sell|click|visit|http|www|\.com|\.net|\.org)/gi,
    /(free|money|cash|earn|income|profit)/gi,
    /(limited|offer|discount|sale|deal)/gi
  ];
  
  const spamScore = spamPatterns.reduce((score, pattern) => {
    return score + (sanitized.match(pattern) || []).length;
  }, 0);
  
  if (spamScore > 5) {
    return { isValid: false, error: 'Message appears to be spam' };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: sanitized,
    error: undefined 
  };
};

/**
 * Validate and sanitize user name
 */
export const validateUserName = (name: string): ValidationResult => {
  const sanitized = sanitizeText(name);
  
  if (!sanitized) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (sanitized.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }
  
  // Only allow letters, spaces, and common punctuation
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(sanitized)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: sanitized,
    error: undefined 
  };
};

/**
 * Validate phone number format
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // For Indian numbers with +91, we need exactly 12 digits (91 + 10 mobile digits)
  if (digitsOnly.length !== 12) {
    return { isValid: false, error: 'Phone number must be exactly 12 digits (including country code)' };
  }
  
  // Check if it starts with 91 (India country code)
  if (!digitsOnly.startsWith('91')) {
    return { isValid: false, error: 'Phone number must start with 91 (India country code)' };
  }
  
  // Check if the mobile number part (after 91) is valid
  const mobileNumber = digitsOnly.substring(2);
  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    return { isValid: false, error: 'Invalid mobile number format' };
  }
  
  // Return the raw digits for database storage (no formatting)
  // Formatting should be done at display level, not storage level
  
  return { 
    isValid: true, 
    sanitizedValue: digitsOnly, // Store raw digits: "917306519350"
    error: undefined 
  };
};

/**
 * Validate price input
 */
export const validatePrice = (price: string): ValidationResult => {
  if (!price) {
    return { isValid: false, error: 'Price is required' };
  }
  
  // Remove currency symbols and commas
  const cleanPrice = price.replace(/[$,₹€£¥]/g, '');
  
  const numPrice = parseFloat(cleanPrice);
  
  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Please enter a valid price' };
  }
  
  if (numPrice <= 0) {
    return { isValid: false, error: 'Price must be greater than 0' };
  }
  
  if (numPrice > 999999) {
    return { isValid: false, error: 'Price is too high' };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: numPrice.toString(),
    error: undefined 
  };
};

/**
 * Validate search query
 */
export const validateSearchQuery = (query: string): ValidationResult => {
  const sanitized = sanitizeText(query);
  
  if (!sanitized) {
    return { isValid: false, error: 'Search query is required' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Search query must be at least 2 characters' };
  }
  
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Search query is too long' };
  }
  
  // Check for suspicious patterns
  if (sanitized.toLowerCase().includes('script') || 
      sanitized.toLowerCase().includes('javascript')) {
    return { isValid: false, error: 'Invalid search query' };
  }
  
  return { 
    isValid: true, 
    sanitizedValue: sanitized,
    error: undefined 
  };
};

/**
 * Validate category selection
 */
export const validateCategory = (category: string): ValidationResult => {
  const validCategories = mockCategories
    .map(cat => cat.id)
    .filter(id => id !== 'all'); // Exclude 'all' if needed

  if (!category) {
    return { isValid: false, error: 'Please select a category' };
  }

  if (!validCategories.includes(category)) {
    return { isValid: false, error: 'Invalid category selected' };
  }

  return { 
    isValid: true, 
    sanitizedValue: category,
    error: undefined 
  };
};

/**
 * Validate pricing unit selection
 */
export const validatePricingUnit = (priceUnit: string): ValidationResult => {
  const validUnits = [
    'per_item', 'per_kg', 'per_piece', 'per_pack', 'per_bundle', 
    'per_dozen', 'per_basket', 'per_plate', 'per_serving', 'per_hour', 
    'per_service', 'per_session', 'per_day', 'per_commission', 
    'per_project', 'per_week', 'per_month'
  ];

  if (!priceUnit) {
    return { isValid: false, error: 'Please select a pricing unit' };
  }

  if (!validUnits.includes(priceUnit)) {
    return { isValid: false, error: 'Invalid pricing unit selected' };
  }

  return { 
    isValid: true, 
    sanitizedValue: priceUnit,
    error: undefined 
  };
};

/**
 * Validate duration selection
 */
export const validateDuration = (expirationDays: number): ValidationResult => {
  const validDurations = [1, 7, 30, 365];

  if (!expirationDays) {
    return { isValid: false, error: 'Please select a duration' };
  }

  if (!validDurations.includes(expirationDays)) {
    return { isValid: false, error: 'Invalid duration selected' };
  }

  return { 
    isValid: true, 
    sanitizedValue: expirationDays.toString(),
    error: undefined 
  };
};

/**
 * Validate image selection (required)
 */
export const validateImage = (imageUri: string | null): ValidationResult => {
  if (!imageUri) {
    return { isValid: false, error: 'Please select an image for your listing' };
  }

  // Basic URI validation
  if (typeof imageUri !== 'string' || imageUri.trim() === '') {
    return { isValid: false, error: 'Invalid image selected' };
  }

  return { 
    isValid: true, 
    sanitizedValue: imageUri,
    error: undefined 
  };
};

/**
 * Format phone number for display
 */
/**
 * Format phone number for display (UI only)
 * This function formats phone numbers for user-friendly display
 */
export const formatPhoneNumberForDisplay = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters first
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers (+91 format)
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const mobileNumber = digitsOnly.substring(2);
    return `+91 ${mobileNumber.slice(0, 5)} ${mobileNumber.slice(5)}`;
  }
  
  // Handle US phone numbers
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
    return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
  }
  
  // For other formats, return as is
  return phone;
};

/**
 * Internal function for phone formatting (deprecated - use formatPhoneNumberForDisplay instead)
 */
const formatPhoneNumber = (digits: string): string => {
  // This function is kept for backward compatibility but should not be used
  // Use formatPhoneNumberForDisplay instead
  return formatPhoneNumberForDisplay(digits);
};

/**
 * Rate limiting helper for API calls
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  isAllowed(key: string, maxAttempts = 5, windowMs = 60000): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (!attempt) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset if window has passed
    if (now - attempt.lastAttempt > windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Check if limit exceeded
    if (attempt.count >= maxAttempts) {
      return false;
    }
    
    // Increment attempt count
    attempt.count++;
    attempt.lastAttempt = now;
    return true;
  }
  
  clear(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Log security events for monitoring
 */
export const logSecurityEvent = (event: string, details: any, username?: string): void => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userId: username || 'unknown', // Use the actual username if provided
  };
  // In production, send to security monitoring service
  // Security Event logged silently
  // Store locally for debugging
  // AsyncStorage.setItem('security_logs', JSON.stringify([...existingLogs, securityLog]));
};

/**
 * Comprehensive form validation
 */
export const validateForm = (formData: Record<string, any>, validators: Record<string, (value: any) => ValidationResult>): {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, any>;
} => {
  const errors: Record<string, string> = {};
  const sanitizedData: Record<string, any> = {};
  let isValid = true;
  
  for (const [field, value] of Object.entries(formData)) {
    if (validators[field]) {
      const result = validators[field](value);
      if (!result.isValid) {
        errors[field] = result.error || 'Invalid input';
        isValid = false;
      } else {
        sanitizedData[field] = result.sanitizedValue || value;
      }
    } else {
      sanitizedData[field] = value;
    }
  }
  
  return { isValid, errors, sanitizedData };
}; 

/**
 * Validate password strength and requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters' };
  }

  // Check for required character types
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const missingRequirements = [];
  if (!hasUpperCase) missingRequirements.push('uppercase letter');
  if (!hasLowerCase) missingRequirements.push('lowercase letter');
  if (!hasNumbers) missingRequirements.push('number');
  if (!hasSpecialChar) missingRequirements.push('special character');

  if (missingRequirements.length > 0) {
    return { 
      isValid: false, 
      error: `Password must contain at least one ${missingRequirements.join(', ')}` 
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common. Please choose a stronger password' };
  }

  // Check for sequential characters
  const sequentialPatterns = ['123', 'abc', 'qwe', 'asd', 'zxc'];
  const lowerPassword = password.toLowerCase();
  for (const pattern of sequentialPatterns) {
    if (lowerPassword.includes(pattern)) {
      return { isValid: false, error: 'Password contains sequential characters' };
    }
  }

  return { 
    isValid: true, 
    sanitizedValue: password,
    error: undefined 
  };
};

/**
 * Get password strength score (0-4)
 */
export const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: 'Enter password', color: '#94A3B8' };

  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety bonus
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;
  
  // Penalty for common patterns
  const commonPatterns = ['password', '123456', 'qwerty', 'abc123'];
  if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
    score = Math.max(0, score - 2);
  }

  const strengthMap = [
    { label: 'Very Weak', color: '#EF4444' },
    { label: 'Weak', color: '#F97316' },
    { label: 'Fair', color: '#EAB308' },
    { label: 'Good', color: '#22C55E' },
    { label: 'Strong', color: '#16A34A' }
  ];

  return {
    score: Math.min(4, score),
    ...strengthMap[Math.min(4, score)]
  };
};

/**
 * Validate email format and security
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Length validation (RFC 5321)
  if (email.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /on\w+=/i,
    /<[^>]*>/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(email)) {
      return { isValid: false, error: 'Email contains invalid characters' };
    }
  }

  // Check for disposable email domains (basic check)
  const disposableDomains = [
    'tempmail.org', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    return { isValid: false, error: 'Please use a valid email address' };
  }

  return { 
    isValid: true, 
    sanitizedValue: email.toLowerCase().trim(),
    error: undefined 
  };
};

/**
 * Validate username requirements
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { isValid: false, error: 'Username must be less than 30 characters' };
  }

  // Only allow lowercase letters, numbers, underscores, and hyphens
  const usernameRegex = /^[a-z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens' };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin', 'administrator', 'root', 'system', 'support', 'help',
    'info', 'contact', 'mail', 'email', 'user', 'test', 'demo',
    'api', 'www', 'ftp', 'smtp', 'pop', 'imap', 'webmaster',
    'noreply', 'no-reply', 'postmaster', 'hostmaster', 'abuse'
  ];
  
  if (reservedUsernames.includes(username)) {
    return { isValid: false, error: 'This username is reserved' };
  }

  return { 
    isValid: true, 
    sanitizedValue: username.trim(),
    error: undefined 
  };
}; 