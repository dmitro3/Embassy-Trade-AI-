'use client';

import { useState, useEffect } from 'react';

/**
 * Automated Error Monitor Component
 * 
 * This component provides continuous error monitoring and feedback:
 * - Captures all JavaScript errors and API failures
 * - Maintains a persistent error log with detailed diagnostics
 * - Periodically analyzes patterns and suggests fixes
 * - Provides real-time status information through a status panel
 */
export default function AutomatedErrorMonitor() {
  // State for tracking errors and their status
  const [errorLog, setErrorLog] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [summary, setSummary] = useState({
    totalErrors: 0,
    criticalErrors: 0,
    apiErrors: 0,
    reactErrors: 0,
    databaseErrors: 0,
    blockchainErrors: 0,
    networkErrors: 0,
    timestamp: null
  });

  useEffect(() => {
    // Initialize from localStorage if available
    try {
      const savedLog = localStorage.getItem('tradeforce_error_log');
      if (savedLog) {
        setErrorLog(JSON.parse(savedLog));
      }
      
      const savedSummary = localStorage.getItem('tradeforce_error_summary');
      if (savedSummary) {
        setSummary(JSON.parse(savedSummary));
      }
    } catch (e) {
      console.warn('Could not load saved error logs:', e);
    }

    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Create batched error collection
    const pendingErrors = [];

    // Error classification regex patterns
    const errorPatterns = {
      react: /(React|Component|Element|Props|render|useState|useEffect|Invalid hook|Rendering|Suspense)/i,
      api: /(fetch|API|endpoint|HTTP|GET|POST|PUT|DELETE|response|status|statusCode|REST)/i,
      database: /(MongoDB|database|collection|document|query|schema|mongoose|find|insert|update|delete|CRUD)/i,
      blockchain: /(Solana|blockchain|wallet|transaction|Web3|connection|account|token|contract|gas|SOL|BTC)/i,
      network: /(network|connection|offline|timeout|WebSocket|Socket|ping|latency|bandwidth)/i
    };

    // Classify error type based on message
    function classifyError(message) {
      if (errorPatterns.react.test(message)) return 'react';
      if (errorPatterns.api.test(message)) return 'api';
      if (errorPatterns.database.test(message)) return 'database';
      if (errorPatterns.blockchain.test(message)) return 'blockchain';
      if (errorPatterns.network.test(message)) return 'network';
      return 'other';
    }

    // Function to determine error severity
    function determineSeverity(error) {
      const message = error.message.toLowerCase();
      
      // Critical patterns
      if (
        message.includes('uncaught') || 
        message.includes('fatal') ||
        message.includes('crash') ||
        message.includes('cannot read property') ||
        message.includes('undefined is not') ||
        message.includes('null is not') ||
        message.includes('is not a function')
      ) {
        return 'critical';
      }
      
      // High severity patterns
      if (
        message.includes('failed to') || 
        message.includes('error') ||
        message.includes('exception')
      ) {
        return 'high';
      }
      
      return 'medium';
    }

    // Override console.error to capture detailed information
    console.error = (...args) => {
      // Call original method
      originalConsoleError.apply(console, args);
      
      // Extract error information
      let errorMessage = args.map(arg => {
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
      }).join(' ');

      // Create structured error object
      const errorType = classifyError(errorMessage);
      const errorObj = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        message: errorMessage,
        type: errorType,
        severity: determineSeverity({ message: errorMessage }),
        url: window.location.href,
        component: getCurrentComponent(),
        state: 'active', // active, resolved, ignored
        occurrence: 1
      };
      
      // Add to pending batch
      pendingErrors.push(errorObj);
      
      // Batch processing - send after a short delay or when batch size reached
      if (pendingErrors.length === 1) {
        setTimeout(() => processPendingErrors(), 500);
      }
    };

    // Process batched errors
    function processPendingErrors() {
      if (pendingErrors.length === 0) return;
      
      // Merge with existing errors to prevent duplicates
      setErrorLog(prevLog => {
        const updatedLog = [...prevLog];
        
        pendingErrors.forEach(newError => {
          // Check for duplicate errors (similar message)
          const duplicateIndex = updatedLog.findIndex(existing => 
            isSimilarError(existing.message, newError.message)
          );
          
          if (duplicateIndex !== -1) {
            // Update existing error
            updatedLog[duplicateIndex].occurrence += 1;
            updatedLog[duplicateIndex].lastSeen = newError.timestamp;
            // If new error is more severe, update severity
            if (severityRank(newError.severity) > severityRank(updatedLog[duplicateIndex].severity)) {
              updatedLog[duplicateIndex].severity = newError.severity;
            }
          } else {
            // Add new error
            updatedLog.push(newError);
          }
        });
        
        // Keep only the most recent 100 errors
        const trimmedLog = updatedLog.slice(-100);
        
        // Save to localStorage
        try {
          localStorage.setItem('tradeforce_error_log', JSON.stringify(trimmedLog));
        } catch (e) {
          console.warn('Could not save error log to localStorage', e);
        }
        
        return trimmedLog;
      });
      
      // Update error summary
      updateErrorSummary();
      
      // Clear pending errors
      pendingErrors.length = 0;
      
      // Send to server for logging
      sendErrorsToServer([...pendingErrors]);
    }

    // Compare severity levels
    function severityRank(severity) {
      const ranks = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
      return ranks[severity] || 0;
    }

    // Check if two error messages are similar
    function isSimilarError(msg1, msg2) {
      // Create simplified versions of the messages for comparison
      const simplify = (msg) => {
        return msg
          .replace(/[0-9]+/g, 'N') // Replace numbers with N
          .replace(/".+?"|'.+?'/g, 'STR') // Replace strings with STR
          .replace(/\s+/g, ' ') // Normalize whitespace
          .substring(0, 100); // Only compare the first part
      };
      
      const simple1 = simplify(msg1);
      const simple2 = simplify(msg2);
      
      return simple1 === simple2 || 
             simple1.includes(simple2) || 
             simple2.includes(simple1);
    }

    // Try to determine the current React component from the error stack
    function getCurrentComponent() {
      try {
        throw new Error('Stack trace');
      } catch (e) {
        const stackLines = e.stack.split('\n');
        // Look for component names in the stack
        for (const line of stackLines) {
          const componentMatch = line.match(/at ([A-Z][a-zA-Z0-9]+)\s/);
          if (componentMatch && componentMatch[1]) {
            return componentMatch[1];
          }
        }
        return 'Unknown';
      }
    }

    // Update summary statistics
    function updateErrorSummary() {
      setErrorLog(currentLog => {
        // Only process if we have errors
        if (currentLog.length === 0) return currentLog;
        
        // Count errors by type and severity
        const newSummary = {
          totalErrors: currentLog.length,
          criticalErrors: currentLog.filter(e => e.severity === 'critical').length,
          apiErrors: currentLog.filter(e => e.type === 'api').length,
          reactErrors: currentLog.filter(e => e.type === 'react').length,
          databaseErrors: currentLog.filter(e => e.type === 'database').length,
          blockchainErrors: currentLog.filter(e => e.type === 'blockchain').length,
          networkErrors: currentLog.filter(e => e.type === 'network').length,
          timestamp: new Date().toISOString()
        };
        
        // Save summary to localStorage
        try {
          localStorage.setItem('tradeforce_error_summary', JSON.stringify(newSummary));
        } catch (e) {
          console.warn('Could not save error summary to localStorage', e);
        }
        
        setSummary(newSummary);
        return currentLog;
      });
    }

    // Override console.warn
    console.warn = (...args) => {
      // Call original method
      originalConsoleWarn.apply(console, args);
      
      // We don't need to track warnings as heavily as errors
      // but could implement similar logic here if needed
    };
    
    // Listen for unhandled errors
    const errorHandler = (event) => {
      console.error('Unhandled error:', event.error || event.message);
    };
    
    // Listen for unhandled promise rejections
    const rejectionHandler = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    };
    
    // Listen for network connectivity issues
    const onlineHandler = () => {
      console.log('Network connection restored');
    };
    
    const offlineHandler = () => {
      console.error('Network connection lost');
    };
    
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    // Send errors to server for logging
    async function sendErrorsToServer(errorsList) {
      if (!errorsList.length) return;
      
      try {
        await fetch('/api/log-client-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            errors: errorsList,
            url: window.location.href,
            userAgent: navigator.userAgent
          }),
        });
      } catch (e) {
        originalConsoleError.call(console, 'Failed to send errors to server:', e);
      }
    }
    
    // Function to check API endpoints health
    async function checkApiHealth() {
      const endpoints = [
        '/api/mongodb-status',
        '/api/token-discovery/health', 
        '/api/market-data/health', 
        '/api/user-profile/health'
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          if (!response.ok) {
            console.error(`API Health Check: ${endpoint} returned ${response.status}`);
          }
        } catch (error) {
          console.error(`API Health Check: Failed to reach ${endpoint}`, error);
        }
      }
    }
    
    // Periodically check API health
    const healthCheckInterval = setInterval(checkApiHealth, 60000); // Every minute
    
    // Periodically analyze errors and clean up old ones
    const analysisInterval = setInterval(() => {
      // Clean up errors older than 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      setErrorLog(currentLog => {
        const filteredLog = currentLog.filter(error => {
          const errorDate = new Date(error.timestamp);
          return errorDate > oneDayAgo || error.severity === 'critical';
        });
        
        // Only update if we've removed errors
        if (filteredLog.length < currentLog.length) {
          localStorage.setItem('tradeforce_error_log', JSON.stringify(filteredLog));
          return filteredLog;
        }
        return currentLog;
      });
      
      // Update summary after cleanup
      updateErrorSummary();
    }, 3600000); // Every hour
    
    // Clean up
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      clearInterval(healthCheckInterval);
      clearInterval(analysisInterval);
    };
  }, []);

  // Toggle visibility of the error panel
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Mark an error as resolved
  const markAsResolved = (id) => {
    setErrorLog(prevLog => {
      const updatedLog = prevLog.map(error => 
        error.id === id ? {...error, state: 'resolved'} : error
      );
      localStorage.setItem('tradeforce_error_log', JSON.stringify(updatedLog));
      return updatedLog;
    });
  };

  // Ignore an error
  const ignoreError = (id) => {
    setErrorLog(prevLog => {
      const updatedLog = prevLog.map(error => 
        error.id === id ? {...error, state: 'ignored'} : error
      );
      localStorage.setItem('tradeforce_error_log', JSON.stringify(updatedLog));
      return updatedLog;
    });
  };

  // Clear all errors
  const clearAllErrors = () => {
    setErrorLog([]);
    localStorage.removeItem('tradeforce_error_log');
    updateSummary();
  };

  // Update the summary count
  const updateSummary = () => {
    const activeLogs = errorLog.filter(error => error.state === 'active');
    
    setSummary({
      totalErrors: activeLogs.length,
      criticalErrors: activeLogs.filter(e => e.severity === 'critical').length,
      apiErrors: activeLogs.filter(e => e.type === 'api').length,
      reactErrors: activeLogs.filter(e => e.type === 'react').length,
      databaseErrors: activeLogs.filter(e => e.type === 'database').length,
      blockchainErrors: activeLogs.filter(e => e.type === 'blockchain').length,
      networkErrors: activeLogs.filter(e => e.type === 'network').length,
      timestamp: new Date().toISOString()
    });
  };

  // Only render if errors exist or panel is visible
  if (summary.totalErrors === 0 && !isVisible) return null;

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Filter active errors
  const activeErrors = errorLog.filter(error => error.state === 'active');
  
  return (
    <>
      {/* Floating error indicator */}
      <button
        onClick={toggleVisibility}
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg 
          ${summary.criticalErrors > 0 ? 'bg-red-600' : summary.totalErrors > 0 ? 'bg-yellow-600' : 'bg-green-600'}`}
      >
        <span className="text-white font-medium text-sm">
          {summary.totalErrors} {summary.totalErrors === 1 ? 'Error' : 'Errors'}
        </span>
        {summary.criticalErrors > 0 && (
          <span className="bg-white text-red-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
            {summary.criticalErrors} Critical
          </span>
        )}
      </button>

      {/* Full error panel */}
      {isVisible && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white text-lg font-semibold">Error Monitor</h2>
              <div className="flex gap-2">
                <button 
                  onClick={clearAllErrors}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Clear All
                </button>
                <button 
                  onClick={toggleVisibility}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            
            {/* Summary section */}
            <div className="bg-gray-800 border-t border-b border-gray-700 px-6 py-3">
              <div className="grid grid-cols-3 gap-3 md:grid-cols-7 text-center">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-white">{summary.totalErrors}</div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-red-400">{summary.criticalErrors}</div>
                  <div className="text-xs text-gray-400">Critical</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-yellow-400">{summary.reactErrors}</div>
                  <div className="text-xs text-gray-400">React</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-blue-400">{summary.apiErrors}</div>
                  <div className="text-xs text-gray-400">API</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-green-400">{summary.databaseErrors}</div>
                  <div className="text-xs text-gray-400">Database</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-purple-400">{summary.blockchainErrors}</div>
                  <div className="text-xs text-gray-400">Blockchain</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-lg font-semibold text-orange-400">{summary.networkErrors}</div>
                  <div className="text-xs text-gray-400">Network</div>
                </div>
              </div>
            </div>
            
            {/* Error list */}
            <div className="flex-1 overflow-y-auto">
              {activeErrors.length > 0 ? (
                <div className="divide-y divide-gray-800">
                  {activeErrors.map(error => (
                    <div key={error.id} className="px-6 py-4 hover:bg-gray-800/50">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${getSeverityColor(error.severity)}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="text-white font-medium truncate">{error.message.split('\n')[0]}</h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-3">
                              {new Date(error.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="mt-1 text-sm text-gray-400">
                            {error.component && <span className="mr-3">Component: {error.component}</span>}
                            <span className="mr-3">Type: {error.type}</span>
                            {error.occurrence > 1 && <span className="mr-3">Occurrences: {error.occurrence}</span>}
                          </div>
                          
                          {/* Error details (expandable) */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                              Details
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-950 rounded text-xs text-gray-400 overflow-x-auto max-h-40">
                              {error.message}
                            </pre>
                          </details>
                          
                          {/* Action buttons */}
                          <div className="mt-3 flex gap-2">
                            <button 
                              onClick={() => markAsResolved(error.id)}
                              className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded hover:bg-green-900"
                            >
                              Resolved
                            </button>
                            <button 
                              onClick={() => ignoreError(error.id)}
                              className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded hover:bg-gray-700"
                            >
                              Ignore
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500">
                  No active errors
                </div>
              )}
            </div>
            
            {/* Footer with diagnostics link */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 text-center">
              <a 
                href="/diagnostics" 
                target="_blank" 
                className="text-blue-400 hover:underline text-sm"
              >
                Open Complete Diagnostics Dashboard
              </a>
              <div className="text-xs text-gray-500 mt-1">
                Last updated: {summary.timestamp ? new Date(summary.timestamp).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
