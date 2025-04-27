/**
 * MCP Integration Component
 * 
 * This component provides a unified interface for interacting with MCP servers,
 * including connection pooling, status monitoring, and tool execution.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMCP } from '../lib/mcpClient';

/**
 * MCPIntegration Component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onStatusChange - Callback when status changes
 * @param {boolean} props.autoRefresh - Whether to automatically refresh status
 * @param {number} props.refreshInterval - Status refresh interval in ms
 * @param {JSX.Element} props.children - Render prop children function
 * @returns {JSX.Element} - React component
 */
const MCPIntegration = ({ 
  onStatusChange, 
  autoRefresh = true, 
  refreshInterval = 60000, // 1 minute
  children 
}) => {
  const { 
    initialized, 
    loading, 
    error, 
    serverStatus, 
    refreshStatus, 
    useTool,
    getServers
  } = useMCP();
  
  const [botStatus, setBotStatus] = useState({
    isRunning: false,
    lastCheck: null,
    error: null
  });
  
  // Check bot status
  const checkBotStatus = useCallback(async () => {
    try {
      // Find the first healthy server to check bot status
      const servers = Object.entries(serverStatus);
      for (const [serverName, server] of servers) {
        if (server.healthy) {
          // Try to use the get_bot_status tool if available
          try {
            const result = await useTool('get_bot_status', {}, { serverName });
            setBotStatus({
              isRunning: result.isRunning,
              lastCheck: new Date().toISOString(),
              error: null
            });
            return;
          } catch (err) {
            // If the tool is not available, fallback to health check
            // which indicates the server is running but maybe doesn't have this specific tool
            setBotStatus({
              isRunning: true,
              lastCheck: new Date().toISOString(),
              error: `Bot status check tool not available: ${err.message}`
            });
            return;
          }
        }
      }
      
      // If no healthy server was found
      setBotStatus({
        isRunning: false,
        lastCheck: new Date().toISOString(),
        error: 'No healthy MCP server available'
      });
    } catch (err) {
      console.error('Failed to check bot status:', err);
      setBotStatus({
        isRunning: false,
        lastCheck: new Date().toISOString(),
        error: err.message
      });
    }
  }, [serverStatus, useTool]);
  
  // Handler for manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      const status = await refreshStatus();
      if (onStatusChange) {
        onStatusChange({
          initialized,
          servers: status,
          error: null
        });
      }
      await checkBotStatus();
    } catch (err) {
      console.error('Error refreshing MCP status:', err);
      if (onStatusChange) {
        onStatusChange({
          initialized,
          servers: serverStatus,
          error: err.message
        });
      }
    }
  }, [initialized, serverStatus, refreshStatus, checkBotStatus, onStatusChange]);
  
  // Setup auto refresh interval
  useEffect(() => {
    if (autoRefresh && initialized) {
      const intervalId = setInterval(handleRefresh, refreshInterval);
      
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, initialized, refreshInterval, handleRefresh]);
  
  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange({
        initialized,
        servers: serverStatus,
        error: error
      });
    }
  }, [initialized, serverStatus, error, onStatusChange]);
  
  // Check bot status when servers change
  useEffect(() => {
    if (initialized && Object.keys(serverStatus).length > 0) {
      checkBotStatus();
    }
  }, [initialized, serverStatus, checkBotStatus]);

  // Render using render props pattern
  return children({
    initialized,
    loading,
    error,
    serverStatus,
    refreshStatus: handleRefresh,
    useTool,
    botStatus
  });
};

export default MCPIntegration;
