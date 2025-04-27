/**
 * MCP Server Status Component
 * 
 * This component displays the status of MCP servers and provides
 * controls for interacting with them.
 */

'use client';

import { useState, useEffect } from 'react';
import { FiServer, FiCheckCircle, FiXCircle, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import MCPIntegration from './MCPIntegration';

/**
 * Format a timestamp as a relative time string
 * 
 * @param {string} timestamp - ISO timestamp
 * @returns {string} - Relative time string
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return `${diffSec} seconds ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
};

/**
 * MCP Server Status Component
 * 
 * @returns {JSX.Element} - React component
 */
const MCPServerStatus = () => {
  const [status, setStatus] = useState({
    initialized: false,
    servers: {},
    error: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [toolParams, setToolParams] = useState({});
  const [toolResult, setToolResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  /**
   * Handle status change from MCP integration
   * 
   * @param {Object} newStatus - New status
   */
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    
    // Select the first server if none is selected
    if (!selectedServer && newStatus.servers) {
      const serverNames = Object.keys(newStatus.servers);
      if (serverNames.length > 0) {
        setSelectedServer(serverNames[0]);
      }
    }
  };
  
  /**
   * Refresh server status
   */
  const handleRefresh = () => {
    setRefreshing(true);
    
    // Status will be updated by the MCPIntegration component
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };
  
  /**
   * Handle server selection
   * 
   * @param {string} serverName - Server name
   */
  const handleServerSelect = (serverName) => {
    setSelectedServer(serverName);
    setSelectedTool(null);
    setToolParams({});
    setToolResult(null);
  };
  
  /**
   * Handle tool selection
   * 
   * @param {string} toolName - Tool name
   */
  const handleToolSelect = (toolName) => {
    setSelectedTool(toolName);
    setToolParams({});
    setToolResult(null);
  };
  
  /**
   * Handle parameter change
   * 
   * @param {string} paramName - Parameter name
   * @param {any} value - Parameter value
   */
  const handleParamChange = (paramName, value) => {
    setToolParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  /**
   * Execute the selected tool
   * 
   * @param {Function} useTool - Function to use an MCP tool
   */
  const handleExecuteTool = async (useTool) => {
    if (!selectedServer || !selectedTool) return;
    
    setLoading(true);
    setToolResult(null);
    
    try {
      // Prepare parameters based on the selected tool
      const params = { ...toolParams };
      
      // Convert array parameters from comma-separated strings
      if (selectedTool === 'get_multiple_tokens_market_data' && params.tokenAddresses) {
        if (typeof params.tokenAddresses === 'string') {
          params.tokenAddresses = params.tokenAddresses.split(',').map(addr => addr.trim());
        }
      }
      
      // Execute the tool
      const result = await useTool(selectedTool, params, { serverName: selectedServer });
      
      setToolResult({
        success: true,
        data: result
      });
    } catch (error) {
      setToolResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Render the component
  return (
    <MCPIntegration onStatusChange={handleStatusChange}>
      {({ initialized, loading: mcpLoading, error, serverStatus, useTool }) => (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">MCP Server Status</h2>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing || mcpLoading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center">
              <FiAlertTriangle className="mr-2" />
              <span>{error}</span>
            </div>
          )}
          
          {mcpLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {Object.entries(serverStatus).map(([name, server]) => (
                  <div
                    key={name}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedServer === name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/20'
                    }`}
                    onClick={() => handleServerSelect(name)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FiServer className="mr-2 text-gray-500 dark:text-gray-400" />
                        <h3 className="font-semibold">{name.split('/').pop()}</h3>
                      </div>
                      
                      <div className="flex items-center">
                        {server.healthy ? (
                          <span className="flex items-center text-green-500">
                            <FiCheckCircle className="mr-1" />
                            Healthy
                          </span>
                        ) : (
                          <span className="flex items-center text-red-500">
                            <FiXCircle className="mr-1" />
                            Unhealthy
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{server.description}</p>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Last checked: {formatRelativeTime(server.lastChecked)}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedServer && serverStatus[selectedServer] && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Available Tools</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
                    {/* SHYFT Data MCP Tools */}
                    {selectedServer === 'github.com/tradeforce/shyft-data-mcp' && (
                      <>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_metadata'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_metadata')}
                        >
                          Get Token Metadata
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_price'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_price')}
                        >
                          Get Token Price
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_holders'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_holders')}
                        >
                          Get Token Holders
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_transactions'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_transactions')}
                        >
                          Get Token Transactions
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_historical_prices'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_historical_prices')}
                        >
                          Get Historical Prices
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_market_data'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_market_data')}
                        >
                          Get Market Data
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_multiple_tokens_market_data'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_multiple_tokens_market_data')}
                        >
                          Get Multiple Tokens Data
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'get_token_portfolio'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('get_token_portfolio')}
                        >
                          Get Token Portfolio
                        </button>
                      </>
                    )}
                    
                    {/* Token Discovery MCP Tools */}
                    {selectedServer === 'github.com/tradeforce/token-discovery-mcp' && (
                      <>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'scan_new_tokens'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('scan_new_tokens')}
                        >
                          Scan New Tokens
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'analyze_token'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('analyze_token')}
                        >
                          Analyze Token
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'monitor_token'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('monitor_token')}
                        >
                          Monitor Token
                        </button>
                        <button
                          className={`p-2 text-sm rounded ${
                            selectedTool === 'prepare_snipe'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          onClick={() => handleToolSelect('prepare_snipe')}
                        >
                          Prepare Snipe
                        </button>
                      </>
                    )}
                  </div>
                  
                  {selectedTool && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="font-semibold mb-4">Tool Parameters</h3>
                      
                      <div className="space-y-4">
                        {/* SHYFT Data MCP Tool Parameters */}
                        {selectedServer === 'github.com/tradeforce/shyft-data-mcp' && (
                          <>
                            {/* Token Metadata */}
                            {selectedTool === 'get_token_metadata' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Token Address
                                </label>
                                <input
                                  type="text"
                                  value={toolParams.tokenAddress || ''}
                                  onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                  placeholder="Enter token address"
                                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                              </div>
                            )}
                            
                            {/* Token Price */}
                            {selectedTool === 'get_token_price' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Token Address
                                </label>
                                <input
                                  type="text"
                                  value={toolParams.tokenAddress || ''}
                                  onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                  placeholder="Enter token address"
                                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                              </div>
                            )}
                            
                            {/* Token Holders */}
                            {selectedTool === 'get_token_holders' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Limit
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.limit || ''}
                                    onChange={(e) => handleParamChange('limit', parseInt(e.target.value))}
                                    placeholder="Number of holders to return"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                              </>
                            )}
                            
                            {/* Token Transactions */}
                            {selectedTool === 'get_token_transactions' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Limit
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.limit || ''}
                                    onChange={(e) => handleParamChange('limit', parseInt(e.target.value))}
                                    placeholder="Number of transactions to return"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                              </>
                            )}
                            
                            {/* Token Historical Prices */}
                            {selectedTool === 'get_token_historical_prices' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Timeframe
                                  </label>
                                  <select
                                    value={toolParams.timeframe || '1d'}
                                    onChange={(e) => handleParamChange('timeframe', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  >
                                    <option value="1h">1 Hour</option>
                                    <option value="1d">1 Day</option>
                                    <option value="1w">1 Week</option>
                                    <option value="1m">1 Month</option>
                                  </select>
                                </div>
                              </>
                            )}
                            
                            {/* Token Market Data */}
                            {selectedTool === 'get_token_market_data' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Token Address
                                </label>
                                <input
                                  type="text"
                                  value={toolParams.tokenAddress || ''}
                                  onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                  placeholder="Enter token address"
                                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                              </div>
                            )}
                            
                            {/* Multiple Tokens Market Data */}
                            {selectedTool === 'get_multiple_tokens_market_data' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Token Addresses (comma-separated)
                                </label>
                                <input
                                  type="text"
                                  value={toolParams.tokenAddresses || ''}
                                  onChange={(e) => handleParamChange('tokenAddresses', e.target.value)}
                                  placeholder="Enter token addresses separated by commas"
                                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                              </div>
                            )}
                            
                            {/* Token Portfolio */}
                            {selectedTool === 'get_token_portfolio' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Wallet Address
                                </label>
                                <input
                                  type="text"
                                  value={toolParams.walletAddress || ''}
                                  onChange={(e) => handleParamChange('walletAddress', e.target.value)}
                                  placeholder="Enter wallet address"
                                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                              </div>
                            )}
                          </>
                        )}
                        
                        {/* Token Discovery MCP Tool Parameters */}
                        {selectedServer === 'github.com/tradeforce/token-discovery-mcp' && (
                          <>
                            {/* Scan New Tokens */}
                            {selectedTool === 'scan_new_tokens' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Timeframe
                                  </label>
                                  <select
                                    value={toolParams.timeframe || '24h'}
                                    onChange={(e) => handleParamChange('timeframe', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  >
                                    <option value="1h">1 Hour</option>
                                    <option value="6h">6 Hours</option>
                                    <option value="24h">24 Hours</option>
                                    <option value="7d">7 Days</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Minimum Liquidity (USD)
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.minLiquidity || ''}
                                    onChange={(e) => handleParamChange('minLiquidity', parseInt(e.target.value))}
                                    placeholder="Minimum liquidity in USD"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Limit
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.limit || ''}
                                    onChange={(e) => handleParamChange('limit', parseInt(e.target.value))}
                                    placeholder="Number of tokens to return"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                              </>
                            )}
                            
                            {/* Analyze Token */}
                            {selectedTool === 'analyze_token' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id="includeContractAudit"
                                    checked={toolParams.includeContractAudit !== false}
                                    onChange={(e) => handleParamChange('includeContractAudit', e.target.checked)}
                                    className="mr-2"
                                  />
                                  <label htmlFor="includeContractAudit" className="text-sm text-gray-700 dark:text-gray-300">
                                    Include Contract Audit
                                  </label>
                                </div>
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id="includeSocialMetrics"
                                    checked={toolParams.includeSocialMetrics !== false}
                                    onChange={(e) => handleParamChange('includeSocialMetrics', e.target.checked)}
                                    className="mr-2"
                                  />
                                  <label htmlFor="includeSocialMetrics" className="text-sm text-gray-700 dark:text-gray-300">
                                    Include Social Metrics
                                  </label>
                                </div>
                              </>
                            )}
                            
                            {/* Monitor Token */}
                            {selectedTool === 'monitor_token' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Price Change Alert Threshold (%)
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.alertThresholds?.priceChangePercent || ''}
                                    onChange={(e) => handleParamChange('alertThresholds', {
                                      ...toolParams.alertThresholds,
                                      priceChangePercent: parseInt(e.target.value)
                                    })}
                                    placeholder="Price change percentage"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Volume Change Alert Threshold (%)
                                  </label>
                                  <input
                                    type="number"
                                    value={toolParams.alertThresholds?.volumeChangePercent || ''}
                                    onChange={(e) => handleParamChange('alertThresholds', {
                                      ...toolParams.alertThresholds,
                                      volumeChangePercent: parseInt(e.target.value)
                                    })}
                                    placeholder="Volume change percentage"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                              </>
                            )}
                            
                            {/* Prepare Snipe */}
                            {selectedTool === 'prepare_snipe' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Token Address
                                  </label>
                                  <input
                                    type="text"
                                    value={toolParams.tokenAddress || ''}
                                    onChange={(e) => handleParamChange('tokenAddress', e.target.value)}
                                    placeholder="Enter token address"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"
                                  />
                                </div>
                                <div>
