/**
 * MCP Client Library
 * 
 * This library provides a standardized interface for connecting to and
 * interacting with MCP (Model Context Protocol) servers. It handles
 * connection pooling, health checks, and automatic reconnection.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// Default configuration for MCP client
const DEFAULT_CONFIG = {
  connectionTimeout: 5000,      // 5 seconds timeout for connections
  healthCheckInterval: 30000,   // Check server health every 30 seconds
  maxReconnectAttempts: 3,      // Maximum number of reconnect attempts
  reconnectInterval: 5000,      // Wait 5 seconds between reconnect attempts
  servers: {}                   // Server registry (empty by default)
};

/**
 * MCP Client Factory
 * Creates and manages MCP client instances
 */
class MCPClientFactory {
  constructor() {
    this.clientInstances = new Map();
    this.serverRegistry = {};
  }

  /**
   * Register a new MCP server
   * 
   * @param {string} name - Server name/identifier
   * @param {string} url - Server URL
   * @param {string} description - Server description
   * @param {Object} options - Additional server options
   * @returns {Object} - Server registration
   */
  registerServer(name, url, description = '', options = {}) {
    const server = {
      name,
      url,
      description,
      healthy: false,
      lastChecked: null,
      capabilities: options.capabilities || [],
      version: options.version || '1.0.0',
      ...options
    };
    
    this.serverRegistry[name] = server;
    return server;
  }

  /**
   * Get an MCP client instance for a server
   * 
   * @param {string} serverName - Server name/identifier
   * @returns {MCPClient|null} - MCP client instance or null if server not found
   */
  getClient(serverName) {
    // Check if server is registered
    if (!this.serverRegistry[serverName]) {
      console.error(`MCP server ${serverName} not registered`);
      return null;
    }

    // Create client instance if not exists
    if (!this.clientInstances.has(serverName)) {
      const server = this.serverRegistry[serverName];
      const client = new MCPClient(server);
      this.clientInstances.set(serverName, client);
    }

    return this.clientInstances.get(serverName);
  }

  /**
   * Get all registered servers
   * 
   * @returns {Object} - All registered servers
   */
  getServers() {
    return this.serverRegistry;
  }

  /**
   * Check health of all registered servers
   * 
   * @returns {Promise<Object>} - Health status of all servers
   */
  async checkAllServersHealth() {
    const results = {};
    const promises = [];

    for (const [name, server] of Object.entries(this.serverRegistry)) {
      const client = this.getClient(name);
      if (client) {
        promises.push(client.checkHealth().then(health => {
          results[name] = {
            ...server,
            healthy: health.healthy,
            lastChecked: new Date().toISOString(),
            error: health.error
          };
          // Update server registry
          this.serverRegistry[name] = {
            ...server,
            healthy: health.healthy,
            lastChecked: new Date().toISOString()
          };
          return results[name];
        }));
      }
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear all client instances
   */
  clearInstances() {
    for (const client of this.clientInstances.values()) {
      client.disconnect();
    }
    this.clientInstances.clear();
  }
}

/**
 * MCP Client
 * Client for interacting with a specific MCP server
 */
class MCPClient {
  constructor(server, config = {}) {
    this.server = server;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connected = false;
    this.connecting = false;
    this.connectionAttempts = 0;
    this.reconnectTimer = null;
    this.healthCheckTimer = null;
    this.toolRegistry = {};
  }

  /**
   * Connect to the MCP server
   * 
   * @returns {Promise<boolean>} - Connection success status
   */
  async connect() {
    if (this.connected || this.connecting) {
      return this.connected;
    }

    this.connecting = true;
    
    try {
      // Check server health first
      const health = await this.checkHealth();
      if (!health.healthy) {
        throw new Error(`Server ${this.server.name} is not healthy: ${health.error}`);
      }

      // Get server capabilities/tools
      await this.discoverTools();
      
      this.connected = true;
      this.connectionAttempts = 0;
      this.startHealthChecks();
      
      console.log(`Connected to MCP server: ${this.server.name}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${this.server.name}:`, error);
      
      this.connected = false;
      this.connectionAttempts++;
      
      // Try to reconnect if we haven't exceeded maximum attempts
      if (this.connectionAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
      
      return false;
    } finally {
      this.connecting = false;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  disconnect() {
    this.connected = false;
    this.stopHealthChecks();
    clearTimeout(this.reconnectTimer);
    console.log(`Disconnected from MCP server: ${this.server.name}`);
  }

  /**
   * Check server health
   * 
   * @returns {Promise<Object>} - Health status
   */
  async checkHealth() {
    try {
      const url = `${this.server.url}/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.connectionTimeout)
      });

      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        healthy: data.status === 'ok' || data.healthy === true,
        version: data.version || this.server.version,
        message: data.message || 'Server is healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Discover available tools on the server
   * 
   * @returns {Promise<Object>} - Available tools
   */
  async discoverTools() {
    try {
      const url = `${this.server.url}/tools`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.connectionTimeout)
      });

      if (!response.ok) {
        throw new Error(`Tools discovery failed with status: ${response.status}`);
      }

      const data = await response.json();
      this.toolRegistry = data.tools || {};
      
      return this.toolRegistry;
    } catch (error) {
      console.error(`Failed to discover tools for ${this.server.name}:`, error);
      // If tools discovery fails, use server capabilities as fallback
      this.toolRegistry = this.server.capabilities?.reduce((acc, cap) => {
        acc[cap] = { name: cap };
        return acc;
      }, {}) || {};
      
      return this.toolRegistry;
    }
  }

  /**
   * Use a tool from the server
   * 
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Tool result
   */
  async useTool(toolName, params = {}, options = {}) {
    if (!this.connected) {
      await this.connect();
      if (!this.connected) {
        throw new Error(`Not connected to MCP server: ${this.server.name}`);
      }
    }

    try {
      const url = `${this.server.url}/tools/${toolName}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(options.timeout || this.config.connectionTimeout)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: response.statusText };
        }
        
        throw new Error(
          errorData.error || 
          `Tool execution failed with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Error using tool ${toolName} on server ${this.server.name}:`, error);
      throw error;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks() {
    this.stopHealthChecks();
    this.healthCheckTimer = setInterval(async () => {
      const health = await this.checkHealth();
      
      if (!health.healthy && this.connected) {
        console.warn(`MCP server ${this.server.name} is unhealthy, attempting to reconnect`);
        this.connected = false;
        this.scheduleReconnect();
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect to MCP server: ${this.server.name}`);
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Get available tools
   * 
   * @returns {Object} - Available tools
   */
  getTools() {
    return this.toolRegistry;
  }

  /**
   * Check if a tool is available
   * 
   * @param {string} toolName - Tool name
   * @returns {boolean} - Tool availability
   */
  hasTool(toolName) {
    return !!this.toolRegistry[toolName];
  }
}

// Create global factory instance
export const mcpClientFactory = new MCPClientFactory();

// Register known MCP servers
if (typeof window !== 'undefined') {
  // These would typically come from configuration or discovery
  mcpClientFactory.registerServer(
    'github.com/tradeforce/shyft-data-mcp',
    process.env.NEXT_PUBLIC_SHYFT_DATA_MCP_URL || 'http://localhost:3001',
    'SHYFT Data Normalization MCP Server',
    {
      capabilities: [
        'get_token_metadata', 
        'get_token_price', 
        'get_token_holders', 
        'get_token_transactions',
        'get_token_historical_prices',
        'get_token_market_data',
        'get_multiple_tokens_market_data',
        'get_token_portfolio'
      ],
      version: '1.0.0'
    }
  );
  
  mcpClientFactory.registerServer(
    'github.com/tradeforce/token-discovery-mcp',
    process.env.NEXT_PUBLIC_TOKEN_DISCOVERY_MCP_URL || 'http://localhost:3002',
    'Token Discovery MCP Server',
    {
      capabilities: [
        'scan_new_tokens',
        'analyze_token',
        'monitor_token',
        'prepare_snipe'
      ],
      version: '1.0.0'
    }
  );
}

/**
 * React hook for using MCP clients
 * 
 * @param {Object} options - Hook options
 * @returns {Object} - MCP client hook state and functions
 */
export function useMCP(options = {}) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState({});

  // Initialize MCP clients and check server status
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check health of all servers
      const status = await mcpClientFactory.checkAllServersHealth();
      setServerStatus(status);
      
      setInitialized(true);
    } catch (err) {
      console.error('Failed to initialize MCP clients:', err);
      setError('Failed to initialize MCP clients: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh server status
  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await mcpClientFactory.checkAllServersHealth();
      setServerStatus(status);
      return status;
    } catch (err) {
      console.error('Failed to refresh MCP server status:', err);
      setError('Failed to refresh server status: ' + err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Use a tool on a specific MCP server
  const useTool = useCallback(async (toolName, params = {}, options = {}) => {
    const { serverName } = options;
    
    if (!serverName) {
      throw new Error('Server name is required to use a tool');
    }
    
    const client = mcpClientFactory.getClient(serverName);
    
    if (!client) {
      throw new Error(`MCP server ${serverName} not found`);
    }
    
    if (!client.hasTool(toolName)) {
      throw new Error(`Tool ${toolName} not available on server ${serverName}`);
    }
    
    try {
      return await client.useTool(toolName, params, options);
    } catch (err) {
      console.error(`Error using tool ${toolName} on server ${serverName}:`, err);
      throw err;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
    
    // Cleanup on unmount
    return () => {
      mcpClientFactory.clearInstances();
    };
  }, [initialized, initialize]);
  
  return {
    initialized,
    loading,
    error,
    serverStatus,
    refreshStatus,
    useTool,
    getServers: () => mcpClientFactory.getServers()
  };
}

export default {
  mcpClientFactory,
  useMCP
};
