/**
 * HTTP Client Tests
 * 
 * Unit tests for the HTTP client functionality with caching, retry logic,
 * and circuit breaker pattern.
 */

const chai = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const expect = chai.expect;
const nock = require('nock');

// Import the module to test
const httpClient = require('../utils/httpClient');
const { logger } = require('../utils/logger');

describe('HTTP Client', () => {
  // Silence logger during tests
  let loggerStub;
  
  beforeEach(() => {
    // Mock logger to avoid cluttering test output
    loggerStub = {
      debug: sinon.stub(logger, 'debug'),
      info: sinon.stub(logger, 'info'),
      warn: sinon.stub(logger, 'warn'),
      error: sinon.stub(logger, 'error')
    };
    
    // Disable real HTTP requests
    nock.disableNetConnect();
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
    
    // Clean up nock
    nock.cleanAll();
    nock.enableNetConnect();
  });
  
  describe('cache management', () => {
    it('should clear the cache', () => {
      const result = httpClient.clearCache();
      expect(result.success).to.be.true;
      expect(result.message).to.include('cleared successfully');
    });
    
    it('should return cache statistics', () => {
      const result = httpClient.getCacheStats();
      expect(result.success).to.be.true;
      expect(result.stats).to.have.property('totalItems');
      expect(result.stats).to.have.property('validItems');
    });
  });
  
  describe('circuit breaker management', () => {
    it('should return circuit breaker status', () => {
      const result = httpClient.getCircuitBreakerStatus();
      expect(result.success).to.be.true;
      expect(result.breakers).to.be.an('object');
    });
    
    it('should reset a circuit breaker', () => {
      // First we need to trigger a circuit breaker
      const endpoint = 'test.example.com';
      
      // Create a private reference to the circuitBreakers object
      const circuitBreakers = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(httpClient.resetCircuitBreaker), 'caller'
      ).value.arguments[0].circuitBreakers;
      
      // Manually set a breaker to OPEN state
      circuitBreakers.breakers[endpoint] = {
        state: 'OPEN',
        failures: 10,
        lastFailure: Date.now(),
        halfOpenCalls: 0
      };
      
      // Reset the breaker
      const result = httpClient.resetCircuitBreaker(endpoint);
      expect(result.success).to.be.true;
      expect(result.message).to.include('reset from OPEN to CLOSED');
      
      // Verify it's closed
      const status = httpClient.getCircuitBreakerStatus();
      expect(status.breakers[endpoint].state).to.equal('CLOSED');
    });
  });
  
  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      // Setup mock
      const mockResponse = { data: 'test data' };
      nock('https://api.example.com')
        .get('/test')
        .reply(200, mockResponse);
      
      // Make request
      const result = await httpClient.get('https://api.example.com/test');
      expect(result).to.deep.equal(mockResponse);
    });
    
    it('should use cache for repeated requests', async () => {
      // Setup mock to only respond once
      const mockResponse = { data: 'cached data' };
      nock('https://api.example.com')
        .get('/cached')
        .once()
        .reply(200, mockResponse);
      
      // First request (should hit the API)
      const result1 = await httpClient.get('https://api.example.com/cached', {}, { useCache: true, ttl: 60000 });
      expect(result1).to.deep.equal(mockResponse);
      
      // Second request (should hit cache)
      const result2 = await httpClient.get('https://api.example.com/cached', {}, { useCache: true, ttl: 60000 });
      expect(result2).to.deep.equal(mockResponse);
      
      // Ensure the logger was called with cache hit message
      expect(loggerStub.debug.calledWith(sinon.match(/Cache hit for/))).to.be.true;
    });
    
    it('should retry failed requests', async () => {
      // Setup mock to fail twice then succeed
      const mockResponse = { data: 'success after retry' };
      nock('https://api.example.com')
        .get('/retry')
        .times(2)
        .reply(500, { error: 'server error' });
        
      nock('https://api.example.com')
        .get('/retry')
        .reply(200, mockResponse);
      
      // Make request with reduced retry delay for faster test
      const result = await httpClient.get('https://api.example.com/retry', {}, {}, { 
        maxRetries: 2,
        initialDelay: 10 // Use small delay for test
      });
      
      expect(result).to.deep.equal(mockResponse);
      expect(loggerStub.warn.calledWith(sinon.match(/Retrying GET request/))).to.be.true;
    });
    
    it('should throw error when max retries exceeded', async () => {
      // Setup mock to always fail
      nock('https://api.example.com')
        .get('/fail')
        .times(4) // original + 3 retries
        .reply(500, { error: 'persistent server error' });
      
      try {
        await httpClient.get('https://api.example.com/fail', {}, {}, { 
          maxRetries: 3,
          initialDelay: 10 // Use small delay for test
        });
        // Should not reach here
        expect.fail('Expected request to fail');
      } catch (error) {
        expect(error.message).to.include('HTTP error: 500');
        expect(loggerStub.error.calledWith(sinon.match(/HTTP error for GET.*after/))).to.be.true;
      }
    });
  });
  
  describe('POST requests', () => {
    it('should make a successful POST request', async () => {
      // Setup mock
      const postData = { key: 'value' };
      const mockResponse = { success: true };
      nock('https://api.example.com')
        .post('/submit', postData)
        .reply(200, mockResponse);
      
      // Make request
      const result = await httpClient.post('https://api.example.com/submit', postData);
      expect(result).to.deep.equal(mockResponse);
    });
    
    it('should retry failed POST requests', async () => {
      // Setup mock to fail once then succeed
      const postData = { key: 'retry value' };
      const mockResponse = { success: true };
      nock('https://api.example.com')
        .post('/submit-retry', postData)
        .reply(503, { error: 'service unavailable' });
        
      nock('https://api.example.com')
        .post('/submit-retry', postData)
        .reply(200, mockResponse);
      
      // Make request
      const result = await httpClient.post('https://api.example.com/submit-retry', postData, {}, { 
        maxRetries: 1,
        initialDelay: 10 // Use small delay for test
      });
      
      expect(result).to.deep.equal(mockResponse);
      expect(loggerStub.warn.calledWith(sinon.match(/Retrying POST request/))).to.be.true;
    });
  });
  
  describe('configuration', () => {
    it('should update retry configuration', () => {
      const config = {
        retry: {
          maxRetries: 5,
          initialDelay: 2000
        }
      };
      
      const result = httpClient.configure(config);
      expect(result.success).to.be.true;
      expect(result.configuration.retry.maxRetries).to.equal(5);
      expect(result.configuration.retry.initialDelay).to.equal(2000);
    });
    
    it('should update circuit breaker configuration', () => {
      const config = {
        circuitBreaker: {
          failureThreshold: 10,
          resetTimeout: 60000
        }
      };
      
      const result = httpClient.configure(config);
      expect(result.success).to.be.true;
      expect(result.configuration.circuitBreaker.failureThreshold).to.equal(10);
      expect(result.configuration.circuitBreaker.resetTimeout).to.equal(60000);
    });
  });
});
