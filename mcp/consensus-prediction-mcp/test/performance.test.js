/**
 * Performance Tests
 * 
 * These tests check the performance characteristics of the MCP server under load
 * to ensure it meets scalability requirements.
 */

const { expect } = require('chai');
const nock = require('nock');
const axios = require('axios');
const httpClient = require('../utils/httpClient');

describe('Performance Tests', () => {
  // Set Jest timeout for this test suite
  jest.setTimeout(30000);
  
  // Mock external services before starting tests
  before(function() {
    setupMocks();
  });
  
  after(function() {
    // Clean up
    nock.cleanAll();
    nock.enableNetConnect();
  });
  
  beforeEach(function() {
    // Clear the cache before each test
    httpClient.clearCache();
  });
  
  describe('HTTP Client Performance', function() {
    it('should properly cache responses for improved performance', async function() {
      const url = 'https://api.example.com/performance-test';
      
      // Mock a slow API response (500ms delay)
      nock('https://api.example.com')
        .get('/performance-test')
        .delay(500)
        .reply(200, { data: 'test' });
      
      // First request - should be slow
      const start1 = Date.now();
      await httpClient.get(url, {}, { useCache: true, ttl: 60000 });
      const time1 = Date.now() - start1;
      
      // Second request - should be much faster due to cache
      const start2 = Date.now();
      await httpClient.get(url, {}, { useCache: true, ttl: 60000 });
      const time2 = Date.now() - start2;
      
      // Cached response should be at least 10x faster
      expect(time2 * 10).to.be.lessThan(time1);
      expect(time2).to.be.lessThan(50); // Should be very fast (< 50ms)
    });
    
    it('should handle concurrent requests efficiently', async function() {
      const url = 'https://api.example.com/concurrent-test';
      
      // Mock API response with delay
      nock('https://api.example.com')
        .get('/concurrent-test')
        .times(20) // Allow up to 20 requests
        .delay(100)
        .reply(200, { data: 'concurrent test' });
      
      // Create 10 concurrent requests
      const concurrentRequests = 10;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(httpClient.get(url));
      }
      
      // Wait for all requests to complete
      const start = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - start;
      
      // If requests were truly concurrent, this should take just slightly more than 100ms
      // If they were sequential, it would take 100ms * 10 = 1000ms
      expect(totalTime).to.be.lessThan(500);
      expect(results.length).to.equal(concurrentRequests);
      results.forEach(result => {
        expect(result).to.deep.equal({ data: 'concurrent test' });
      });
    });
  });
  
  describe('Circuit Breaker Performance', function() {
    it('should quickly reject requests when circuit is open', async function() {
      const url = 'https://api.example.com/circuit-breaker-test';
      
      // Create 5 failing responses to trigger circuit breaker
      nock('https://api.example.com')
        .get('/circuit-breaker-test')
        .times(5)
        .reply(500, { error: 'Server error' });
      
      // Trigger circuit breaker by making 5 failing requests
      for (let i = 0; i < 5; i++) {
        try {
          await httpClient.get(url);
        } catch (err) {
          // Expected error
        }
      }
      
      // Now the circuit should be open
      const start = Date.now();
      try {
        await httpClient.get(url);
        expect.fail('Should have thrown circuit breaker error');
      } catch (err) {
        const timeToReject = Date.now() - start;
        
        // Circuit breaker rejection should be very fast (< 10ms)
        expect(timeToReject).to.be.lessThan(10);
        expect(err.message).to.include('circuit breaker open');
      }
    });
  });
  
  describe('Cache Eviction Performance', function() {
    it('should maintain performance with large number of cached items', async function() {
      // Cache many items (100)
      for (let i = 0; i < 100; i++) {
        const url = `https://api.example.com/cache-test-${i}`;
        
        nock('https://api.example.com')
          .get(`/cache-test-${i}`)
          .reply(200, { index: i });
        
        await httpClient.get(url, {}, { useCache: true, ttl: 60000 });
      }
      
      // Get cache stats
      const stats = httpClient.getCacheStats();
      expect(stats.totalItems).to.equal(100);
      
      // Test performance of adding one more item
      const start = Date.now();
      nock('https://api.example.com')
        .get('/cache-test-new')
        .reply(200, { new: true });
        
      await httpClient.get('https://api.example.com/cache-test-new', {}, { useCache: true });
      const timeToAdd = Date.now() - start;
      
      // Adding to a large cache should still be fast
      expect(timeToAdd).to.be.lessThan(50);
    });
  });
});

/**
 * Setup mock responses for external APIs
 */
function setupMocks() {
  // Disable real network connections
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1'); // Allow localhost connections
  
  // Mock various API responses
  nock('https://api.example.com')
    .persist()
    .get('/basic-test')
    .reply(200, { success: true });
  
  // Add more mock responses as needed
}
