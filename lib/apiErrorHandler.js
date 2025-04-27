// filepath: c:\Users\pablo\Projects\embassy-trade-motia\web\lib\apiErrorHandler.js
'use client';

import logger from './logger.js';

/**
 * API Error Handler
 * 
 * Provides consistent error handling and monitoring for API calls
 */
class ApiErrorHandler {
  /**
   * Create a wrapped fetch function with error handling
   * 
   * @param {Function} fetchFn - The fetch function to wrap
   * @param {string} endpoint - The API endpoint being called
   * @returns {Function} - Wrapped fetch function
   */
  static wrapFetch(fetchFn, endpoint) {
    return async (...args) => {
      const startTime = Date.now();
      try {
        const response = await fetchFn(...args);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log successful API calls that take longer than 1 second
        if (duration > 1000) {
          logger.warn(`Slow API call to ${endpoint}: ${duration}ms`);
        }
        
        // Check if the response is ok
        if (!response.ok) {
          const errorText = await response.text();
          let errorJson;
          
          try {
            errorJson = JSON.parse(errorText);
          } catch (e) {
            // Not a JSON response
          }
          
          const errorMessage = errorJson?.error || errorJson?.message || `HTTP error ${response.status}`;
          
          logger.error(`API error for ${endpoint}: ${errorMessage}`);
          throw new Error(errorMessage);
        }
        
        return response;
      } catch (error) {
        // Log all API errors
        logger.error(`API call to ${endpoint} failed: ${error.message}`);
        
        // Rethrow with additional context
        error.endpoint = endpoint;
        error.timestamp = new Date().toISOString();
        throw error;
      }
    };
  }

  /**
   * Create a wrapped API client with error handling for all methods
   * 
   * @param {Object} apiClient - The API client object
   * @returns {Object} - Wrapped API client
   */
  static wrapApiClient(apiClient) {
    const wrappedClient = {};
    
    for (const key of Object.keys(apiClient)) {
      if (typeof apiClient[key] === 'function') {
        wrappedClient[key] = (...args) => {
          try {
            return apiClient[key](...args);
          } catch (error) {
            logger.error(`API client error for ${key}: ${error.message}`);
            throw error;
          }
        };
      } else {
        wrappedClient[key] = apiClient[key];
      }
    }
    
    return wrappedClient;
  }
  
  /**
   * Handle API errors consistently
   * 
   * @param {Error} error - The error to handle
   * @param {string} defaultMessage - Default message if error doesn't have one
   * @returns {string} - User-friendly error message
   */
  static getErrorMessage(error, defaultMessage = 'An error occurred') {
    // Extract most user-friendly error message
    if (error.response && error.response.data) {
      return error.response.data.message || error.response.data.error || defaultMessage;
    }
    
    return error.message || defaultMessage;
  }
}

export default ApiErrorHandler;
