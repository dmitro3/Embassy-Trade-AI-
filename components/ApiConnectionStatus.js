'use client';

import React, { useEffect, useState, useCallback } from 'react';
import logger from '../lib/logger';

/**
 * API Connection Status Component
 * 
 * Displays the connection status of various APIs used in the application
 * with visual indicators for health status
 */
const ApiConnectionStatus = ({ 
  wsStatus, 
  birdeyeStatus, 
  reconnectWebSocket, 
  refreshBirdeyeData,
  showDetails = false 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [statusHistory, setStatusHistory] = useState({
    websocket: [],
    birdeye: []
  });
  const maxHistoryItems = 5;
  
  // Status indicators
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'connected':
      case 'success':
        return { color: 'bg-green-500', text: 'Connected' };
      case 'connecting':
      case 'loading':
      case 'partial':
        return { color: 'bg-yellow-500', text: 'Connecting' };
      case 'disconnected':
        return { color: 'bg-yellow-500', text: 'Disconnected' };
      case 'error':
      case 'failed':
        return { color: 'bg-red-500', text: 'Error' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown' };
    }
  };
  
  // Add to status history
  const updateStatusHistory = useCallback((type, status, timestamp = new Date()) => {
    setStatusHistory(prev => {
      const newHistory = { ...prev };
      // Add new status if it's different from the most recent one
      const lastStatus = newHistory[type][0];
      if (!lastStatus || lastStatus.status !== status) {
        newHistory[type] = [
          { status, timestamp },
          ...newHistory[type]
        ].slice(0, maxHistoryItems);
      }
      return newHistory;
    });
  }, []);
  
  // Track status changes
  useEffect(() => {
    updateStatusHistory('websocket', wsStatus);
  }, [wsStatus, updateStatusHistory]);
  
  useEffect(() => {
    updateStatusHistory('birdeye', birdeyeStatus);
  }, [birdeyeStatus, updateStatusHistory]);

  // Handle manual reconnect attempts
  const handleWebsocketReconnect = () => {
    logger.info('Manual WebSocket reconnection requested by user');
    if (reconnectWebSocket) {
      reconnectWebSocket();
    }
  };
  
  const handleBirdeyeRefresh = () => {
    logger.info('Manual Birdeye data refresh requested by user');
    if (refreshBirdeyeData) {
      refreshBirdeyeData();
    }
  };

  // Get WebSocket status UI elements
  const wsIndicator = getStatusIndicator(wsStatus);
  const birdeyeIndicator = getStatusIndicator(birdeyeStatus);
  
  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-2 text-white text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-4">API Status:</span>
          <div className="flex items-center mr-4">
            <span className="mr-1">WebSocket:</span>
            <div className={`w-2 h-2 rounded-full ${wsIndicator.color} mr-1`}></div>
            <span>{wsIndicator.text}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-1">Birdeye API:</span>
            <div className={`w-2 h-2 rounded-full ${birdeyeIndicator.color} mr-1`}></div>
            <span>{birdeyeIndicator.text}</span>
          </div>
        </div>
        <div className="flex items-center">
          <button 
            onClick={handleWebsocketReconnect} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs mr-2"
            disabled={wsStatus === 'connected'}
          >
            Reconnect WS
          </button>
          <button 
            onClick={handleBirdeyeRefresh} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs mr-2"
          >
            Refresh Data
          </button>
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-2 border-t border-gray-700 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1">WebSocket Status History</h4>
              <ul className="space-y-1">
                {statusHistory.websocket.map((item, index) => (
                  <li key={`ws-${index}`} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${getStatusIndicator(item.status).color} mr-2`}></div>
                    <span className="mr-2">{item.status}</span>
                    <span className="text-gray-400">{formatTime(item.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Birdeye API Status History</h4>
              <ul className="space-y-1">
                {statusHistory.birdeye.map((item, index) => (
                  <li key={`be-${index}`} className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${getStatusIndicator(item.status).color} mr-2`}></div>
                    <span className="mr-2">{item.status}</span>
                    <span className="text-gray-400">{formatTime(item.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Additional debugging info */}
          {showDetails && (
            <div className="mt-2 border-t border-gray-700 pt-2">
              <h4 className="font-semibold mb-1">API Error Counts</h4>
              <pre className="bg-gray-900 p-1 rounded text-xs overflow-x-auto">
                {JSON.stringify(logger.getApiErrorCounts?.() || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiConnectionStatus;
