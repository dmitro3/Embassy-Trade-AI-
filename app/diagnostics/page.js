'use client';

import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EnhancedErrorBoundary from '../../components/EnhancedErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamically import MongoDB diagnostic component
const MongoDBDiagnostic = dynamic(
  () => import('../../components/MongoDBDiagnostic'),
  { ssr: false }
);

// Dynamically import Web3 error handler
const Web3ErrorHandler = dynamic(
  () => import('../../components/Web3ErrorHandler'),
  { ssr: false }
);

/**
 * API Diagnostics Page
 * 
 * A page dedicated to testing and diagnosing API and database connectivity issues
 */
export default function DiagnosticsPage() {
  const [apiStatus, setApiStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState({});
  
  // Test endpoints to check
  const endpoints = [
    { name: 'MongoDB Status', url: '/api/mongodb-status' },
    { name: 'Token Discovery Health', url: '/api/token-discovery/health' },
    { name: 'Market Data Health', url: '/api/market-data/health' },
    { name: 'User Profile Health', url: '/api/user-profile/health' }
  ];
  
  // Run API health checks
  const checkApiHealth = async () => {
    setLoading(true);
    
    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        const response = await fetch(endpoint.url, { 
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const endTime = performance.now();
        
        const responseTime = Math.round(endTime - startTime);
        
        if (response.ok) {
          const data = await response.json();
          results[endpoint.name] = {
            status: 'healthy',
            responseTime,
            data
          };
        } else {
          const text = await response.text();
          results[endpoint.name] = {
            status: 'error',
            statusCode: response.status,
            responseTime,
            error: text
          };
        }
      } catch (error) {
        results[endpoint.name] = {
          status: 'error',
          error: error.message
        };
      }
    }
    
    setApiStatus(results);
    setLoading(false);
  };
  
  // Trigger specific error types for testing error handling
  const testErrorHandling = async (errorType) => {
    setIsTesting(true);
    setTestResults({});
    
    try {
      let result;
      
      switch (errorType) {
        case 'react':
          // Cause a React error by trying to access a property of undefined
          result = undefined.property;
          break;
          
        case 'api':
          // Fetch a non-existent API endpoint
          const response = await fetch('/api/non-existent-endpoint');
          result = await response.json();
          break;
          
        case 'syntax':
          // Cause a syntax error
          eval('const x = {');
          break;
          
        case 'async':
          // Cause an error in an async function
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Async error test')), 500);
          });
          break;
          
        case 'web3':
          // Simulate a Web3 error
          const web3Error = new Error('User rejected the request');
          web3Error.code = 4001;
          const event = new CustomEvent('web3-error', { detail: web3Error });
          window.dispatchEvent(event);
          result = 'Web3 error dispatched';
          break;
          
        default:
          result = 'Unknown error type';
      }
      
      setTestResults({ success: true, result });
    } catch (error) {
      console.error(`Test error (${errorType}):`, error);
      setTestResults({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      });
      
      // This is intentional for testing the error logging system
      throw error;
    } finally {
      setIsTesting(false);
    }
  };
  
  // Run API health checks on component mount
  useEffect(() => {
    checkApiHealth();
  }, []);
  
  return (
    <EnhancedErrorBoundary message="An error occurred in the diagnostics page">
      <div className="min-h-screen bg-gray-900 text-white">
        <Web3ErrorHandler />
        <MongoDBDiagnostic />
        <ToastContainer theme="dark" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">TradeForce AI Diagnostics</h1>
            <div className="flex gap-2">
              <button 
                onClick={checkApiHealth} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
              >
                {loading ? 'Checking...' : 'Refresh Status'}
              </button>
              <a 
                href="/tradeforce-ai"
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm font-medium"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* API Health Status */}
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gray-700 px-4 py-3">
                <h2 className="font-medium">API Health Status</h2>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {endpoints.map((endpoint) => {
                      const status = apiStatus[endpoint.name] || {};
                      const isHealthy = status.status === 'healthy';
                      
                      return (
                        <div key={endpoint.name} className="border border-gray-700 rounded-md overflow-hidden">
                          <div className={`px-4 py-3 flex justify-between items-center ${isHealthy ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span className="font-medium">{endpoint.name}</span>
                            </div>
                            <span className="text-sm text-gray-400">
                              {status.responseTime ? `${status.responseTime}ms` : ''}
                            </span>
                          </div>
                          <div className="px-4 py-3 bg-gray-900/50">
                            {isHealthy ? (
                              <div className="text-sm text-gray-300">
                                {endpoint.name === 'MongoDB Status' && (
                                  <div>
                                    <p>Connected to database: {status.data?.database}</p>
                                    <p>Collections: {status.data?.collections?.length || 0}</p>
                                  </div>
                                )}
                                {endpoint.name === 'Token Discovery Health' && (
                                  <div>
                                    <p>Token count: {status.data?.collection?.tokenCount || 0}</p>
                                    <p>Collection exists: {status.data?.collection?.exists ? 'Yes' : 'No'}</p>
                                  </div>
                                )}
                                {endpoint.name === 'Market Data Health' && (
                                  <div>
                                    <p>Data points: {status.data?.collection?.dataPoints || 0}</p>
                                    <p>Data span: {status.data?.collection?.dataSpanDays || 0} days</p>
                                  </div>
                                )}
                                {endpoint.name === 'User Profile Health' && (
                                  <div>
                                    <p>Users: {status.data?.collection?.userCount || 0}</p>
                                    <p>Active users: {status.data?.collection?.activeUsers || 0}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-red-300">
                                {status.error || 'Unknown error'}
                                {status.statusCode && ` (Status: ${status.statusCode})`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Error Handling Testing */}
            <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gray-700 px-4 py-3">
                <h2 className="font-medium">Error Handling Test</h2>
              </div>
              <div className="p-4">
                <div className="mb-4 text-sm text-gray-400">
                  These buttons will intentionally trigger errors to test the error handling system.
                  This helps ensure errors are properly caught and logged.
                </div>
                
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <button
                    onClick={() => testErrorHandling('react')}
                    disabled={isTesting}
                    className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded text-sm"
                  >
                    React Error
                  </button>
                  <button
                    onClick={() => testErrorHandling('api')}
                    disabled={isTesting}
                    className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded text-sm"
                  >
                    API Error
                  </button>
                  <button
                    onClick={() => testErrorHandling('syntax')}
                    disabled={isTesting}
                    className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded text-sm"
                  >
                    Syntax Error
                  </button>
                  <button
                    onClick={() => testErrorHandling('async')}
                    disabled={isTesting}
                    className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded text-sm"
                  >
                    Async Error
                  </button>
                  <button
                    onClick={() => testErrorHandling('web3')}
                    disabled={isTesting}
                    className="bg-red-900/50 hover:bg-red-800/50 px-3 py-2 rounded text-sm"
                  >
                    Web3 Error
                  </button>
                </div>
                
                {Object.keys(testResults).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
                    <h3 className="text-sm font-medium mb-1">Test Results:</h3>
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </EnhancedErrorBoundary>
  );
}
