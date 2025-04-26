/**
 * Token Discovery MCP Integration
 * 
 * This module provides a clean interface for interacting with the Token Discovery MCP server
 * and handles all communication between the frontend and MCP services.
 */

import logger from '../lib/logger.js';

// Default MCP server URL - use environment variable if available
const MCP_SERVER_URL = process.env.NEXT_PUBLIC_TOKEN_DISCOVERY_MCP_URL || 'http://localhost:3002';

/**
 * Token Discovery MCP Integration
 */
const tokenDiscoveryMCP = {
  /**
   * Initialize the integration with the MCP server
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  init: async () => {
    try {
      // Check if MCP server is running
      const status = await tokenDiscoveryMCP.getBotStatus();
      logger.info(`Token Discovery MCP Status: ${status.isRunning ? 'Running' : 'Stopped'}`);
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Token Discovery MCP: ${error.message}`);
      return false;
    }
  },
  
  /**
   * Get bot status from MCP server
   * @returns {Promise<Object>} Bot status
   */
  getBotStatus: async () => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/get_bot_status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Failed to fetch bot status: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Scan for new tokens with the given options
   * @param {Object} options - Scan options
   * @returns {Promise<Array>} New tokens
   */
  scanNewTokens: async (options = {}) => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/scan_new_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      logger.error(`Failed to scan for new tokens: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get snipe opportunities using token-discovery MCP
   * @param {Object} options - Options for filtering opportunities
   * @returns {Promise<Array>} Snipe opportunities
   */
  getSnipeOpportunities: async (options = {}) => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/get_snipe_opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.opportunities || [];
    } catch (error) {
      logger.error(`Failed to get snipe opportunities: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Analyze a specific token
   * @param {string} tokenAddress - Token address to analyze
   * @returns {Promise<Object>} Token analysis
   */
  analyzeToken: async (tokenAddress) => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/analyze_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenAddress })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Failed to analyze token ${tokenAddress}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Add a token to the monitoring list
   * @param {string} tokenAddress - Token address to monitor
   * @returns {Promise<Object>} Response data
   */
  monitorToken: async (tokenAddress) => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/monitor_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenAddress })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Failed to monitor token ${tokenAddress}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get the list of currently monitored tokens
   * @returns {Promise<Array>} Monitored tokens
   */
  getMonitoredTokens: async () => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/get_monitored_tokens`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      logger.error(`Failed to get monitored tokens: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Stop monitoring a token
   * @param {string} tokenAddress - Token address to stop monitoring
   * @returns {Promise<Object>} Response data
   */
  stopMonitoringToken: async (tokenAddress) => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/stop_monitoring_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenAddress })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Failed to stop monitoring token ${tokenAddress}: ${error.message}`);
      throw error;
    }
  }
};

export default tokenDiscoveryMCP;
