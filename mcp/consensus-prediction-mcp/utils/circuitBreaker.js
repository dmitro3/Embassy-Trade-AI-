/**
 * Circuit Breaker Pattern
 * 
 * This module provides a standalone implementation of the circuit breaker pattern
 * to increase system resilience and prevent cascading failures.
 */

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG = {
  failureThreshold: 5,   // Number of failures before opening the circuit
  resetTimeout: 30000,   // Time in ms to wait before attempting to reset (30 seconds)
  halfOpenMaxCalls: 2    // Maximum calls allowed in half-open state
};

/**
 * Circuit breaker states
 */
const STATES = {
  CLOSED: 'CLOSED',       // Normal operation - calls pass through
  OPEN: 'OPEN',           // Failing - calls are blocked 
  HALF_OPEN: 'HALF_OPEN'  // Testing - limited calls allowed to test recovery
};

/**
 * Circuit Breaker class
 */
class CircuitBreaker {
  /**
   * Create a new circuit breaker
   * 
   * @param {Object} options Configuration options
   * @param {Object} logger Logger instance
   */
  constructor(options = {}, logger = console) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    this.logger = logger;
    this.breakers = {};
  }
  
  /**
   * Get a circuit breaker for a specific endpoint
   * 
   * @param {string} endpoint The endpoint to get a breaker for
   * @returns {Object} The circuit breaker
   */
  get(endpoint) {
    if (!this.breakers[endpoint]) {
      this.breakers[endpoint] = {
        state: STATES.CLOSED,  // Start in closed state
        failures: 0,           // No failures yet
        lastFailure: null,     // No failures yet
        halfOpenCalls: 0,      // No calls in half-open state
        successCount: 0        // Track consecutive successes
      };
    }
    
    return this.breakers[endpoint];
  }
  
  /**
   * Record a successful call
   * 
   * @param {string} endpoint The endpoint that was called
   */
  recordSuccess(endpoint) {
    const breaker = this.get(endpoint);
    
    if (breaker.state === STATES.HALF_OPEN) {
      breaker.successCount++;
      
      // If we've seen enough consecutive successes, close the circuit
      if (breaker.successCount >= this.config.halfOpenMaxCalls) {
        breaker.state = STATES.CLOSED;
        breaker.failures = 0;
        breaker.halfOpenCalls = 0;
        
        this.logger.debug(`Circuit breaker for ${endpoint} is now ${STATES.CLOSED} after successful recovery`);
      }
    } else {
      // In CLOSED state, just reset counters
      breaker.failures = 0;
      breaker.successCount = 0;
    }
  }
  
  /**
   * Record a failed call
   * 
   * @param {string} endpoint The endpoint that failed
   */
  recordFailure(endpoint) {
    const breaker = this.get(endpoint);
    breaker.failures++;
    breaker.lastFailure = Date.now();
    breaker.successCount = 0;
    
    // If we've reached the failure threshold, open the circuit
    if (breaker.state === STATES.CLOSED && breaker.failures >= this.config.failureThreshold) {
      breaker.state = STATES.OPEN;
      this.logger.warn(`Circuit breaker for ${endpoint} is now ${STATES.OPEN} after ${breaker.failures} failures`);
    }
    
    // If we're in half-open state, go back to open after a failure
    if (breaker.state === STATES.HALF_OPEN) {
      breaker.state = STATES.OPEN;
      this.logger.warn(`Circuit breaker for ${endpoint} returned to ${STATES.OPEN} state after failure in half-open state`);
    }
  }
  
  /**
   * Check if a call should be allowed
   * 
   * @param {string} endpoint The endpoint to check
   * @returns {boolean} Whether the call should be allowed
   */
  canCall(endpoint) {
    const breaker = this.get(endpoint);
    
    // If closed, always allow
    if (breaker.state === STATES.CLOSED) {
      return true;
    }
    
    // If open, check if reset timeout has elapsed
    if (breaker.state === STATES.OPEN) {
      const now = Date.now();
      const elapsed = now - (breaker.lastFailure || 0);
      
      if (elapsed >= this.config.resetTimeout) {
        // Transition to half-open state
        breaker.state = STATES.HALF_OPEN;
        breaker.halfOpenCalls = 0;
        breaker.successCount = 0;
        this.logger.info(`Circuit breaker for ${endpoint} is now ${STATES.HALF_OPEN}, testing service availability`);
        return true;
      }
      
      // Still in timeout period, don't allow the call
      return false;
    }
    
    // In half-open state, allow limited calls
    if (breaker.halfOpenCalls < this.config.halfOpenMaxCalls) {
      breaker.halfOpenCalls++;
      return true;
    }
    
    return false;
  }
  
  /**
   * Force a circuit breaker to a specific state
   * 
   * @param {string} endpoint The endpoint to reset
   * @param {string} state The state to set (CLOSED, OPEN, HALF_OPEN)
   * @returns {Object} The updated breaker
   */
  forceState(endpoint, state) {
    if (!Object.values(STATES).includes(state)) {
      throw new Error(`Invalid state: ${state}. Must be one of ${Object.values(STATES).join(', ')}`);
    }
    
    const breaker = this.get(endpoint);
    const prevState = breaker.state;
    
    breaker.state = state;
    
    if (state === STATES.CLOSED) {
      breaker.failures = 0;
      breaker.halfOpenCalls = 0;
      breaker.successCount = 0;
    } else if (state === STATES.HALF_OPEN) {
      breaker.halfOpenCalls = 0;
      breaker.successCount = 0;
    }
    
    this.logger.info(`Circuit breaker for ${endpoint} manually changed from ${prevState} to ${state}`);
    
    return breaker;
  }
  
  /**
   * Reset a circuit breaker to closed state
   * 
   * @param {string} endpoint The endpoint to reset
   * @returns {Object} The reset breaker
   */
  reset(endpoint) {
    return this.forceState(endpoint, STATES.CLOSED);
  }
  
  /**
   * Get the status of all circuit breakers
   * 
   * @returns {Object} Status of all circuit breakers
   */
  getStatus() {
    const status = {};
    
    for (const endpoint in this.breakers) {
      status[endpoint] = {
        ...this.breakers[endpoint],
        isOpen: this.breakers[endpoint].state !== STATES.CLOSED
      };
    }
    
    return status;
  }
}

module.exports = {
  CircuitBreaker,
  STATES
};
