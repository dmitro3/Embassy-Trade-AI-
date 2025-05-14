'use client';

import React from 'react';

/**
 * FirebaseErrorBoundary component
 * 
 * Error boundary component to catch and handle Firebase-related errors gracefully
 * Helps prevent the app from crashing due to permission denied errors
 */
class FirebaseErrorBoundaryImpl extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      isFixing: false,
      fixAttempts: 0,
      fixed: false
    };
  }
  
  static getDerivedStateFromError(error) {
    // Check if it's a Firebase permission error or other typical Firebase errors
    return { 
      hasError: true, 
      error
    };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('Error caught by FirebaseErrorBoundary', error);
  }
  
  handleTryAgain = () => {
    this.setState({ 
      hasError: false, 
      error: null 
    });
  };
  
  handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };
  
  render() {
    if (this.state.hasError) {
      // Error UI
      return (
        <div className="p-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-lg mx-auto my-8">
          <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
          <div>
            <p className="mb-4">We encountered an issue. We're trying to fix it automatically.</p>
            <div className="flex space-x-4">
              <button 
                onClick={this.handleTryAgain}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // No error, render children
    return this.props.children;
  }
}

// Export both named and default
export const FirebaseErrorBoundary = FirebaseErrorBoundaryImpl;
export default FirebaseErrorBoundaryImpl;
