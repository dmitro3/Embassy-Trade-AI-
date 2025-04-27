'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  captureAppException, 
  setAppUser, 
  setAppTag, 
  setAppExtra, 
  addAppBreadcrumb 
} from '../lib/sentryUtils';

/**
 * ErrorBoundary component to catch and handle frontend errors
 * This will be integrated with Sentry once the package installation is complete
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Store error info for display
    this.setState({ errorInfo });
    
    // Capture error in Sentry using our utility function
    const eventId = captureAppException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });
    
    // Set the Sentry event ID for reference
    this.setState({ errorId: eventId });
    
    // Also report to our custom backend
    this.reportErrorToBackend(error, errorInfo, eventId);
  }

  reportErrorToBackend = async (error, errorInfo, sentryEventId) => {
    try {
      const response = await fetch('/api/report-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          sentryEventId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.errorId && !sentryEventId) {
          this.setState({ errorId: data.errorId });
        }
      }
    } catch (reportError) {
      console.error('Failed to report error to backend:', reportError);
      // Capture this error in Sentry too
      captureAppException(reportError);
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
    
    // Attempt to recover by refreshing the component
    if (this.props.onReset) {
      this.props.onReset();
    }
  };
  
  handleShowReportDialog = () => {
    if (this.state.errorId) {
      // We can't directly use Sentry.showReportDialog here since we're using the utility functions
      // Instead, we'll reload the page which is a common recovery mechanism
      window.location.reload();
    }
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { fallback, children } = this.props;
    
    if (hasError) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback(error, errorInfo, this.handleReset);
      }
      
      // Default error UI with icy blue theme
      return (
        <div className="p-6 rounded-lg bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg border border-blue-700">
          <div className="flex items-center mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-red-400 mr-3" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h2 className="text-xl font-bold">Something went wrong</h2>
          </div>
          
          <div className="mb-4">
            <p className="text-blue-200 mb-2">
              {error?.message || 'An unexpected error occurred'}
            </p>
            {errorId && (
              <p className="text-sm text-blue-300">
                Error ID: {errorId}
              </p>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
            >
              Reload Page
            </button>
            
            {this.state.errorId && (
              <button
                onClick={this.handleShowReportDialog}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white transition-colors"
              >
                Report Feedback
              </button>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && errorInfo && (
            <div className="mt-6 p-4 bg-gray-900 rounded-md overflow-auto max-h-64">
              <p className="text-sm text-gray-400 mb-2">Component Stack:</p>
              <pre className="text-xs text-red-300 whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }
    
    return children;
  }
}

/**
 * Wrapper component that provides router context to ErrorBoundary
 */
export default function ErrorBoundaryWrapper(props) {
  const router = useRouter();
  
  const handleReset = () => {
    if (props.onReset) {
      props.onReset();
    } else {
      // If no custom reset handler is provided, try to refresh the current route
      try {
        router.refresh();
      } catch (error) {
        console.error('Failed to refresh route:', error);
      }
    }
  };
  
  return <ErrorBoundary {...props} onReset={handleReset} />;
}
