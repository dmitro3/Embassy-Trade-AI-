'use client';

import logger from './logger';

/**
 * API Health Service
 * 
 * Provides functions to check the health of various APIs used in the application
 * and maintains statistics on API performance and availability
 */
class ApiHealthService {
  constructor() {
    this.healthStats = {
      shyft: {
        totalChecks: 0,
        successChecks: 0,
        lastCheckTime: null,
        lastStatus: null,
        responseTime: []  // Array of recent response times in ms
      },
      birdeye: {
        totalChecks: 0,
        successChecks: 0,
        lastCheckTime: null,
        lastStatus: null,
        responseTime: []
      },
      firebase: {
        totalChecks: 0,
        successChecks: 0,
        lastCheckTime: null,
        lastStatus: null,
        responseTime: []
      }
    };
    
    // Only keep the last 10 response times
    this.MAX_RESPONSE_TIMES = 10;
  }

  /**
   * Check the health of the Shyft API
   * 
   * @returns {Promise<Object>} - Health check result
   */
  async checkShyftHealth(apiKey) {
    const startTime = Date.now();
    this.healthStats.shyft.totalChecks++;
    this.healthStats.shyft.lastCheckTime = new Date();
    
    try {
      if (!apiKey) {
        throw new Error('No API key provided');
      }
      
      // Test endpoint that should always work if API is up
      const testUrl = `https://devnet-rpc.shyft.to/health?api_key=${apiKey}`;
      
      const response = await fetch(testUrl, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 5000  // 5 second timeout
      });
      
      // Record response time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      this.addResponseTime('shyft', responseTime);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.status === 'ok') {
        this.healthStats.shyft.successChecks++;
        this.healthStats.shyft.lastStatus = 'healthy';
        
        logger.info('Shyft API health check passed', { 
          module: 'apiHealth',
          responseTime 
        });
        
        return {
          healthy: true,
          responseTime,
          message: 'Shyft API is operational',
          timestamp: new Date()
        };
      } else {
        throw new Error('API returned unexpected response format');
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.healthStats.shyft.lastStatus = 'unhealthy';
      
      logger.error(`Shyft API health check failed: ${error.message}`, {
        module: 'apiHealth',
        responseTime,
        api: 'shyft'
      });
      
      return {
        healthy: false,
        responseTime,
        error: error.message,
        message: 'Shyft API health check failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check the health of the Birdeye API
   * 
   * @returns {Promise<Object>} - Health check result
   */
  async checkBirdeyeHealth(apiKey) {
    const startTime = Date.now();
    this.healthStats.birdeye.totalChecks++;
    this.healthStats.birdeye.lastCheckTime = new Date();
    
    try {
      if (!apiKey) {
        throw new Error('No API key provided');
      }
      
      // Use a simple token price check as a health indicator
      const testTokenAddress = 'So11111111111111111111111111111111111111112'; // SOL
      
      const response = await fetch(`https://public-api.birdeye.so/public/tokeninfo?address=${testTokenAddress}`, {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
        },
        timeout: 5000  // 5 second timeout
      });
      
      // Record response time
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      this.addResponseTime('birdeye', responseTime);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        this.healthStats.birdeye.successChecks++;
        this.healthStats.birdeye.lastStatus = 'healthy';
        
        logger.info('Birdeye API health check passed', { 
          module: 'apiHealth',
          responseTime 
        });
        
        return {
          healthy: true,
          responseTime,
          message: 'Birdeye API is operational',
          timestamp: new Date()
        };
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.healthStats.birdeye.lastStatus = 'unhealthy';
      
      logger.error(`Birdeye API health check failed: ${error.message}`, {
        module: 'apiHealth',
        responseTime,
        api: 'birdeye'
      });
      
      return {
        healthy: false,
        responseTime,
        error: error.message,
        message: 'Birdeye API health check failed',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check the health of all APIs
   * 
   * @returns {Promise<Object>} - Health check results for all APIs
   */
  async checkAllApiHealth(shyftApiKey, birdeyeApiKey) {
    logger.info('Performing health check on all APIs', { module: 'apiHealth' });
    
    const results = {
      timestamp: new Date(),
      apis: {}
    };
    
    // Run health checks in parallel
    const [shyftResult, birdeyeResult] = await Promise.all([
      this.checkShyftHealth(shyftApiKey),
      this.checkBirdeyeHealth(birdeyeApiKey)
    ]);
    
    results.apis.shyft = shyftResult;
    results.apis.birdeye = birdeyeResult;
    
    // Overall health status
    results.allHealthy = shyftResult.healthy && birdeyeResult.healthy;
    
    return results;
  }

  /**
   * Get current health statistics for all APIs
   * 
   * @returns {Object} - Health statistics
   */
  getHealthStats() {
    return {
      ...this.healthStats,
      timestamp: new Date()
    };
  }

  /**
   * Add a response time to the history for an API
   * 
   * @param {string} api - API name
   * @param {number} time - Response time in milliseconds
   */
  addResponseTime(api, time) {
    if (this.healthStats[api]) {
      this.healthStats[api].responseTime.push(time);
      
      // Keep array at reasonable size
      if (this.healthStats[api].responseTime.length > this.MAX_RESPONSE_TIMES) {
        this.healthStats[api].responseTime.shift();
      }
    }
  }

  /**
   * Get the average response time for an API
   * 
   * @param {string} api - API name
   * @returns {number} - Average response time in milliseconds
   */
  getAverageResponseTime(api) {
    if (!this.healthStats[api] || this.healthStats[api].responseTime.length === 0) {
      return 0;
    }
    
    const sum = this.healthStats[api].responseTime.reduce((a, b) => a + b, 0);
    return sum / this.healthStats[api].responseTime.length;
  }

  /**
   * Reset health statistics
   */
  resetStats() {
    Object.keys(this.healthStats).forEach(api => {
      this.healthStats[api] = {
        totalChecks: 0,
        successChecks: 0,
        lastCheckTime: null,
        lastStatus: null,
        responseTime: []
      };
    });
    
    logger.info('API health statistics reset', { module: 'apiHealth' });
  }
}

// Create and export a singleton instance
const apiHealthService = new ApiHealthService();
export default apiHealthService;
