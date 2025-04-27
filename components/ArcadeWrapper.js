'use client';

import React, { useState, useEffect } from 'react';
import Arcade from './Arcade';
import ErrorBoundary from './ErrorBoundary';
import { startAppTransaction, finishAppTransaction, setAppUser } from '../lib/sentryUtils';

/**
 * ArcadeWrapper component
 * 
 * This component wraps the Arcade component with error handling and enhanced UI features.
 * It provides:
 * 1. Error boundary to catch and report errors
 * 2. Performance monitoring
 * 3. User context for better error tracking
 */
const ArcadeWrapper = (props) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Set up performance monitoring
  useEffect(() => {
    // Start a performance transaction for the Arcade component using our utility
    const transaction = startAppTransaction(
      'arcade-load',
      'ui.render'
    );
    
    // Add user context if available
    if (props.user) {
      setAppUser({
        id: props.user.id || props.user.publicKey?.toString(),
        username: props.user.username || 'anonymous',
        wallet: props.user.publicKey?.toString()
      });
    }
    
    // Simulate loading time (remove in production)
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Finish the transaction using our utility
      if (transaction) {
        finishAppTransaction(transaction);
      }
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (transaction) {
        finishAppTransaction(transaction);
      }
    };
  }, [props.user]);
  
  // Custom error fallback UI
  const errorFallback = (error, errorInfo, resetErrorBoundary) => (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-blue-700/50 shadow-xl">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 flex items-center justify-center bg-red-500/20 rounded-full mr-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-red-400" 
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
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Arcade Error</h2>
            <p className="text-blue-300">We encountered an issue while loading the Arcade</p>
          </div>
        </div>
        
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <p className="text-red-300 font-medium mb-2">{error?.message || 'An unexpected error occurred'}</p>
          <p className="text-gray-400 text-sm">
            This error has been automatically reported to our team. We'll work on fixing it as soon as possible.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors shadow-lg flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go to Home
          </button>
          
          <button
            onClick={() => window.location.href = '/tradeforce'}
            className="px-6 py-3 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg transition-colors shadow-lg flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Go to TradeForce
          </button>
        </div>
      </div>
    </div>
  );
  
  // Loading state UI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Arcade</h2>
          <p className="text-blue-300">Preparing your gaming experience...</p>
        </div>
      </div>
    );
  }
  
  // Render the Arcade component wrapped in an ErrorBoundary
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Arcade {...props} />
    </ErrorBoundary>
  );
};

export default ArcadeWrapper;
