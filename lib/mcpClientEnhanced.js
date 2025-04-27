/**
 * Enhanced MCP Client Library for TradeForce AI
 * 
 * This library provides a robust, fault-tolerant interface for interacting with
 * MCP servers. It includes connection pooling, retry mechanisms, and unified
 * access to MCP tools and resources.
 */

'use client';

import logger from './logger.js';
import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';

/**
 * Enhanced MCP Client with advanced features
 */
class EnhancedMCPClient {
  constructor() {
    this.initialized = false;
    this.serverRegistry = new Map(); // Map of server name to server config
    this.connectionPool = new Map(); // Map of server name to connection status
    this.healthStatus = new Map(); // Map of server name to health status
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffFactor: 2 // Exponential backoff
    };
    this.defaultTimeout = 30000; // 30 seconds
  }

  /**
   * Initialize the MCP client
   * 
   * @param {Object} config - Configuration options
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(config = {}) {
    const transaction = startAppTransaction('mcp-client-init', 'mcp.init');
    
    try {
      logger.info('Initializing Enhanced MCP Client');
      
      // Apply configuration
      if (config.retryConfig) {
        this.retryConfig = {
          ...this.retryConfig,
          ...config.retryConfig
        };
      }
      
      if (config.defaultTimeout) {
        this.defaultTimeout = config.defaultTimeout;
      }
      
      // Initialize server registry
      if (config.servers && Array.isArray(config.servers)) {
        for (const server of config.servers) {
          this.registerServer(server);
        }
      }
      
      // Initialize connection pool
      for (const [serverName, serverConfig] of this.serverRegistry.entries()) {
        this.connectionPool.set(serverName, {
          connected: false,
          lastConnected: null,
          connectionAttempts: 0
        });
        
        this.healthStatus.set(serverName, {
          healthy: false,
          lastChecked: null,
          responseTime: null,
          errorCount: 0
        });
        
        // Try to connect to the server
        await this.checkServerHealth(serverName);
      }
      
      this.initialized = true;
      logger.info('Enhanced MCP Client initialized successfully');
      
      // Start health check interval
      this.startHealthChecks();
      
      return true;
    } catch (error) {
      logger.error(`Error initializing Enhanced MCP Client: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Register an MCP server
   * 
   * @param {Object} serverConfig - Server configuration
   * @returns {boolean} - Success status
   */
  registerServer(serverConfig) {
    try {
      if (!serverConfig.name) {
        throw new Error('Server name is required');
      }
      
      this.serverRegistry.set(serverConfig.name, {
        ...serverConfig,
        registered: new Date().toISOString()
      });
      
      this.connectionPool.set(serverConfig.name, {
        connected: false,
        lastConnected: null,
        connectionAttempts: 0
      });
      
      this.healthStatus.set(serverConfig.name, {
        healthy: false,
        lastChecked: null,
        responseTime: null,
        errorCount: 0
      });
      
      logger.info(`Registered MCP server: ${serverConfig.name}`);
      return true;
    } catch (error) {
      logger.error(`Error registering MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Unregister an MCP server
   * 
   * @param {string} serverName - Server name
   * @returns {boolean} - Success status
   */
  unregisterServer(serverName) {
    try {
      if (!this.serverRegistry.has(serverName)) {
        logger.warn(`MCP server not found: ${serverName}`);
        return false;
      }
      
      this.serverRegistry.delete(serverName);
      this.connectionPool.delete(serverName);
      this.healthStatus.delete(serverName);
      
      logger.info(`Unregistered MCP server: ${serverName}`);
      return true;
    } catch (error) {
      logger.error(`Error unregistering MCP server: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all registered MCP servers
   * 
   * @returns {Array<Object>} - Array of server configurations
   */
  getRegisteredServers() {
    return Array.from(this.serverRegistry.entries()).map(([name, config]) => ({
      name,
      ...config,
      health: this.healthStatus.get(name) || { healthy: false },
      connection: this.connectionPool.get(name) || { connected: false }
    }));
  }

  /**
   * Check the health of an MCP server
   * 
   * @param {string} serverName - Server name
   * @returns {Promise<Object>} - Health status
   */
  async checkServerHealth(serverName) {
    try {
      if (!this.serverRegistry.has(serverName)) {
        throw new Error(`MCP server not found: ${serverName}`);
      }
      
      const startTime = Date.now();
      
      // In a browser environment, we would use the window.accessMcpResource method
      // For now, we'll simulate the health check
      let healthy = false;
      let responseTime = null;
      
      if (typeof window !== 'undefined' && window.accessMcpResource) {
        try {
          // Try to access a health resource
          await window.accessMcpResource(serverName, '/health');
          healthy = true;
          responseTime = Date.now() - startTime;
        } catch (error) {
          logger.warn(`MCP server health check failed: ${serverName} - ${error.message}`);
          healthy = false;
        }
      } else {
        // Simulate health check for development
        healthy = Math.random() > 0.1; // 90% chance of being healthy
        responseTime = Math.floor(Math.random() * 200) + 50; // 50-250ms
      }
      
      // Update health status
      const currentStatus = this.healthStatus.get(serverName) || {
        healthy: false,
        lastChecked: null,
        responseTime: null,
        errorCount: 0
      };
      
      const newStatus = {
        healthy,
        lastChecked: new Date().toISOString(),
        responseTime,
        errorCount: healthy ? 0 : currentStatus.errorCount + 1
      };
      
      this.healthStatus.set(serverName, newStatus);
      
      // Update connection status
      if (healthy) {
        this.connectionPool.set(serverName, {
          connected: true,
          lastConnected: new Date().toISOString(),
          connectionAttempts: 0
        });
      } else {
        const connectionStatus = this.connectionPool.get(serverName) || {
          connected: false,
          lastConnected: null,
          connectionAttempts: 0
        };
        
        this.connectionPool.set(serverName, {
          connected: false,
          lastConnected: connectionStatus.lastConnected,
          connectionAttempts: connectionStatus.connectionAttempts + 1
        });
      }
      
      return newStatus;
    } catch (error) {
      logger.error(`Error checking MCP server health: ${error.message}`);
      
      // Update health status with error
      this.healthStatus.set(serverName, {
        healthy: false,
        lastChecked: new Date().toISOString(),
        responseTime: null,
        errorCount: (this.healthStatus.get(serverName)?.errorCount || 0) + 1
      });
      
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Start periodic health checks for all servers
   * 
   * @param {number} interval - Check interval in milliseconds
   * @returns {boolean} - Success status
   */
  startHealthChecks(interval = 60000) {
    try {
      // Clear any existing interval
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Start new interval
      this.healthCheckInterval = setInterval(async () => {
        logger.debug('Running MCP server health checks');
        
        for (const serverName of this.serverRegistry.keys()) {
          await this.checkServerHealth(serverName);
        }
      }, interval);
      
      logger.info(`Started MCP server health checks (interval: ${interval}ms)`);
      return true;
    } catch (error) {
      logger.error(`Error starting health checks: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop periodic health checks
   * 
   * @returns {boolean} - Success status
   */
  stopHealthChecks() {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
        logger.info('Stopped MCP server health checks');
      }
      
      return true;
    } catch (error) {
      logger.error(`Error stopping health checks: ${error.message}`);
      return false;
    }
  }

  /**
   * Use an MCP tool with retry logic
   * 
   * @param {string} serverName - Server name
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Tool result
   */
  async useTool(serverName, toolName, params = {}, options = {}) {
    const transaction = startAppTransaction('mcp-use-tool', 'mcp.tool');
    
    try {
      if (!this.initialized) {
        throw new Error('Enhanced MCP Client not initialized');
      }
      
      if (!this.serverRegistry.has(serverName)) {
        throw new Error(`MCP server not found: ${serverName}`);
      }
      
      const serverHealth = this.healthStatus.get(serverName);
      
      if (!serverHealth.healthy && !options.ignoreHealth) {
        throw new Error(`MCP server is not healthy: ${serverName}`);
      }
      
      // Apply retry logic
      const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          // In a browser environment, we would use the window.useMcpTool method
          if (typeof window !== 'undefined' && window.useMcpTool) {
            const result = await window.useMcpTool(serverName, toolName, params);
            
            // Update server health on successful call
            this.healthStatus.set(serverName, {
              ...this.healthStatus.get(serverName),
              healthy: true,
              lastChecked: new Date().toISOString(),
              errorCount: 0
            });
            
            return result;
          } else {
            // Simulate tool usage for development
            logger.debug(`Simulating MCP tool usage: ${serverName}.${toolName}`);
            
            // Add a small delay to simulate network latency
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simulate a 5% chance of failure
            if (Math.random() < 0.05) {
              throw new Error('Simulated MCP tool failure');
            }
            
            return {
              success: true,
              data: {
                message: `Simulated response from ${serverName}.${toolName}`,
                params,
                timestamp: new Date().toISOString()
              }
            };
          }
        } catch (error) {
          lastError = error;
          
          // Update server health on error
          const currentHealth = this.healthStatus.get(serverName);
          this.healthStatus.set(serverName, {
            ...currentHealth,
            errorCount: (currentHealth.errorCount || 0) + 1
          });
          
          // Check if we should retry
          if (retryCount >= maxRetries) {
            break;
          }
          
          // Calculate backoff delay
          const delay = Math.min(
            this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
            this.retryConfig.maxDelay
          );
          
          logger.warn(`MCP tool call failed, retrying in ${delay}ms: ${serverName}.${toolName} - ${error.message}`);
          
          // Wait for backoff delay
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retryCount++;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error(`Failed to call MCP tool after ${maxRetries} retries`);
    } catch (error) {
      logger.error(`Error using MCP tool: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Access an MCP resource with retry logic
   * 
   * @param {string} serverName - Server name
   * @param {string} resourceUri - Resource URI
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Resource data
   */
  async accessResource(serverName, resourceUri, options = {}) {
    const transaction = startAppTransaction('mcp-access-resource', 'mcp.resource');
    
    try {
      if (!this.initialized) {
        throw new Error('Enhanced MCP Client not initialized');
      }
      
      if (!this.serverRegistry.has(serverName)) {
        throw new Error(`MCP server not found: ${serverName}`);
      }
      
      const serverHealth = this.healthStatus.get(serverName);
      
      if (!serverHealth.healthy && !options.ignoreHealth) {
        throw new Error(`MCP server is not healthy: ${serverName}`);
      }
      
      // Apply retry logic
      const maxRetries = options.maxRetries || this.retryConfig.maxRetries;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          // In a browser environment, we would use the window.accessMcpResource method
          if (typeof window !== 'undefined' && window.accessMcpResource) {
            const result = await window.accessMcpResource(serverName, resourceUri);
            
            // Update server health on successful call
            this.healthStatus.set(serverName, {
              ...this.healthStatus.get(serverName),
              healthy: true,
              lastChecked: new Date().toISOString(),
              errorCount: 0
            });
            
            return result;
          } else {
            // Simulate resource access for development
            logger.debug(`Simulating MCP resource access: ${serverName}${resourceUri}`);
            
            // Add a small delay to simulate network latency
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Simulate a 5% chance of failure
            if (Math.random() < 0.05) {
              throw new Error('Simulated MCP resource access failure');
            }
            
            return {
              data: {
                message: `Simulated resource data from ${serverName}${resourceUri}`,
                timestamp: new Date().toISOString()
              }
            };
          }
        } catch (error) {
          lastError = error;
          
          // Update server health on error
          const currentHealth = this.healthStatus.get(serverName);
          this.healthStatus.set(serverName, {
            ...currentHealth,
            errorCount: (currentHealth.errorCount || 0) + 1
          });
          
          // Check if we should retry
          if (retryCount >= maxRetries) {
            break;
          }
          
          // Calculate backoff delay
          const delay = Math.min(
            this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffFactor, retryCount),
            this.retryConfig.maxDelay
          );
          
          logger.warn(`MCP resource access failed, retrying in ${delay}ms: ${serverName}${resourceUri} - ${error.message}`);
          
          // Wait for backoff delay
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retryCount++;
        }
      }
      
      // If we get here, all retries failed
      throw lastError || new Error(`Failed to access MCP resource after ${maxRetries} retries`);
    } catch (error) {
      logger.error(`Error accessing MCP resource: ${error.message}`);
      throw error;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Find a healthy server that provides a specific tool
   * 
   * @param {string} toolName - Tool name to find
   * @returns {string|null} - Server name or null if not found
   */
  findServerForTool(toolName) {
    for (const [serverName, serverConfig] of this.serverRegistry.entries()) {
      const health = this.healthStatus.get(serverName);
      
      if (health && health.healthy && serverConfig.tools && serverConfig.tools.includes(toolName)) {
        return serverName;
      }
    }
    
    return null;
  }

  /**
   * Find a healthy server that provides a specific resource
   * 
   * @param {string} resourcePattern - Resource pattern to match
   * @returns {string|null} - Server name or null if not found
   */
  findServerForResource(resourcePattern) {
    for (const [serverName, serverConfig] of this.serverRegistry.entries()) {
      const health = this.healthStatus.get(serverName);
      
      if (health && health.healthy && serverConfig.resources) {
        for (const resource of serverConfig.resources) {
          if (resource.match(resourcePattern)) {
            return serverName;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get the health status of all servers
   * 
   * @returns {Object} - Health status by server name
   */
  getHealthStatus() {
    const status = {};
    
    for (const [serverName, health] of this.healthStatus.entries()) {
      status[serverName] = {
        ...health,
        server: this.serverRegistry.get(serverName)
      };
    }
    
    return status;
  }

  /**
   * Get the connection status of all servers
   * 
   * @returns {Object} - Connection status by server name
   */
  getConnectionStatus() {
    const status = {};
    
    for (const [serverName, connection] of this.connectionPool.entries()) {
      status[serverName] = {
        ...connection,
        server: this.serverRegistry.get(serverName)
      };
    }
    
    return status;
  }
}

// Create and export singleton instance
const mcpClientEnhanced = new EnhancedMCPClient();
export default mcpClientEnhanced;
