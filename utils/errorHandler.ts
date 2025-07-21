/* eslint-disable @typescript-eslint/no-unused-vars */
/* global console, setTimeout, clearTimeout */
import { Alert } from 'react-native';
import { logSecurityEvent } from './validation';

// Error types for different operations
export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  STORAGE = 'storage',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error context for better debugging
export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  additionalData?: any;
}

// Error information structure
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: any;
  context?: ErrorContext;
  timestamp: Date;
}

// User-friendly error messages
const USER_FRIENDLY_MESSAGES = {
  [ErrorType.NETWORK]: {
    [ErrorSeverity.LOW]: 'Please check your connection and try again.',
    [ErrorSeverity.MEDIUM]: 'Network connection is slow. Please try again.',
    [ErrorSeverity.HIGH]: 'Unable to connect to the server. Please check your internet connection.',
    [ErrorSeverity.CRITICAL]: 'Network error. Please restart the app and try again.'
  },
  [ErrorType.DATABASE]: {
    [ErrorSeverity.LOW]: 'Data loading issue. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Unable to save data. Please try again.',
    [ErrorSeverity.HIGH]: 'Database error. Please restart the app.',
    [ErrorSeverity.CRITICAL]: 'Critical database error. Please contact support.'
  },
  [ErrorType.VALIDATION]: {
    [ErrorSeverity.LOW]: 'Please check your input and try again.',
    [ErrorSeverity.MEDIUM]: 'Invalid data provided. Please correct and try again.',
    [ErrorSeverity.HIGH]: 'Data validation failed. Please review your input.',
    [ErrorSeverity.CRITICAL]: 'Critical validation error. Please contact support.'
  },
  [ErrorType.AUTHENTICATION]: {
    [ErrorSeverity.LOW]: 'Please log in again.',
    [ErrorSeverity.MEDIUM]: 'Authentication expired. Please log in again.',
    [ErrorSeverity.HIGH]: 'Authentication error. Please restart the app.',
    [ErrorSeverity.CRITICAL]: 'Critical authentication error. Please contact support.'
  },
  [ErrorType.PERMISSION]: {
    [ErrorSeverity.LOW]: 'Permission denied for this action.',
    [ErrorSeverity.MEDIUM]: 'You don\'t have permission to perform this action.',
    [ErrorSeverity.HIGH]: 'Permission error. Please contact support.',
    [ErrorSeverity.CRITICAL]: 'Critical permission error. Please contact support.'
  },
  [ErrorType.STORAGE]: {
    [ErrorSeverity.LOW]: 'Storage issue. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Unable to save data locally. Please try again.',
    [ErrorSeverity.HIGH]: 'Storage error. Please restart the app.',
    [ErrorSeverity.CRITICAL]: 'Critical storage error. Please contact support.'
  },
  [ErrorType.UNKNOWN]: {
    [ErrorSeverity.LOW]: 'Something went wrong. Please try again.',
    [ErrorSeverity.MEDIUM]: 'An error occurred. Please try again.',
    [ErrorSeverity.HIGH]: 'Unexpected error. Please restart the app.',
    [ErrorSeverity.CRITICAL]: 'Critical error. Please contact support.'
  }
};

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle and categorize errors
  private categorizeError(error: any, context?: ErrorContext): AppError {
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let message = 'An unexpected error occurred';

    // Categorize based on error properties
    if (error?.code) {
      switch (error.code) {
        case 'NETWORK_ERROR':
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
          type = ErrorType.NETWORK;
          severity = ErrorSeverity.HIGH;
          break;
        case 'PGRST116':
        case 'PGRST301':
        case 'PGRST302':
          type = ErrorType.DATABASE;
          severity = ErrorSeverity.MEDIUM;
          break;
        case 'PGRST403':
          type = ErrorType.PERMISSION;
          severity = ErrorSeverity.MEDIUM;
          break;
        case 'PGRST401':
          type = ErrorType.AUTHENTICATION;
          severity = ErrorSeverity.HIGH;
          break;
        case 'VALIDATION_ERROR':
          type = ErrorType.VALIDATION;
          severity = ErrorSeverity.LOW;
          break;
      }
    }

    // Categorize based on error message
    if (error?.message) {
      const messageLower = error.message.toLowerCase();
      if (messageLower.includes('network') || messageLower.includes('connection')) {
        type = ErrorType.NETWORK;
        severity = ErrorSeverity.HIGH;
      } else if (messageLower.includes('database') || messageLower.includes('sql')) {
        type = ErrorType.DATABASE;
        severity = ErrorSeverity.MEDIUM;
      } else if (messageLower.includes('validation') || messageLower.includes('invalid')) {
        type = ErrorType.VALIDATION;
        severity = ErrorSeverity.LOW;
      } else if (messageLower.includes('auth') || messageLower.includes('login')) {
        type = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
      } else if (messageLower.includes('permission') || messageLower.includes('forbidden')) {
        type = ErrorType.PERMISSION;
        severity = ErrorSeverity.MEDIUM;
      } else if (messageLower.includes('storage') || messageLower.includes('asyncstorage')) {
        type = ErrorType.STORAGE;
        severity = ErrorSeverity.MEDIUM;
      }
    }

    return {
      type,
      severity,
      message: error?.message || message,
      originalError: error,
      context,
      timestamp: new Date()
    };
  }

  // Handle error with user notification
  async handleError(
    error: any, 
    context?: ErrorContext, 
    showAlert: boolean = true,
    userId?: string
  ): Promise<AppError> {
    const appError = this.categorizeError(error, context);
    
    // Log error
    this.logError(appError);
    
    // Log security event for critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      await logSecurityEvent('critical_error', {
        error: appError.message,
        type: appError.type,
        context: appError.context
      }, userId || 'unknown');
    }

    // Show user-friendly alert
    if (showAlert) {
      this.showUserAlert(appError);
    }

    return appError;
  }

  // Handle error silently (for non-critical operations)
  async handleSilentError(
    error: any, 
    context?: ErrorContext,
    userId?: string
  ): Promise<AppError> {
    const appError = this.categorizeError(error, context);
    
    // Only log, don't show alert
    this.logError(appError);
    
    // Log security event for high/critical errors
    if (appError.severity >= ErrorSeverity.HIGH) {
      await logSecurityEvent('silent_error', {
        error: appError.message,
        type: appError.type,
        context: appError.context
      }, userId || 'unknown');
    }

    return appError;
  }

  // Show user-friendly alert
  showUserAlert(error: AppError): void {
    const userMessage = USER_FRIENDLY_MESSAGES[error.type][error.severity];
    
    Alert.alert(
      'Error',
      userMessage,
      [{ text: 'OK', style: 'default' }]
    );
  }

  // Log error for debugging
  private logError(error: AppError): void {
    console.error('App Error:', {
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      originalError: error.originalError
    });

    // Store in error log (keep last 100 errors)
    this.errorLog.push(error);
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }
  }

  // Get error log for debugging
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Check if error is retryable
  isRetryableError(error: AppError): boolean {
    return error.type === ErrorType.NETWORK || 
           (error.type === ErrorType.DATABASE && error.severity <= ErrorSeverity.MEDIUM);
  }

  // Get retry delay based on error severity
  getRetryDelay(error: AppError): number {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        return 1000; // 1 second
      case ErrorSeverity.MEDIUM:
        return 3000; // 3 seconds
      case ErrorSeverity.HIGH:
        return 5000; // 5 seconds
      case ErrorSeverity.CRITICAL:
        return 10000; // 10 seconds
      default:
        return 2000; // 2 seconds
    }
  }
}

// Convenience functions
export const errorHandler = ErrorHandler.getInstance();

// Async wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  showAlert: boolean = true,
  userId?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    await errorHandler.handleError(error, context, showAlert, userId);
    return null;
  }
}

// Silent error handling wrapper
export async function withSilentErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  userId?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    await errorHandler.handleSilentError(error, context, userId);
    return null;
  }
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  context?: ErrorContext,
  userId?: string
): Promise<T | null> {
  let lastError: AppError | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = await errorHandler.handleSilentError(error, context, userId);
      
      if (!errorHandler.isRetryableError(lastError) || attempt === maxRetries) {
        // Show alert on final attempt or non-retryable error
        if (lastError) {
          errorHandler.showUserAlert(lastError);
        }
        return null;
      }
      
      // Wait before retry
      const delay = errorHandler.getRetryDelay(lastError) * attempt;
      await new Promise(resolve => {
        const timer = setTimeout(resolve, delay);
        return () => clearTimeout(timer);
      });
    }
  }
  
  return null;
} 