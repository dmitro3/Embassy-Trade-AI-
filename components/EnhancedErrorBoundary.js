'use client';

import React, { Component } from 'react';
import { toast } from 'react-toastify';

/**
 * Enhanced Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Graceful error handling
 * - Error logging to server
 * - Retry mechanism
 * - Detailed error information (in development only)
 * - Custom fallback UI
 */
export default class EnhancedErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      componentStack: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to the console
    console.error('Error caught by boundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Update state with error details
    this.setState(prevState => ({
      errorInfo,
      componentStack: errorInfo.componentStack,
      errorCount: prevState.errorCount + 1
    }));
    
    // Log error to server
    this.logErrorToServer(error, errorInfo);
    
    // Show toast notification
    if (this.props.showToast !== false) {
      toast.error(`An error occurred: ${error.message}`, {
        position: "top-center",
        autoClose: 5000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    }
  }

  async logErrorToServer(error, errorInfo) {
    try {
      // Send error details to our API endpoint
      await fetch('/api/log-client-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: [{
            timestamp: new Date().toISOString(),
            message: `${error.name}: ${error.message}`,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          }],
          url: window.location.href,
          userAgent: navigator.userAgent
        }),
      });
    } catch (e) {
      console.error('Failed to log error to server:', e);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleReset = () => {
    // Reset application state if needed
    // This could involve clearing cached data or resetting to initial state
    window.localStorage.removeItem('tradeforce_ai_state');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          onRetry: this.handleRetry,
          onReset: this.handleReset
        });
      }

      // Default error UI
      return (
        <div className="error-boundary p-4 md:p-8 bg-gray-900 rounded-lg shadow-lg border border-red-700">
          <div className="flex items-center mb-4 text-red-500">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h2 className="text-xl font-bold">Something went wrong</h2>
          </div>
          
          <p className="mb-4 text-gray-300">
            {this.props.message || "We're having trouble displaying this content. Please try again."}
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Error Details:</h3>
                <div className="p-3 bg-gray-800 rounded font-mono text-xs overflow-auto max-h-40 text-red-300">
                  {this.state.error && this.state.error.toString()}
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-1">Component Stack:</h3>
                <div className="p-3 bg-gray-800 rounded font-mono text-xs overflow-auto max-h-40 text-gray-400">
                  {this.state.componentStack}
                </div>
              </div>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
            >
              Reset Application
            </button>
          </div>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}
