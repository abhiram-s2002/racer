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

  if (sanitized.length < 10) {
    return { isValid: false, error: 'Description must be at least 10 characters' };
  }

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
  
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must have at least 10 digits' };
  }
  
  if (digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number is too long' };
  }
  
  // Format the phone number
  const formatted = formatPhoneNumber(digitsOnly);
  
  return { 
    isValid: true, 
    sanitizedValue: formatted,
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
 * Format phone number for display
 */
const formatPhoneNumber = (digits: string): string => {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits;
};

/**
 * Rate limiting helper for API calls
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
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
  console.log('Security Event:', securityLog);
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