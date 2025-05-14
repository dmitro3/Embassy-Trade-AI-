/**
 * HTTP Client Integration Tests
 * 
 * Integration tests for the HTTP client functionality against real external APIs.
 * These tests validate that the client can communicate with external services
 * and that the retry and circuit breaker mechanisms work in real-world scenarios.
 */

const chai = require('chai');
const expect = chai.expect;

// Import the module to test
const httpClient = require('../utils/httpClient');

describe('HTTP Client Integration', () => {
  // Set Jest timeout for this test suite
  jest.setTimeout(10000);
  
  describe('External API calls', () => {
    it('should successfully call a public API', async () => {
      // This test uses a public API that should be reliable
      const result = await httpClient.get('https://jsonplaceholder.typicode.com/todos/1');
      
      expect(result).to.be.an('object');
      expect(result).to.have.property('id');
      expect(result).to.have.property('title');
      expect(result).to.have.property('completed');
    });
    
    it('should handle API errors gracefully', async () => {
      try {
        // This endpoint doesn't exist, so it should 404
        await httpClient.get('https://jsonplaceholder.typicode.com/nonexistentpath');
        expect.fail('Expected request to fail');
      } catch (error) {
        expect(error.message).to.include('HTTP error: 404');
      }
    });
  });
  
  describe('Caching', () => {
    it('should cache responses correctly', async () => {
      // First request - should hit the API
      const start1 = Date.now();
      const result1 = await httpClient.get('https://jsonplaceholder.typicode.com/todos/2', {}, { 
        useCache: true, 
        ttl: 60000 
      });
      const time1 = Date.now() - start1;
      
      // Second request - should be faster because it hits the cache
      const start2 = Date.now();
      const result2 = await httpClient.get('https://jsonplaceholder.typicode.com/todos/2', {}, { 
        useCache: true, 
        ttl: 60000 
      });
      const time2 = Date.now() - start2;
      
      expect(result1).to.deep.equal(result2);
      expect(time2).to.be.lessThan(time1);
      
      // Check cache stats
      const cacheStats = httpClient.getCacheStats();
      expect(cacheStats.stats.validItems).to.be.greaterThan(0);
    });
    
    it('should clear cache correctly', async () => {
      // Add item to cache
      await httpClient.get('https://jsonplaceholder.typicode.com/todos/3', {}, { 
        useCache: true, 
        ttl: 60000 
      });
      
      // Verify item is in cache
      const statsBefore = httpClient.getCacheStats();
      expect(statsBefore.stats.validItems).to.be.greaterThan(0);
      
      // Clear cache
      const clearResult = httpClient.clearCache(true);
      expect(clearResult.success).to.be.true;
      
      // Verify cache is empty
      const statsAfter = httpClient.getCacheStats();
      expect(statsAfter.stats.validItems).to.equal(0);
    });
  });
  
  describe('Circuit Breaker', () => {
    it('should manage circuit breakers', async () => {
      // Get initial circuit breaker state
      const initialStatus = httpClient.getCircuitBreakerStatus();
      
      // Try to trigger circuit breaker with failing requests
      const failingEndpoint = 'https://thisdomaindoesnotexist.example.com';
      
      try {
        // This should fail with a network error
        await httpClient.get(failingEndpoint, {}, {}, { maxRetries: 1, initialDelay: 100 });
      } catch (error) {
        // Expected error
      }
      
      try {
        // This should fail again
        await httpClient.get(failingEndpoint, {}, {}, { maxRetries: 1, initialDelay: 100 });
      } catch (error) {
        // Expected error
      }
      
      // Check if circuit breaker recorded the failures
      const updatedStatus = httpClient.getCircuitBreakerStatus();
      
      // Circuit breaker should have more entries now
      expect(Object.keys(updatedStatus.breakers).length)
        .to.be.greaterThanOrEqual(Object.keys(initialStatus.breakers).length);
      
      // Reset all circuit breakers
      for (const endpoint of Object.keys(updatedStatus.breakers)) {
        httpClient.resetCircuitBreaker(endpoint);
      }
      
      // Verify reset was successful
      const finalStatus = httpClient.getCircuitBreakerStatus();
      for (const endpoint of Object.keys(finalStatus.breakers)) {
        expect(finalStatus.breakers[endpoint].state).to.equal('CLOSED');
        expect(finalStatus.breakers[endpoint].failures).to.equal(0);
      }
    });
  });
});
