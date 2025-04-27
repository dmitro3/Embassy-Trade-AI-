/**
 * MCP Server Registry
 * 
 * A central registry for managing MCP servers, including discovery,
 * registration, and health monitoring.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { mcpClientFactory } from '../lib/mcpClient';

/**
 * Default MCP servers configuration
 */
const DEFAULT_SERVERS = {
  'github.com/tradeforce/shyft-data-mcp': {
    url: process.env.NEXT_PUBLIC_SHYFT_DATA_MCP_URL || 'http://localhost:3001',
    description: 'SHYFT Data Normalization MCP Server',
    capabilities: [
      'get_token_metadata', 
      'get_token_price', 
      'get_token_holders', 
      'get_token_transactions',
      'get_token_historical_prices',
      'get_token_market_data',
      'get_multiple_tokens_market_data',
      'get_token_portfolio'
    ]
  },
  'github.com/tradeforce/token-discovery-mcp': {
    url: process.env.NEXT_PUBLIC_TOKEN_DISCOVERY_MCP_URL || 'http://localhost:3002',
    description: 'Token Discovery MCP Server',
    capabilities: [
      'scan_new_tokens',
      'analyze_token',
      'monitor_token',
      'prepare_snipe'
    ]
  }
};

/**
 * MCP Server Registry hook
 * Manages MCP server registration and discovery
 * 
 * @param {Object} options - Registry options
 * @returns {Object} Registry state and functions
 */
export const useMCPRegistry = (options = {}) => {
  const [servers, setServers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize with default servers
  const initializeRegistry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load servers from storage first
      const storedServers = await loadServersFromStorage();
      
      // Start with defaults + stored
      const combinedServers = {
        ...DEFAULT_SERVERS,
        ...storedServers
      };
      
      // Register each server
      Object.entries(combinedServers).forEach(([id, server]) => {
        mcpClientFactory.registerServer(id, server.url, server.description, {
          capabilities: server.capabilities,
          version: server.version || '1.0.0'
        });
      });
      
      // Get current registry
      const registry = mcpClientFactory.getServers();
      setServers(registry);
      
      setInitialized(true);
    } catch (err) {
      console.error('Failed to initialize MCP registry:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Register a new server
  const registerServer = useCallback(async (id, url, description, capabilities = []) => {
    try {
      // Register with factory
      const server = mcpClientFactory.registerServer(id, url, description, { capabilities });
      
      // Update state
      setServers(prevServers => ({
        ...prevServers,
        [id]: server
      }));
      
      // Save to storage
      await saveServerToStorage(id, {
        url,
        description,
        capabilities
      });
      
      return server;
    } catch (err) {
      console.error('Failed to register MCP server:', err);
      setError(err.message);
      return null;
    }
  }, []);
  
  // Remove a server
  const removeServer = useCallback(async (id) => {
    try {
      // Only allow removal of non-default servers
      if (DEFAULT_SERVERS[id]) {
        throw new Error('Cannot remove default server');
      }
      
      // Update state
      setServers(prevServers => {
        const newServers = { ...prevServers };
        delete newServers[id];
        return newServers;
      });
      
      // Remove from storage
      await removeServerFromStorage(id);
      
      return true;
    } catch (err) {
      console.error('Failed to remove MCP server:', err);
      setError(err.message);
      return false;
    }
  }, []);
  
  // Discover servers via network discovery
  const discoverServers = useCallback(async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would perform actual network discovery
      // For demonstration purposes, we'll just return our defaults
      // and simulate "discovering" one additional server
      
      const discoveredServers = {
        ...DEFAULT_SERVERS,
        'github.com/tradeforce/risk-management-mcp': {
          url: process.env.NEXT_PUBLIC_RISK_MANAGEMENT_MCP_URL || 'http://localhost:3003',
          description: 'Risk Management MCP Server',
          capabilities: [
            'calculate_risk_score',
            'evaluate_position_risk',
            'get_portfolio_risk',
            'set_risk_parameters'
          ]
        }
      };
      
      // Register discovered servers
      Object.entries(discoveredServers).forEach(([id, server]) => {
        registerServer(id, server.url, server.description, server.capabilities);
      });
      
      return discoveredServers;
    } catch (err) {
      console.error('Failed to discover MCP servers:', err);
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [registerServer]);
  
  // Check health of all registered servers
  const checkAllHealth = useCallback(async () => {
    try {
      setLoading(true);
      
      const results = await mcpClientFactory.checkAllServersHealth();
      
      // Update local server state with health status
      setServers(prevServers => {
        const updatedServers = { ...prevServers };
        
        // Update health status for each server
        Object.entries(results).forEach(([id, healthResult]) => {
          if (updatedServers[id]) {
            updatedServers[id] = {
              ...updatedServers[id],
              healthy: healthResult.healthy,
              lastChecked: healthResult.timestamp
            };
          }
        });
        
        return updatedServers;
      });
      
      return results;
    } catch (err) {
      console.error('Failed to check MCP server health:', err);
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      initializeRegistry();
    }
  }, [initialized, initializeRegistry]);
  
  return {
    servers,
    loading,
    error,
    initialized,
    registerServer,
    removeServer,
    discoverServers,
    checkAllHealth
  };
};

/**
 * Load servers from localStorage
 * 
 * @returns {Promise<Object>} Stored servers
 */
async function loadServersFromStorage() {
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    const storedServers = localStorage.getItem('mcpServers');
    return storedServers ? JSON.parse(storedServers) : {};
  } catch (err) {
    console.error('Failed to load MCP servers from storage:', err);
    return {};
  }
}

/**
 * Save a server to localStorage
 * 
 * @param {string} id - Server ID
 * @param {Object} server - Server config
 * @returns {Promise<boolean>} Success status
 */
async function saveServerToStorage(id, server) {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Get existing servers
    const storedServers = localStorage.getItem('mcpServers');
    const servers = storedServers ? JSON.parse(storedServers) : {};
    
    // Add/update server
    servers[id] = server;
    
    // Save back to storage
    localStorage.setItem('mcpServers', JSON.stringify(servers));
    
    return true;
  } catch (err) {
    console.error('Failed to save MCP server to storage:', err);
    return false;
  }
}

/**
 * Remove a server from localStorage
 * 
 * @param {string} id - Server ID
 * @returns {Promise<boolean>} Success status
 */
async function removeServerFromStorage(id) {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    // Get existing servers
    const storedServers = localStorage.getItem('mcpServers');
    const servers = storedServers ? JSON.parse(storedServers) : {};
    
    // Remove server
    delete servers[id];
    
    // Save back to storage
    localStorage.setItem('mcpServers', JSON.stringify(servers));
    
    return true;
  } catch (err) {
    console.error('Failed to remove MCP server from storage:', err);
    return false;
  }
}

/**
 * MCP Server Registration Component
 * UI component for registering new MCP servers
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onRegister - Callback after registering a server
 * @returns {JSX.Element} - React component
 */
export const MCPServerRegistration = ({ onRegister }) => {
  const [id, setId] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  
  const { registerServer } = useMCPRegistry();
  
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!id || !url) {
      setError('Server ID and URL are required');
      return;
    }
    
    try {
      setRegistering(true);
      setError('');
      
      const capabilitiesArray = capabilities
        .split(',')
        .map(cap => cap.trim())
        .filter(Boolean);
      
      const server = await registerServer(id, url, description, capabilitiesArray);
      
      if (server) {
        // Clear form
        setId('');
        setUrl('');
        setDescription('');
        setCapabilities('');
        
        // Call callback
        if (onRegister) {
          onRegister(server);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-medium text-white">Register MCP Server</h3>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/40 p-2 rounded text-sm text-white">
          {error}
        </div>
      )}
      
      <form onSubmit={handleRegister} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Server ID</label>
          <input
            type="text"
            value={id}
            onChange={e => setId(e.target.value)}
            placeholder="github.com/username/repo"
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-1">Server URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description of the server"
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-1">Capabilities (comma-separated)</label>
          <input
            type="text"
            value={capabilities}
            onChange={e => setCapabilities(e.target.value)}
            placeholder="get_token_price, get_token_metadata"
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <button
          type="submit"
          disabled={registering}
          className={`w-full py-2 px-4 rounded text-white ${
            registering
              ? 'bg-blue-500/50 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {registering ? 'Registering...' : 'Register Server'}
        </button>
      </form>
    </div>
  );
};

/**
 * MCP Server List Component
 * UI component for displaying and managing MCP servers
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onRemove - Callback after removing a server
 * @param {Function} props.onServerSelect - Callback when a server is selected
 * @returns {JSX.Element} - React component
 */
export const MCPServerList = ({ onRemove, onServerSelect }) => {
  const { servers, loading, error, removeServer, checkAllHealth } = useMCPRegistry();
  const [refreshing, setRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAllHealth();
    setRefreshing(false);
  };
  
  const handleRemove = async (id) => {
    const removed = await removeServer(id);
    
    if (removed && onRemove) {
      onRemove(id);
    }
  };
  
  const handleSelect = (id) => {
    if (onServerSelect) {
      onServerSelect(id);
    }
  };
  
  if (loading && Object.keys(servers).length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        <p className="mt-2 text-gray-300">Loading servers...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">MCP Servers</h3>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`p-2 rounded text-white ${
            refreshing
              ? 'bg-blue-500/50 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/40 p-2 rounded text-sm text-white">
          {error}
        </div>
      )}
      
      {Object.keys(servers).length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No MCP servers registered</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(servers).map(([id, server]) => (
            <div 
              key={id}
              onClick={() => handleSelect(id)}
              className="border border-gray-700 p-3 rounded-lg hover:border-blue-500 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      server.healthy ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  ></div>
                  <span className="font-medium text-white">{id.split('/').pop()}</span>
                </div>
                
                {!DEFAULT_SERVERS[id] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(id);
                    }}
                    className="text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <p className="text-sm text-gray-400 mt-1">{server.description}</p>
              
              <div className="mt-2 text-xs text-gray-500">
                {server.lastChecked && (
                  <div>Last Checked: {new Date(server.lastChecked).toLocaleString()}</div>
                )}
                <div>URL: {server.url}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  useMCPRegistry,
  MCPServerRegistration,
  MCPServerList
};
