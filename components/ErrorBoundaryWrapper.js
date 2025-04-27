'use client';

import React from 'react';

/**
 * ErrorBoundaryWrapper component to catch rendering errors and provide fallback UI
 */
class ErrorBoundaryWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error: error 
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundaryWrapper caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg my-4">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            Something went wrong loading the trading interface
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryWrapper;
