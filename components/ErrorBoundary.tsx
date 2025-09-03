import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ErrorHandler } from '@/utils/errorHandler';

// Custom ErrorInfo interface for React Native
interface ErrorInfo {
  componentStack: string;
}

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
  errorType?: 'critical' | 'recoverable' | 'network' | 'auth' | 'data' | 'whatsapp' | 'location';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: 'critical' | 'recoverable' | 'network' | 'auth' | 'data' | 'whatsapp' | 'location';
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler = ErrorHandler.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'recoverable',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Categorize errors based on error message or type
    let errorType: 'critical' | 'recoverable' | 'network' | 'auth' | 'data' | 'whatsapp' | 'location' = 'recoverable';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      errorType = 'network';
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
      errorType = 'auth';
    } else if (errorMessage.includes('data') || errorMessage.includes('parse') || errorMessage.includes('json')) {
      errorType = 'data';
    } else if (errorMessage.includes('whatsapp') || errorMessage.includes('phone') || errorMessage.includes('communication') || errorMessage.includes('linking')) {
      errorType = 'whatsapp';
    } else if (errorMessage.includes('location') || errorMessage.includes('gps') || errorMessage.includes('permission') || errorMessage.includes('coordinates')) {
      errorType = 'location';
    } else if (errorMessage.includes('critical') || errorMessage.includes('fatal')) {
      errorType = 'critical';
    }

    return {
      hasError: true,
      error,
      errorInfo: null,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    // ErrorBoundary caught an error

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Handle error through ErrorHandler
    this.errorHandler.handleError(error, {
      operation: 'component_render',
      component: this.props.componentName || 'Unknown',
      additionalData: {
        errorInfo,
        stack: error.stack,
        errorType: this.state.errorType,
      },
    });

    // Call custom onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReportError = () => {
    if (this.state.error) {
      Alert.alert(
        'Report Error',
        'Thank you for reporting this error. Our team will investigate and fix it.',
        [{ text: 'OK' }]
      );
      
      // Here you would typically send the error to your error reporting service
      // For now, we'll just log it
      // Error reported by user
    }
  };

  handleGoHome = () => {
    // Navigate to home screen
    // This would typically use your navigation system
    // For now, we'll just log the action
          // Navigating to home
  };

  renderNetworkError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Connection Issue</Text>
          <Text style={styles.message}>
            It looks like you&apos;re having trouble connecting to our servers. Please check your internet connection and try again.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
              <Text style={styles.secondaryButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderAuthError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Authentication Error</Text>
          <Text style={styles.message}>
            There was an issue with your login session. Please try logging in again.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
              <Text style={styles.secondaryButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderDataError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Data Loading Error</Text>
          <Text style={styles.message}>
            We couldn&apos;t load the requested information. This might be a temporary issue.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Reload</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
              <Text style={styles.secondaryButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderCriticalError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Critical Error</Text>
          <Text style={styles.message}>
            Something went seriously wrong. Please restart the app or contact support if the problem persists.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.reportButton} onPress={this.handleReportError}>
              <Text style={styles.reportButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderWhatsAppError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Communication Error</Text>
          <Text style={styles.message}>
            We couldn&apos;t open WhatsApp to start the conversation. Please make sure WhatsApp is installed on your device.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
              <Text style={styles.secondaryButtonText}>Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderLocationError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Location Access Required</Text>
          <Text style={styles.message}>
            We need access to your location to show nearby listings. Please enable location services in your device settings.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={this.handleGoHome}>
              <Text style={styles.secondaryButtonText}>Continue Without Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  renderDefaultError() {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We&apos;re sorry, but something unexpected happened. Please try again.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.reportButton} onPress={this.handleReportError}>
              <Text style={styles.reportButtonText}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Render specific error UI based on error type
      switch (this.state.errorType) {
        case 'network':
          return this.renderNetworkError();
        case 'auth':
          return this.renderAuthError();
        case 'data':
          return this.renderDataError();
        case 'whatsapp':
          return this.renderWhatsAppError();
        case 'location':
          return this.renderLocationError();
        case 'critical':
          return this.renderCriticalError();
        default:
          return this.renderDefaultError();
      }
    }

    return this.props.children || null;
  }
}

// Specialized error boundary for async operations
export class AsyncErrorBoundary extends Component<Props, State> {
  private errorHandler = ErrorHandler.getInstance();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'recoverable',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Enhanced error categorization for async operations
    let errorType: 'critical' | 'recoverable' | 'network' | 'auth' | 'data' | 'whatsapp' | 'location' = 'recoverable';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      errorType = 'network';
    } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || 
               errorMessage.includes('token') || errorMessage.includes('permission')) {
      errorType = 'auth';
    } else if (errorMessage.includes('data') || errorMessage.includes('parse') || 
               errorMessage.includes('json') || errorMessage.includes('validation')) {
      errorType = 'data';
    } else if (errorMessage.includes('whatsapp') || errorMessage.includes('phone') || 
               errorMessage.includes('communication') || errorMessage.includes('linking')) {
      errorType = 'whatsapp';
    } else if (errorMessage.includes('location') || errorMessage.includes('gps') || 
               errorMessage.includes('permission') || errorMessage.includes('coordinates')) {
      errorType = 'location';
    } else if (errorMessage.includes('critical') || errorMessage.includes('fatal') ||
               errorMessage.includes('crash') || errorMessage.includes('memory')) {
      errorType = 'critical';
    }

    return {
      hasError: true,
      error,
      errorInfo: null,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // AsyncErrorBoundary caught an error

    this.setState({
      error,
      errorInfo,
    });

    this.errorHandler.handleError(error, {
      operation: 'async_operation',
      component: this.props.componentName || 'Unknown',
      additionalData: {
        errorInfo,
        stack: error.stack,
        errorType: this.state.errorType,
        isAsync: true,
      },
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Async-specific error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Operation Failed</Text>
            <Text style={styles.message}>
              The operation couldn&apos;t be completed. This might be due to a network issue or temporary server problem.
            </Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children || null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  debugContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
    lineHeight: 16,
  },
});

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    const wrappedComponent = <Component {...props} />;
    
    return (
      <ErrorBoundary componentName={componentName} fallback={fallback}>
        {wrappedComponent}
      </ErrorBoundary>
    );
  };
} 