/**
 * CircuitBreaker unit tests
 */

const { CircuitBreaker, STATES } = require('../utils/circuitBreaker');

describe('CircuitBreaker', () => {
  let circuitBreaker;
  let mockLogger;
  
  beforeEach(() => {
    // Create a mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    // Create a new circuit breaker for each test
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      halfOpenMaxCalls: 2
    }, mockLogger);
  });
  
  describe('initialization', () => {
    test('should initialize with default config if none provided', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.config).toBeDefined();
      expect(defaultBreaker.config.failureThreshold).toBe(5);
    });
    
    test('should use provided config', () => {
      expect(circuitBreaker.config.failureThreshold).toBe(3);
      expect(circuitBreaker.config.resetTimeout).toBe(1000);
    });
  });
  
  describe('get', () => {
    test('should create a new breaker if one does not exist', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      
      expect(breaker).toBeDefined();
      expect(breaker.state).toBe(STATES.CLOSED);
      expect(breaker.failures).toBe(0);
    });
    
    test('should return existing breaker if one exists', () => {
      const firstCall = circuitBreaker.get('test-endpoint');
      firstCall.failures = 1;
      
      const secondCall = circuitBreaker.get('test-endpoint');
      
      expect(secondCall).toBe(firstCall);
      expect(secondCall.failures).toBe(1);
    });
  });
  
  describe('recordSuccess', () => {
    test('should reset failure count when in CLOSED state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.failures = 2;
      
      circuitBreaker.recordSuccess('test-endpoint');
      
      expect(breaker.failures).toBe(0);
    });
    
    test('should increment success count when in HALF_OPEN state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.HALF_OPEN;
      
      circuitBreaker.recordSuccess('test-endpoint');
      
      expect(breaker.successCount).toBe(1);
    });
    
    test('should transition to CLOSED state after enough successes in HALF_OPEN state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.HALF_OPEN;
      
      // Need 2 successful calls to close the circuit (config.halfOpenMaxCalls)
      circuitBreaker.recordSuccess('test-endpoint');
      circuitBreaker.recordSuccess('test-endpoint');
      
      expect(breaker.state).toBe(STATES.CLOSED);
      expect(mockLogger.debug).toHaveBeenCalled();
    });
  });
  
  describe('recordFailure', () => {
    test('should increment failure count', () => {
      circuitBreaker.recordFailure('test-endpoint');
      
      const breaker = circuitBreaker.get('test-endpoint');
      expect(breaker.failures).toBe(1);
      expect(breaker.lastFailure).toBeDefined();
    });
    
    test('should transition to OPEN state if failure threshold is reached', () => {
      // Need 3 failures to open circuit (config.failureThreshold)
      circuitBreaker.recordFailure('test-endpoint');
      circuitBreaker.recordFailure('test-endpoint');
      circuitBreaker.recordFailure('test-endpoint');
      
      const breaker = circuitBreaker.get('test-endpoint');
      expect(breaker.state).toBe(STATES.OPEN);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
    
    test('should transition from HALF_OPEN to OPEN state on failure', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.HALF_OPEN;
      
      circuitBreaker.recordFailure('test-endpoint');
      
      expect(breaker.state).toBe(STATES.OPEN);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
  
  describe('canCall', () => {
    test('should always allow calls when in CLOSED state', () => {
      expect(circuitBreaker.canCall('test-endpoint')).toBe(true);
    });
    
    test('should not allow calls when in OPEN state before reset timeout', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.OPEN;
      breaker.lastFailure = Date.now();
      
      expect(circuitBreaker.canCall('test-endpoint')).toBe(false);
    });
    
    test('should transition to HALF_OPEN and allow call after reset timeout', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.OPEN;
      breaker.lastFailure = Date.now() - 2000; // More than reset timeout (1000ms)
      
      expect(circuitBreaker.canCall('test-endpoint')).toBe(true);
      expect(breaker.state).toBe(STATES.HALF_OPEN);
      expect(mockLogger.info).toHaveBeenCalled();
    });
    
    test('should allow limited calls in HALF_OPEN state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.HALF_OPEN;
      
      // Can make up to 2 calls in HALF_OPEN state (config.halfOpenMaxCalls)
      expect(circuitBreaker.canCall('test-endpoint')).toBe(true);
      expect(circuitBreaker.canCall('test-endpoint')).toBe(true);
      expect(circuitBreaker.canCall('test-endpoint')).toBe(false);
    });
  });
  
  describe('forceState', () => {
    test('should manually change state', () => {
      circuitBreaker.forceState('test-endpoint', STATES.OPEN);
      
      const breaker = circuitBreaker.get('test-endpoint');
      expect(breaker.state).toBe(STATES.OPEN);
      expect(mockLogger.info).toHaveBeenCalled();
    });
    
    test('should reset counters when changing to CLOSED state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.failures = 2;
      breaker.halfOpenCalls = 1;
      
      circuitBreaker.forceState('test-endpoint', STATES.CLOSED);
      
      expect(breaker.failures).toBe(0);
      expect(breaker.halfOpenCalls).toBe(0);
    });
    
    test('should throw error for invalid state', () => {
      expect(() => {
        circuitBreaker.forceState('test-endpoint', 'INVALID_STATE');
      }).toThrow();
    });
  });
  
  describe('reset', () => {
    test('should reset to CLOSED state', () => {
      const breaker = circuitBreaker.get('test-endpoint');
      breaker.state = STATES.OPEN;
      breaker.failures = 3;
      
      circuitBreaker.reset('test-endpoint');
      
      expect(breaker.state).toBe(STATES.CLOSED);
      expect(breaker.failures).toBe(0);
    });
  });
  
  describe('getStatus', () => {
    test('should return all circuit breakers status', () => {
      // Setup multiple breakers
      circuitBreaker.get('endpoint-1').failures = 1;
      circuitBreaker.get('endpoint-2').state = STATES.OPEN;
      
      const status = circuitBreaker.getStatus();
      
      expect(status['endpoint-1']).toBeDefined();
      expect(status['endpoint-1'].failures).toBe(1);
      expect(status['endpoint-1'].isOpen).toBe(false);
      
      expect(status['endpoint-2']).toBeDefined();
      expect(status['endpoint-2'].state).toBe(STATES.OPEN);
      expect(status['endpoint-2'].isOpen).toBe(true);
    });
  });
});
