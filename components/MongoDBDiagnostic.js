'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * MongoDB Connection Diagnostic Component
 * 
 * This component helps diagnose MongoDB connection issues by checking:
 * 1. MongoDB connection status
 * 2. API endpoints that use MongoDB
 * 3. Common configuration issues
 */
export default function MongoDBDiagnostic() {
  const [status, setStatus] = useState({
    mongoDbConnection: 'unknown',
    connectionDetails: null,
    testResults: [],
    isExpanded: false
  });

  useEffect(() => {
    // Check MongoDB connection status
    async function checkConnection() {
      try {
        const res = await fetch('/api/mongodb-status', { 
          method: 'GET',
          cache: 'no-store' 
        });
        
        if (!res.ok) {
          setStatus(prev => ({
            ...prev,
            mongoDbConnection: 'error',
            connectionDetails: `Failed to check MongoDB status: ${res.status} ${res.statusText}`
          }));
          return;
        }
        
        const data = await res.json();
        setStatus(prev => ({
          ...prev,
          mongoDbConnection: data.connected ? 'connected' : 'disconnected',
          connectionDetails: data.details
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          mongoDbConnection: 'error',
          connectionDetails: `Error checking MongoDB connection: ${error.message}`
        }));
      }
    }
    
    checkConnection();
  }, []);

  // Run API endpoint tests
  const runApiTests = async () => {
    setStatus(prev => ({ ...prev, testResults: [] }));
    
    const endpoints = [
      { name: 'Token Discovery', url: '/api/token-discovery/health' },
      { name: 'Market Data', url: '/api/market-data/health' },
      { name: 'User Profile', url: '/api/user-profile/health' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        const res = await fetch(endpoint.url, { cache: 'no-store' });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        let result;
        try {
          result = await res.json();
        } catch (e) {
          result = { error: "Could not parse response as JSON" };
        }
        
        setStatus(prev => ({
          ...prev,
          testResults: [
            ...prev.testResults,
            {
              endpoint: endpoint.name,
              status: res.ok ? 'success' : 'error',
              statusCode: res.status,
              responseTime,
              details: result
            }
          ]
        }));
      } catch (error) {
        setStatus(prev => ({
          ...prev,
          testResults: [
            ...prev.testResults,
            {
              endpoint: endpoint.name,
              status: 'error',
              statusCode: 'N/A',
              responseTime: 0,
              details: { error: error.message }
            }
          ]
        }));
      }
    }
  };

  const toggleExpand = () => {
    setStatus(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  };

  // Status indicator styling
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-amber-500';
      default: return 'bg-gray-400';
    }
  };

  // Render diagnostic UI
  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
      <div 
        className="p-3 cursor-pointer flex justify-between items-center"
        onClick={toggleExpand}
      >
        <div className="flex items-center">
          <div className={`h-3 w-3 rounded-full mr-2 ${getStatusColor(status.mongoDbConnection)}`}></div>
          <span>MongoDB Diagnostic</span>
        </div>
        <button className="text-gray-400 hover:text-white">
          {status.isExpanded ? '▼' : '▲'}
        </button>
      </div>
      
      {status.isExpanded && (
        <div className="p-3 border-t border-gray-700">
          <div className="mb-2">
            <div className="flex justify-between">
              <span className="font-semibold">Connection Status:</span>
              <span className={
                status.mongoDbConnection === 'connected' ? 'text-green-400' :
                status.mongoDbConnection === 'disconnected' ? 'text-red-400' :
                status.mongoDbConnection === 'error' ? 'text-amber-400' : 'text-gray-400'
              }>
                {status.mongoDbConnection.toUpperCase()}
              </span>
            </div>
            {status.connectionDetails && (
              <div className="text-xs text-gray-400 mt-1">
                {typeof status.connectionDetails === 'string' 
                  ? status.connectionDetails
                  : JSON.stringify(status.connectionDetails, null, 2)}
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <button 
              onClick={runApiTests}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition"
            >
              Run API Endpoint Tests
            </button>
          </div>
          
          {status.testResults.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto">
              <div className="text-sm font-semibold mb-2">Test Results:</div>
              {status.testResults.map((test, index) => (
                <div key={index} className="mb-2 p-2 rounded bg-gray-800">
                  <div className="flex justify-between">
                    <span>{test.endpoint}</span>
                    <span className={
                      test.status === 'success' ? 'text-green-400' : 'text-red-400'
                    }>
                      {test.statusCode}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Response time: {test.responseTime}ms
                  </div>
                  {test.details && (
                    <div className="text-xs font-mono mt-1 p-1 bg-gray-900 rounded overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
