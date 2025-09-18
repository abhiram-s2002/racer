import * as Sentry from '@sentry/react-native';
import { Environment } from './environment';

/**
 * Sentry Configuration
 * Error monitoring and crash reporting
 */

// Initialize Sentry if DSN is provided
export const initializeSentry = () => {
  const sentryDsn = Environment.sentryDsn;
  
  // For development, use the hardcoded DSN if environment variable is not available
  const developmentDsn = 'https://12bda6c71fb7e7c03519c5543ba94e47@o4509779115507712.ingest.us.sentry.io/4509779117080576';
  const finalDsn = sentryDsn || (Environment.isDevelopment ? developmentDsn : undefined);
  
  if (!finalDsn || finalDsn.includes('your-sentry-dsn')) {
    return;
  }

  try {
    Sentry.init({
      dsn: finalDsn,
      environment: Environment.env,
      debug: false, // Disable verbose Sentry logs
      
      // Performance monitoring
      tracesSampleRate: Environment.isDevelopment ? 1.0 : 0.1,
      
      // Error filtering
      beforeSend(event) {
        // Filter out development errors if needed
        return event;
      },
      
      // User context
      initialScope: {
        tags: {
          app: 'GeoMart',
          version: Environment.appVersion,
        },
      },
    });

  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
};

// Helper functions for error reporting
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (Environment.enableErrorReporting) {
    Sentry.captureException(error, {
      tags: context,
    });
  }
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (Environment.enableErrorReporting) {
    Sentry.captureMessage(message, level);
  }
};

export const setUserContext = (user: { id: string; username: string; email?: string }) => {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    email: user.email,
  });
};

export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};

// Performance monitoring
export const startTransaction = (name: string, op: string) => {
  // Note: startTransaction is deprecated in newer Sentry versions
  // Using startSpan instead for performance monitoring
  return Sentry.startSpan({ name, op }, () => {
    // Empty function for span
  });
};

export const finishTransaction = (transaction: any) => {
  transaction.finish();
};
