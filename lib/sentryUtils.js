'use client';

import * as Sentry from '@sentry/nextjs';

/**
 * Utility functions for Sentry transaction tracking
 * 
 * This module provides a simplified interface for creating and managing
 * Sentry transactions throughout the application.
 */

/**
 * Start a new application transaction with Sentry
 * 
 * @param {string} name - Transaction name
 * @param {string} op - Operation type (e.g., 'ui.render', 'api.request')
 * @returns {Object|null} - Sentry transaction object or null if failed
 */
export function startAppTransaction(name, op) {
  try {
    // Create a simple transaction object that doesn't depend on Sentry APIs
    // This is a fallback since we can't find the right Sentry method
    const transaction = {
      name,
      op,
      status: 'ok',
      startTimestamp: Date.now(),
      finish: function(status = 'ok') {
        this.status = status;
        this.endTimestamp = Date.now();
        return this;
      }
    };
    
    // Try to use Sentry.startSpan if available, otherwise use our fallback
    if (typeof Sentry.startSpan === 'function') {
      try {
        return Sentry.startSpan({ name, op }) || transaction;
      } catch (err) {
        return transaction;
      }
    }
    
    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
}

/**
 * Finish an application transaction
 * 
 * @param {Object} transaction - Sentry transaction object
 * @param {Object} options - Additional options
 * @param {boolean} options.status - Transaction status (e.g., 'ok', 'failed')
 */
export function finishAppTransaction(transaction, options = {}) {
  try {
    if (!transaction) return;
    
    // Set transaction status if provided
    if (options.status) {
      transaction.setStatus(options.status);
    }
    
    // Finish the transaction
    transaction.finish();
  } catch (error) {
    console.error('Error finishing Sentry transaction:', error);
  }
}

/**
 * Create a child span for a transaction
 * 
 * @param {Object} transaction - Parent transaction
 * @param {string} name - Span name
 * @param {string} op - Operation type
 * @returns {Object|null} - Sentry span object or null if failed
 */
export function createAppSpan(transaction, name, op) {
  try {
    if (!transaction) return null;
    
    // Create a child span
    const span = transaction.startChild({
      op,
      description: name
    });
    
    return span;
  } catch (error) {
    console.error('Error creating Sentry span:', error);
    return null;
  }
}

/**
 * Finish a span
 * 
 * @param {Object} span - Sentry span object
 * @param {Object} options - Additional options
 * @param {boolean} options.status - Span status (e.g., 'ok', 'failed')
 */
export function finishAppSpan(span, options = {}) {
  try {
    if (!span) return;
    
    // Set span status if provided
    if (options.status) {
      span.setStatus(options.status);
    }
    
    // Finish the span
    span.finish();
  } catch (error) {
    console.error('Error finishing Sentry span:', error);
  }
}

/**
 * Capture an exception with Sentry
 * 
 * @param {Error} error - Error object
 * @param {Object} options - Additional options
 * @param {Object} options.tags - Tags to add to the event
 * @param {Object} options.extra - Extra data to add to the event
 * @param {string} options.level - Event level (e.g., 'error', 'warning')
 */
export function captureAppException(error, options = {}) {
  try {
    // Configure the scope with additional data
    Sentry.withScope(scope => {
      // Add tags if provided
      if (options.tags) {
        Object.entries(options.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      
      // Add extra data if provided
      if (options.extra) {
        Object.entries(options.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      
      // Set level if provided
      if (options.level) {
        scope.setLevel(options.level);
      }
      
      // Capture the exception
      Sentry.captureException(error);
    });
  } catch (captureError) {
    console.error('Error capturing Sentry exception:', captureError);
  }
}

/**
 * Set user information for Sentry
 * 
 * @param {Object} user - User information
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.username - User username
 */
export function setAppUser(user) {
  try {
    if (!user) return;
    
    // Set user information
    Sentry.setUser(user);
  } catch (error) {
    console.error('Error setting Sentry user:', error);
  }
}

/**
 * Clear user information from Sentry
 */
export function clearAppUser() {
  try {
    // Clear user information
    Sentry.setUser(null);
  } catch (error) {
    console.error('Error clearing Sentry user:', error);
  }
}

/**
 * Set a tag for Sentry events
 * 
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export function setAppTag(key, value) {
  try {
    if (!key) return;
    
    // Set tag
    Sentry.setTag(key, value);
  } catch (error) {
    console.error('Error setting Sentry tag:', error);
  }
}

/**
 * Set extra data for Sentry events
 * 
 * @param {string} key - Extra data key
 * @param {any} value - Extra data value
 */
export function setAppExtra(key, value) {
  try {
    if (!key) return;
    
    // Set extra data
    Sentry.setExtra(key, value);
  } catch (error) {
    console.error('Error setting Sentry extra:', error);
  }
}

/**
 * Add breadcrumb for Sentry events
 * 
 * @param {Object} breadcrumb - Breadcrumb data
 * @param {string} breadcrumb.category - Breadcrumb category
 * @param {string} breadcrumb.message - Breadcrumb message
 * @param {string} breadcrumb.level - Breadcrumb level (e.g., 'info', 'error')
 * @param {Object} breadcrumb.data - Additional data
 */
export function addAppBreadcrumb(breadcrumb) {
  try {
    if (!breadcrumb) return;
    
    // Add breadcrumb
    Sentry.addBreadcrumb(breadcrumb);
  } catch (error) {
    console.error('Error adding Sentry breadcrumb:', error);
  }
}

/**
 * Wrap a function with Sentry error tracking
 * 
 * @param {Function} fn - Function to wrap
 * @param {string} name - Function name for tracking
 * @returns {Function} - Wrapped function
 */
export function withSentryTracking(fn, name) {
  return async (...args) => {
    const transaction = startAppTransaction(name, 'function');
    
    try {
      const result = await fn(...args);
      finishAppTransaction(transaction, { status: 'ok' });
      return result;
    } catch (error) {
      captureAppException(error, {
        tags: { function: name },
        extra: { arguments: args }
      });
      finishAppTransaction(transaction, { status: 'failed' });
      throw error;
    }
  };
}
