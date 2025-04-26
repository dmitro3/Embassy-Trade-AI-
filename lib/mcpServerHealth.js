/**
 * MCP Server Health Checker
 * 
 * This browser-compatible utility checks if MCP servers are running
 * and provides status information to the user.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// Known MCP servers
const MCP_SERVERS = {
  tokenDiscovery: {
    url: process.env.NEXT_PUBLIC_TOKEN_DISCOVERY_MCP_URL || 'http://localhost:3002',
    name: 'Token Discovery MCP',
    healthEndpoint: '/health'
  },
  shyftData: {
    url: process.env.NEXT_PUBLIC_SHYFT_DATA_MCP_URL || 'http://localhost:3001',
    name: 'SHYFT Data MCP',
    healthEndpoint: '/health'
  }
};

/**
 * React hook to check MCP server health
 * 
 * @param {Object} options - Hook options
 * @returns {Object} - MCP server health status and functions
 */
export function useMCPServerHealth(options = {}) {
  const {
    autoCheck = true,
    checkInterval = 30000, // 30 seconds
    initialDelay = 1000 // 1 second
  } = options;
  
  const [serverStatus, setServerStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  
  /**
   * Check if a server is healthy
   * 
   * @param {string} serverName - Server name
   * @param {Object} serverConfig - Server configuration
   * @returns {Promise<Object>} - Server health status
   */
  const checkServerHealth = useCallback(async (serverName, serverConfig) => {
    try {
      const response = await fetch(`${serverConfig.url}${serverConfig.healthEndpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // Set a timeout to avoid hanging if server is down
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        healthy: data.status === 'ok' || data.healthy === true,
        version: data.version || '1.0.0',
        message: data.message || 'Server is healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Health check failed for ${serverName}:`, error);
      return {
        healthy: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }, []);
  
  /**
   * Check health of all servers
   * 
   * @returns {Promise<Object>} - Status of all servers
   */
  const checkAllServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const status = {};
      const checkPromises = [];
      
      for (const [serverName, serverConfig] of Object.entries(MCP_SERVERS)) {
        checkPromises.push(checkServerHealth(serverName, serverConfig)
          .then(healthStatus => {
            status[serverName] = {
              ...serverConfig,
              ...healthStatus
            };
          }));
      }
      
      await Promise.all(checkPromises);
      
      setServerStatus(status);
      setLastChecked(new Date());
      
      return status;
    } catch (err) {
      console.error('Failed to check MCP server status:', err);
      setError(err.message);
      return {};
    } finally {
      setLoading(false);
    }
  }, [checkServerHealth]);
  
  /**
   * Get instructions for starting MCP servers manually
   * 
   * @returns {Object} - Instructions for different server types
   */
  const getStartInstructions = useCallback(() => {
    return {
      tokenDiscovery: {
        instructions: 'Run start-token-discovery-mcp.bat from the project root',
        command: 'start-token-discovery-mcp.bat'
      },
      shyftData: {
        instructions: 'Run start-shyft-data-mcp.bat from the project root',
        command: 'start-shyft-data-mcp.bat'
      },
      all: {
        instructions: 'Run start-mcp-servers.bat from the project root',
        command: 'start-mcp-servers.bat'
      }
    };
  }, []);
  
  /**
   * Check if all essential services are running
   * 
   * @returns {boolean} - Whether all essential services are running
   */
  const areAllEssentialServicesRunning = useCallback(() => {
    if (Object.keys(serverStatus).length === 0) return false;
    
    // Check if token discovery server is running (most essential)
    return serverStatus.tokenDiscovery?.healthy === true;
  }, [serverStatus]);
  
  // Automatically check server health on mount
  useEffect(() => {
    if (autoCheck) {
      const timer = setTimeout(() => {
        checkAllServers();
        
        // Set up recurring checks
        const interval = setInterval(() => {
          checkAllServers();
        }, checkInterval);
        
        return () => clearInterval(interval);
      }, initialDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoCheck, checkInterval, initialDelay, checkAllServers]);
  
  return {
    serverStatus,
    loading,
    error,
    lastChecked,
    checkAllServers,
    getStartInstructions,
    areAllEssentialServicesRunning
  };
}

/**
 * React component to show MCP server status
 * 
 * @param {Object} props - Component props
 * @returns {JSX.Element} - React component
 */
export function MCPServerStatus({ onStatusChange }) {
  const {
    serverStatus,
    loading,
    error,
    lastChecked,
    checkAllServers,
    areAllEssentialServicesRunning
  } = useMCPServerHealth();
  
  // Notify parent component of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        status: serverStatus,
        loading,
        error,
        lastChecked,
        allEssentialRunning: areAllEssentialServicesRunning()
      });
    }
  }, [serverStatus, loading, error, lastChecked, onStatusChange, areAllEssentialServicesRunning]);
  
  return null; // Headless component - no UI needed here
}

export default {
  useMCPServerHealth,
  MCPServerStatus
};
