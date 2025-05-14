'use client';

/**
 * Error Logger Component
 * 
 * This component will capture and log errors from the browser console
 * to help identify issues in the application.
 */

import { useEffect } from 'react';

export default function ErrorLogger() {
  useEffect(() => {
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Error collection
    const errors = [];
    const warnings = [];

    // Override console.error
    console.error = (...args) => {
      // Call original method
      originalConsoleError.apply(console, args);
      
      // Store error
      let errorObj = {
        timestamp: new Date().toISOString(),
        message: args.map(arg => {
          if (arg instanceof Error) {
            return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
          } else if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          } else {
            return String(arg);
          }
        }).join(' ')
      };
      errors.push(errorObj);
      
      // Send errors to server after collecting a batch
      if (errors.length === 1) {
        setTimeout(() => {
          sendErrorsToServer([...errors]);
          errors.length = 0;
        }, 500);
      }
    };
    
    // Override console.warn
    console.warn = (...args) => {
      // Call original method
      originalConsoleWarn.apply(console, args);
      
      // Store warning
      let warningObj = {
        timestamp: new Date().toISOString(),
        message: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          } else {
            return String(arg);
          }
        }).join(' ')
      };
      warnings.push(warningObj);
      
      // Send warnings to server after collecting a batch
      if (warnings.length === 1) {
        setTimeout(() => {
          sendWarningsToServer([...warnings]);
          warnings.length = 0;
        }, 500);
      }
    };
    
    // Listen for unhandled errors
    const errorHandler = (event) => {
      console.error('Unhandled error:', event.error || event.message);
    };
    
    // Listen for unhandled promise rejections
    const rejectionHandler = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    };
    
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
      // Categorize errors before sending to server
    function categorizeErrors(errorsList) {
      return errorsList.map(error => {
        const errorObj = { ...error };
        
        // Check for API related errors
        if (error.message.includes('dexscreener.com')) {
          errorObj.category = 'API_DEXSCREENER';
          errorObj.isApiError = true;
        } else if (error.message.includes('birdeye.so')) {
          errorObj.category = 'API_BIRDEYE';
          errorObj.isApiError = true;
        } else if (error.message.includes('shyft.to')) {
          errorObj.category = 'API_SHYFT';
          errorObj.isApiError = true;
        } else if (error.message.includes('fetch') || error.message.includes('axios') || 
                  error.message.includes('http') || error.message.includes('network')) {
          errorObj.category = 'API_OTHER';
          errorObj.isApiError = true;
        } else if (error.message.includes('react')) {
          errorObj.category = 'REACT';
        } else if (error.message.includes('socket')) {
          errorObj.category = 'WEBSOCKET';
        } else if (error.message.includes('wallet')) {
          errorObj.category = 'WALLET';
        } else {
          errorObj.category = 'OTHER';
        }
        
        // Determine severity based on error message
        if (error.message.includes('critical') || error.message.includes('fatal')) {
          errorObj.severity = 'CRITICAL';
        } else if (error.message.includes('error') || error.message.includes('exception')) {
          errorObj.severity = 'HIGH';
        } else if (error.message.includes('fail')) {
          errorObj.severity = 'MEDIUM';
        } else {
          errorObj.severity = 'LOW';
        }
        
        return errorObj;
      });
    }

    // Send errors to server for logging
    async function sendErrorsToServer(errorsList) {
      try {
        // Categorize errors before sending
        const categorizedErrors = categorizeErrors(errorsList);
        
        await fetch('/api/log-client-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            errors: categorizedErrors,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }),
        });
        
        // If there are API errors, also log to enhanced error endpoint
        const apiErrors = categorizedErrors.filter(err => err.isApiError);
        if (apiErrors.length > 0) {
          await fetch('/api/log-enhanced-error', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              errors: apiErrors,
              context: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                errorType: 'API_CONNECTION'
              }
            }),
          });
        }
      } catch (e) {
        originalConsoleError.call(console, 'Failed to send errors to server:', e);
      }
    }
    
    // Send warnings to server for logging
    async function sendWarningsToServer(warningsList) {
      try {
        await fetch('/api/log-client-warning', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            warnings: warningsList,
            url: window.location.href,
            userAgent: navigator.userAgent
          }),
        });
      } catch (e) {
        originalConsoleError.call(console, 'Failed to send warnings to server:', e);
      }
    }
    
    // Log initial mount
    console.log('Error logger mounted');
    
    // Clean up
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);
  
  return null;
}
