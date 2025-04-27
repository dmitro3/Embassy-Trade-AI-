/**
 * MCP Server Registry for TradeForce AI
 * 
 * This module provides a centralized registry for MCP servers, allowing
 * discovery, registration, and management of MCP servers.
 */

'use client';

import logger from './logger.js';
import mcpClientEnhanced from './mcpClientEnhanced.js';
import { startAppTransaction, finishAppTransaction } from './sentryUtils.js';

/**
 * MCP Server Registry
 */
class MCPServerRegistry {
  constructor() {
    this.initialized = false;
    this.servers = new Map(); // Map of server name to server config
    this.capabilities = new Map(); // Map of capability to server names
    this.autoDiscovery = false;
    this.discoveryInterval = null;
  }

  /**
   * Initialize the MCP server registry
   * 
   * @param {Object} config - Configuration options
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(config = {}) {
    const transaction = startAppTransaction('mcp-registry-init', 'mcp.registry.init');
    
    try {
      logger.info('Initializing MCP Server Registry');
      
      // Initialize MCP client if not already initialized
      if (!mcpClientEnhanced.initialized) {
        await mcpClientEnhanced.initialize();
      }
      
      // Apply configuration
      if (config.autoDiscovery !== undefined) {
        this.autoDiscovery = !!config.autoDiscovery;
      }
      
      // Register initial servers
      if (config.servers && Array.isArray(config.servers)) {
        for (const server of config.servers) {
          await this.registerServer(server);
        }
      }
      
      // Start auto-discovery if enabled
      if (this.autoDiscovery) {
        this.startAutoDiscovery();
      }
      
      this.initialized = true;
      logger.info('MCP Server Registry initialized successfully');
      
      return true;
    } catch (error) {
      logger.error(`Error initializing MCP Server Registry: ${error.message}`);
      return false;
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Register an MCP server
   * 
   * @param {Object} serverConfig - Server configuration
   * @returns {Promise<boolean>} - Success status
   */
  async registerServer(serverConfig) {
    try {
      if (!serverConfig.name) {
        throw new Error('Server name is required');
      }
      
      // Register with MCP client
      const registered = mcpClientEnhanced.registerServer(serverConfig);
      
      if (!registered) {
        throw new Error(`Failed to register server with MCP client: ${serverConfig.name}`);
      }
      
      // Add to local registry
      this.servers.set(serverConfig.name, {
        ...serverConfig,
        registered: new Date().toISOString()
      });
      
      // Index capabilities
      if (serverConfig.tools && Array.isArray(serverConfig.tools)) {
        for (const tool of serverConfig.tools) {
          const toolName = typeof tool === 'string' ? tool : tool.name;
          
          if (!this.capabilities.has(toolName)) {
            this.capabilities.set(toolName, new Set());
          }
          
          this.capabilities.get(toolName).add(serverConfig.name);
        }
      }
      
      if (serverConfig.resources && Array.isArray(serverConfig.resources)) {
        for (const resource of serverConfig.resources) {
          const resourceName = typeof resource === 'string' ? resource : resource.uri;
          
          if (!this.capabilities.has(resourceName)) {
            this.capabilities.set(resourceName, new Set());
          }
          
          this.capabilities.get(resourceName).add(serverConfig.name);
        }
      }
      
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
   * @returns {Promise<boolean>} - Success status
   */
  async unregisterServer(serverName) {
    try {
      if (!this.servers.has(serverName)) {
        logger.warn(`MCP server not found: ${serverName}`);
        return false;
      }
      
      // Unregister from MCP client
      const unregistered = mcpClientEnhanced.unregisterServer(serverName);
      
      if (!unregistered) {
        logger.warn(`Failed to unregister server from MCP client: ${serverName}`);
      }
      
      // Remove from local registry
      const serverConfig = this.servers.get(serverName);
      this.servers.delete(serverName);
      
      // Remove from capabilities index
      if (serverConfig.tools && Array.isArray(serverConfig.tools)) {
        for (const tool of serverConfig.tools) {
          const toolName = typeof tool === 'string' ? tool : tool.name;
          
          if (this.capabilities.has(toolName)) {
            this.capabilities.get(toolName).delete(serverName);
            
            if (this.capabilities.get(toolName).size === 0) {
              this.capabilities.delete(toolName);
            }
          }
        }
      }
      
      if (serverConfig.resources && Array.isArray(serverConfig.resources)) {
        for (const resource of serverConfig.resources) {
          const resourceName = typeof resource === 'string' ? resource : resource.uri;
          
          if (this.capabilities.has(resourceName)) {
            this.capabilities.get(resourceName).delete(serverName);
            
            if (this.capabilities.get(resourceName).size === 0) {
              this.capabilities.delete(resourceName);
            }
          }
        }
      }
      
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
    return Array.from(this.servers.entries()).map(([name, config]) => ({
      name,
      ...config,
      health: mcpClientEnhanced.healthStatus.get(name) || { healthy: false },
      connection: mcpClientEnhanced.connectionPool.get(name) || { connected: false }
    }));
  }

  /**
   * Find servers that provide a specific capability
   * 
   * @param {string} capability - Capability name (tool or resource)
   * @returns {Array<string>} - Array of server names
   */
  findServersWithCapability(capability) {
    if (!this.capabilities.has(capability)) {
      return [];
    }
    
    return Array.from(this.capabilities.get(capability));
  }

  /**
   * Find a healthy server that provides a specific capability
   * 
   * @param {string} capability - Capability name (tool or resource)
   * @returns {string|null} - Server name or null if not found
   */
  findHealthyServerWithCapability(capability) {
    const servers = this.findServersWithCapability(capability);
    
    for (const serverName of servers) {
      const health = mcpClientEnhanced.healthStatus.get(serverName);
      
      if (health && health.healthy) {
        return serverName;
      }
    }
    
    return null;
  }

  /**
   * Start auto-discovery of MCP servers
   * 
   * @param {number} interval - Discovery interval in milliseconds
   * @returns {boolean} - Success status
   */
  startAutoDiscovery(interval = 300000) { // 5 minutes
    try {
      // Clear any existing interval
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
      }
      
      this.autoDiscovery = true;
      
      // Start discovery immediately
      this.discoverServers();
      
      // Start new interval
      this.discoveryInterval = setInterval(() => {
        this.discoverServers();
      }, interval);
      
      logger.info(`Started MCP server auto-discovery (interval: ${interval}ms)`);
      return true;
    } catch (error) {
      logger.error(`Error starting auto-discovery: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop auto-discovery of MCP servers
   * 
   * @returns {boolean} - Success status
   */
  stopAutoDiscovery() {
    try {
      if (this.discoveryInterval) {
        clearInterval(this.discoveryInterval);
        this.discoveryInterval = null;
      }
      
      this.autoDiscovery = false;
      
      logger.info('Stopped MCP server auto-discovery');
      return true;
    } catch (error) {
      logger.error(`Error stopping auto-discovery: ${error.message}`);
      return false;
    }
  }

  /**
   * Discover MCP servers
   * 
   * @returns {Promise<Array<Object>>} - Array of discovered servers
   */
  async discoverServers() {
    const transaction = startAppTransaction('mcp-discover-servers', 'mcp.registry.discover');
    
    try {
      logger.info('Discovering MCP servers');
      
      // In a browser environment, we would use the window.discoverMcpServers method
      // For now, we'll simulate discovery
      let discoveredServers = [];
      
      if (typeof window !== 'undefined' && window.discoverMcpServers) {
        discoveredServers = await window.discoverMcpServers();
      } else {
        // Simulate discovery for development
        logger.debug('Simulating MCP server discovery');
        
        // Add a small delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate discovering 0-2 new servers
        const numServers = Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numServers; i++) {
          const serverName = `discovered-mcp-server-${Date.now()}-${i}`;
          
          if (!this.servers.has(serverName)) {
            discoveredServers.push({
              name: serverName,
              description: `Discovered MCP server ${i + 1}`,
              tools: ['tool1', 'tool2'],
              resources: ['/resource1', '/resource2']
            });
          }
        }
      }
      
      // Register discovered servers
      for (const server of discoveredServers) {
        await this.registerServer(server);
      }
      
      logger.info(`Discovered ${discoveredServers.length} MCP servers`);
      
      return discoveredServers;
    } catch (error) {
      logger.error(`Error discovering MCP servers: ${error.message}`);
      return [];
    } finally {
      finishAppTransaction(transaction);
    }
  }

  /**
   * Use an MCP tool with automatic server selection
   * 
   * @param {string} toolName - Tool name
   * @param {Object} params - Tool parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Tool result
   */
  async useTool(toolName, params = {}, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('MCP Server Registry not initialized');
      }
      
      // Find a healthy server that provides this tool
      const serverName = options.serverName || this.findHealthyServerWithCapability(toolName);
      
      if (!serverName) {
        throw new Error(`No healthy server found for tool: ${toolName}`);
      }
      
      // Use the tool via MCP client
      return await mcpClientEnhanced.useTool(serverName, toolName, params, options);
    } catch (error) {
      logger.error(`Error using MCP tool: ${error.message}`);
      throw error;
    }
  }

  /**
   * Access an MCP resource with automatic server selection
   * 
   * @param {string} resourceUri - Resource URI
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Resource data
   */
  async accessResource(resourceUri, options = {}) {
    try {
      if (!this.initialized) {
        throw new Error('MCP Server Registry not initialized');
      }
      
      // Find a healthy server that provides this resource
      const serverName = options.serverName || this.findHealthyServerWithCapability(resourceUri);
      
      if (!serverName) {
        throw new Error(`No healthy server found for resource: ${resourceUri}`);
      }
      
      // Access the resource via MCP client
      return await mcpClientEnhanced.accessResource(serverName, resourceUri, options);
    } catch (error) {
      logger.error(`Error accessing MCP resource: ${error.message}`);
      throw error;
    }
  }
}

// Create and export singleton instance
const mcpServerRegistry = new MCPServerRegistry();
export default mcpServerRegistry;
