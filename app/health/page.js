'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '../../lib/logger';

/**
 * TradeForce Health Dashboard
 * 
 * Provides a comprehensive view of all system components' health status,
 * including API response times, error rates, and connection status
 */
export default function HealthPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Fetch health data
  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/health');
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setHealthData(data);
        setError(null);
        
        // Show a toast notification if any API is unhealthy
        if (!data.allHealthy) {
          const unhealthyApis = Object.keys(data.apis)
            .filter(api => !data.apis[api].healthy)
            .join(', ');
            
          toast.error(`Unhealthy APIs detected: ${unhealthyApis}`);
        }
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      logger.error(`Error fetching health data: ${error.message}`, {
        module: 'healthDashboard'
      });
      setError(error.message);
      toast.error(`Failed to fetch system health: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchHealthData();
  }, []);
  
  // Auto-refresh if enabled
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchHealthData();
      }, 60000); // 60 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);
  
  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };
  
  // Calculate success rate percentage
  const calculateSuccessRate = (api) => {
    if (!healthData?.stats?.[api]) return 'N/A';
    
    const { totalChecks, successChecks } = healthData.stats[api];
    
    if (!totalChecks) return '0%';
    
    const rate = (successChecks / totalChecks) * 100;
    return `${rate.toFixed(1)}%`;
  };
  
  // Get status badge color
  const getStatusColor = (isHealthy) => {
    return isHealthy ? 'bg-green-500' : 'bg-red-500';
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-3">TradeForce System Health</h1>
        <p className="text-gray-300 mb-8">Monitor the health status of all system components</p>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchHealthData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {loading ? 'Checking...' : 'Refresh Status'}
            </button>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={() => setAutoRefresh(!autoRefresh)}
                className="mr-2"
              />
              <label htmlFor="autoRefresh">Auto-refresh (every 60s)</label>
            </div>
          </div>
          
          {healthData && (
            <div className="text-sm text-gray-400">
              Last updated: {formatTime(healthData.timestamp)}
            </div>
          )}
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-white rounded-lg p-4 mb-6">
            <p className="font-bold">Error checking system health:</p>
            <p>{error}</p>
          </div>
        )}
        
        {healthData && (
          <>
            {/* Overall System Status */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-4">Overall System Status</h2>
              
              <div className="flex items-center mb-4">
                <div className={`w-4 h-4 rounded-full mr-3 ${healthData.allHealthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xl font-medium">
                  {healthData.allHealthy ? 'All Systems Operational' : 'System Issues Detected'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                {Object.keys(healthData.apis).map(api => (
                  <div key={api} className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium capitalize">{api} API</h3>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${healthData.apis[api].healthy ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {healthData.apis[api].healthy ? 'HEALTHY' : 'ISSUES DETECTED'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                      <div>Response Time:</div>
                      <div>{healthData.apis[api].responseTime}ms</div>
                      
                      <div>Success Rate:</div>
                      <div>{calculateSuccessRate(api)}</div>
                      
                      <div>Last Check:</div>
                      <div>{formatTime(healthData.stats[api].lastCheckTime)}</div>
                    </div>
                    
                    {!healthData.apis[api].healthy && (
                      <div className="mt-3 text-sm text-red-300">
                        {healthData.apis[api].error || 'Unknown error'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Detailed Statistics */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">API Performance Statistics</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-gray-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">API</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Total Checks</th>
                      <th className="px-4 py-3">Success Rate</th>
                      <th className="px-4 py-3">Avg. Response Time</th>
                      <th className="px-4 py-3">Last Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(healthData.stats).map(api => (
                      <tr key={api} className="border-b border-gray-700">
                        <td className="px-4 py-3 font-medium capitalize">{api}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(healthData.stats[api].lastStatus === 'healthy')}`}></div>
                            <span>{healthData.stats[api].lastStatus || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{healthData.stats[api].totalChecks}</td>
                        <td className="px-4 py-3">{calculateSuccessRate(api)}</td>
                        <td className="px-4 py-3">
                          {healthData.stats[api].responseTime.length > 0
                            ? `${(healthData.stats[api].responseTime.reduce((a, b) => a + b, 0) / healthData.stats[api].responseTime.length).toFixed(1)}ms`
                            : 'N/A'
                          }
                        </td>
                        <td className="px-4 py-3">{formatTime(healthData.stats[api].lastCheckTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {loading && !healthData && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Checking system health...</p>
          </div>
        )}
      </div>
    </div>
  );
}
