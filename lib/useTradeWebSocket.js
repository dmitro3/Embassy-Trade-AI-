"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSolanaFee } from './networks.js';
import useTradeSignalSimulator from './simulateTradeSignals.js';

const NOTIFICATION_SOUND_URL = '/notification.mp3';
// Optimized WebSocket URLs with better fallback mechanism
const WS_URLS = [
  'wss://devnet-rpc.shyft.to/ws?api_key=wUdL5eei8B56NKaE', // Primary URL with correct /ws path
  'wss://api.devnet.solana.com', // Fallback URL
  'wss://devnet-rpc.shyft.to?api_key=wUdL5eei8B56NKaE', // Original URL as last resort
  'wss://solana-devnet-rpc.allthatnode.com' // Additional fallback
];
// Prevent excessive reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 3; // Reduced from 5
const RECONNECT_DELAY = 2000; // Reduced from 3000
const CONNECTION_TIMEOUT = 8000; // Reduced from 10000
const PING_INTERVAL = 45000; // Increased from 30000 to reduce overhead

export function useTradeWebSocket() {
  const [tradePrompt, setTradePrompt] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [latestSignal, setLatestSignal] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [solanaFee, setSolanaFee] = useState(0.000005); // Default fee value
  const [autoAccept, setAutoAccept] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('autoAccept')) || false;
      } catch {
        return false;
      }
    }
    return false;
  });
  // Default to simulation mode in most cases to improve performance
  const [isSimulationMode, setIsSimulationMode] = useState(true);
  const [connectionStats, setConnectionStats] = useState({
    latency: 0,
    reconnects: 0,
    lastPing: null,
    messagesReceived: 0
  });
  
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const currentUrlIndex = useRef(0);
  const pingTimestamp = useRef(0);
  const connectionErrorShown = useRef(false);

  // Create a ref for the sendTradeResponse function to avoid circular reference
  const sendTradeResponseRef = useRef(null);
  // Create a ref for the handleTradeAccept function to avoid circular reference
  const handleTradeAcceptRef = useRef(null);

  // Check if we're in simulation mode - do this early to prevent WebSocket connection attempt
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we're on the simulation page or WhaleTracker page
      const inSimulation = window.location.pathname.includes('/simulation') || 
                          window.location.pathname.includes('/whale') ||
                          window.location.hash.includes('whale');
      
      setIsSimulationMode(inSimulation);
      
      // If in simulation mode, consider always connected but don't create a real WebSocket
      if (inSimulation) {
        setIsConnected(true);
        setConnectionError(null);
        
        // Clear any existing WebSocket connection to free up resources
        if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
          try {
            ws.current.close();
            ws.current = null;
          } catch (err) {
            console.error('Error closing WebSocket:', err);
          }
        }
      }
    }
  }, []);

  // Send trade response - define this function early with ref
  const sendTradeResponse = useCallback((tradeId, decision) => {
    if (isSimulationMode) {
      console.log(`Simulation: Trade ${tradeId} ${decision}ed`);
      return;
    }
    
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify({
          type: 'trade_response',
          id: tradeId,
          decision,
          includedFee: solanaFee // Include the Solana fee in the response
        }));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        // Don't attempt to reconnect in simulation mode
        if (!isSimulationMode) {
          reconnect();
        }
      }
    } else {
      console.log('Cannot send trade response: WebSocket not connected. Using simulation mode instead.');
      // Use simulation mode as fallback
      setIsSimulationMode(true);
    }
  }, [solanaFee, isSimulationMode]);

  // Update the ref whenever the function changes
  useEffect(() => {
    sendTradeResponseRef.current = sendTradeResponse;
  }, [sendTradeResponse]);

  // Handle trade actions - define this function early and update ref
  const handleTradeAccept = useCallback((trade) => {
    if (!trade) return;
    
    const tradeRecord = {
      trade,
      timestamp: new Date().toISOString(),
      status: 'executed',
      profit_loss: 0, // Will be updated when trade is closed
      solanaFee: solanaFee // Include the current Solana fee
    };
    
    setTradeHistory(prev => [tradeRecord, ...prev]);
    setTradePrompt(null);
    sendTradeResponseRef.current(trade.id, 'accept');
  }, [solanaFee]);

  // Update the ref whenever the function changes
  useEffect(() => {
    handleTradeAcceptRef.current = handleTradeAccept;
  }, [handleTradeAccept]);

  // Helper function for reconnection - only attempt if not in simulation mode
  const reconnect = useCallback(() => {
    // Don't attempt reconnection in simulation mode
    if (isSimulationMode) {
      console.log('Simulation mode: skipping WebSocket reconnection');
      return;
    }
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    reconnectAttempts.current += 1;
    
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      // Fall back to simulation mode after multiple failed attempts
      console.log('Maximum reconnection attempts reached. Falling back to simulation mode.');
      setIsSimulationMode(true);
      setIsConnected(true); // Simulate connected state
      
      if (!connectionErrorShown.current) {
        connectionErrorShown.current = true;
        // Only show this message once
        console.warn('Using local simulation mode due to connection issues.');
      }
      return;
    }
    
    setConnectionStats(prev => ({
      ...prev,
      reconnects: prev.reconnects + 1
    }));
    
    // Apply exponential backoff to reconnection attempts
    const delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts.current), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeout.current = setTimeout(() => {
      connect(); // Attempt reconnection
    }, delay);
  }, [isSimulationMode]);

  // Initialize and fetch Solana fee
  useEffect(() => {
    // Skip network operations in simulation mode
    if (typeof window === 'undefined' || isSimulationMode) {
      return;
    }
    
    // Fetch real-time Solana fee
    const fetchSolanaFee = async () => {
      try {
        const fee = await getSolanaFee();
        setSolanaFee(fee);
      } catch (error) {
        console.error('Error fetching Solana fee:', error);
        // Fallback to default fee is handled in getSolanaFee()
      }
    };

    fetchSolanaFee();
    
    // Refresh fee every 5 minutes
    const feeInterval = setInterval(fetchSolanaFee, 5 * 60 * 1000);
    
    return () => clearInterval(feeInterval);
  }, [isSimulationMode]);

  // Send ping message with timestamp for latency calculation
  const sendPing = useCallback(() => {
    // Skip ping in simulation mode
    if (isSimulationMode) return;
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        pingTimestamp.current = performance.now();
        ws.current.send(JSON.stringify({ 
          type: 'ping',
          timestamp: pingTimestamp.current
        }));
        setConnectionStats(prev => ({
          ...prev,
          lastPing: new Date().toISOString()
        }));
      } catch (e) {
        console.log('Error sending ping:', e);
        // Attempt to reconnect on ping error
        reconnect();
      }
    }
  }, [reconnect, isSimulationMode]);

  // Handle WebSocket connection and reconnection
  const connect = useCallback(() => {
    // Skip WebSocket connection entirely in simulation mode
    if (isSimulationMode) {
      console.log('Skipping WebSocket connection in simulation mode');
      setIsConnected(true); // Fake connected state in simulation mode
      return;
    }
    
    // Check if we're on the client side
    if (typeof window === 'undefined') {
      console.log('Skipping WebSocket connection on server-side render');
      return;
    }
    
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS * 2 && 
        currentUrlIndex.current >= WS_URLS.length - 1) {
      console.log('Maximum reconnection attempts reached. Falling back to simulation mode.');
      setIsSimulationMode(true);
      setIsConnected(true); // Simulate connected state
      return;
    }

    try {
      // Close any existing connection first
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        try {
          ws.current.close();
        } catch (e) {
          console.log('Error closing existing WebSocket:', e);
        }
      }
      
      const currentWsUrl = WS_URLS[currentUrlIndex.current];
      console.log(`Connecting to WebSocket: ${currentWsUrl} (Attempt ${reconnectAttempts.current + 1})`);
      
      // Use a try-catch block specifically for WebSocket creation
      try {
        ws.current = new WebSocket(currentWsUrl);
      } catch (wsError) {
        console.error('Error creating WebSocket instance:', wsError);
        // Move to next URL immediately on critical creation error
        currentUrlIndex.current = (currentUrlIndex.current + 1) % WS_URLS.length;
        reconnect();
        return;
      }

      // Set connection timeout - abort after CONNECTION_TIMEOUT ms and try again
      const connectionTimeout = setTimeout(() => {
        if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
          console.log('WebSocket connection timeout');
          try {
            ws.current.close();
          } catch (e) {
            console.log('Error closing timed out WebSocket:', e);
          }
          reconnect();
        }
      }, CONNECTION_TIMEOUT);

      ws.current.onopen = () => {
        clearTimeout(connectionTimeout); // Clear the timeout when successfully connected
        setIsConnected(true);
        setConnectionError(null);
        console.log(`Connected to trading server using ${currentWsUrl}`);
        reconnectAttempts.current = 0;
        
        // Send initial ping to establish connection quality
        sendPing();
        
        // Set up ping interval to keep connection alive and measure latency
        const pingInterval = setInterval(() => {
          // Check connection state before sending ping
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            sendPing();
          } else {
            clearInterval(pingInterval); // Stop interval if connection is lost
          }
        }, PING_INTERVAL);
        
        // Store the interval ID in the WebSocket object for cleanup
        ws.current.pingInterval = pingInterval;
      };

      ws.current.onclose = (event) => {
        clearTimeout(connectionTimeout); // Clear the timeout on close
        
        // Clean up ping interval if it exists
        if (ws.current && ws.current.pingInterval) {
          clearInterval(ws.current.pingInterval);
        }

        // Only handle disconnect events if we're not in simulation mode
        if (!isSimulationMode) {
          setIsConnected(false);
          const currentUrl = WS_URLS[currentUrlIndex.current];
          
          console.log(`WebSocket closed. Attempting to reconnect...`);
          
          // After multiple attempts, silently fall back to simulation mode
          if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Multiple reconnection attempts failed. Switching to simulation mode.');
            setIsSimulationMode(true);
            setIsConnected(true);
          } else {
            reconnect();
          }
        }
      };

      ws.current.onmessage = async (event) => {
        try {
          // Update message counter for stats
          setConnectionStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1
          }));
          
          // Check for pong response first
          if (event.data === '{"type":"pong"}' || event.data.includes('"type":"pong"')) {
            // Calculate latency if we have a timestamp
            if (pingTimestamp.current > 0) {
              const latency = performance.now() - pingTimestamp.current;
              setConnectionStats(prev => ({
                ...prev,
                latency
              }));
              pingTimestamp.current = 0;
            }
            // Connection is alive, no need for further processing
            return;
          }
          
          // First check if the data is valid JSON
          let message;
          try {
            message = JSON.parse(event.data);
          } catch (jsonError) {
            console.error('Received invalid JSON from WebSocket:', jsonError);
            console.log('Raw data received:', event.data.substring(0, 200) + '...');
            return; // Skip processing this message
          }
          
          // Handle different message types
          switch (message.type) {
            case 'trade_prompt':
              // Play notification sound for new trade prompt
              if (typeof window !== 'undefined') {
                const audio = new Audio(NOTIFICATION_SOUND_URL);
                audio.play().catch(e => console.log('Error playing notification sound:', e));
              }
              
              setTradePrompt(message);
              
              // Auto-accept trade if enabled
              if (autoAccept) {
                handleTradeAcceptRef.current(message);
              }
              break;
              
            case 'trade_result':
              // Find the corresponding trade in history and update its profit/loss
              setTradeHistory(prev => prev.map(item => {
                if (item.trade && item.trade.id === message.id) {
                  return {
                    ...item,
                    profit_loss: message.profit_loss,
                    closed_at: message.timestamp
                  };
                }
                return item;
              }));
              break;
              
            case 'error':
              console.error('Server error:', message.message || 'Unknown error');
              break;
              
            default:
              // Handle signals data
              if (message.signals?.[0]) {
                setLatestSignal(message.signals[0]);
              }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        clearTimeout(connectionTimeout); // Clear the timeout on error
        
        if (!isSimulationMode) {
          console.log('WebSocket error - will use simulation mode as fallback');
          
          // After multiple failures, silently switch to simulation mode
          if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS - 1) {
            setIsSimulationMode(true);
            setIsConnected(true);
            console.log('Automatically switched to simulation mode after connection failures');
          } else {
            // Continue with reconnect even on error
            reconnect();
          }
        }
      };
    } catch (error) {
      if (!isSimulationMode) {
        console.log('Error creating WebSocket connection - using simulation mode instead');
        setIsSimulationMode(true);
        setIsConnected(true);
      }
    }
  }, [isSimulationMode, reconnect, autoAccept, sendPing]);

  // Initialize WebSocket connection - but only if not in simulation mode
  useEffect(() => {
    // Exit early if on server-side
    if (typeof window === 'undefined') return;
    
    // Check if we're viewing the WhaleTracker
    if (typeof window !== 'undefined') {
      const isWhaleTrackerView = window.location.pathname.includes('/whale') || 
                                window.location.hash.includes('whale');
      if (isWhaleTrackerView && !isSimulationMode) {
        console.log('Whale tracker detected - forcing simulation mode');
        setIsSimulationMode(true);
      }
    }
    
    // Only attempt to connect if not in simulation mode
    if (!isSimulationMode) {
      connect();
    } else {
      // In simulation mode, make sure we're "connected" but without a real WebSocket
      setIsConnected(true);
      setConnectionError(null);
      // Don't even try to use real WebSockets in simulation mode
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        try {
          ws.current.close();
          ws.current = null;
        } catch (e) {
          console.error('Error closing WebSocket:', e);
        }
      }
    }
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        // Clear ping interval if it exists
        if (ws.current.pingInterval) {
          clearInterval(ws.current.pingInterval);
        }
        
        if (ws.current.readyState !== WebSocket.CLOSED) {
          try {
            ws.current.close();
          } catch (e) {
            console.error('Error closing WebSocket:', e);
          }
        }
      }
    };
  }, [connect, isSimulationMode]);

  // Handle auto-accept toggle
  const toggleAutoAccept = useCallback((value) => {
    const newValue = typeof value === 'boolean' ? value : !autoAccept;
    setAutoAccept(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoAccept', JSON.stringify(newValue));
    }
    return newValue;
  }, [autoAccept]);

  // Handle trade decline
  const handleTradeDecline = useCallback((trade) => {
    if (!trade) return;
    
    setTradeHistory(prev => [{
      trade,
      timestamp: new Date().toISOString(),
      status: 'declined',
      solanaFee: solanaFee // Include the current Solana fee even on declined trades for record-keeping
    }, ...prev]);
    
    setTradePrompt(null);
    sendTradeResponseRef.current(trade.id, 'decline');
  }, [solanaFee]);

  // Use simulated signals in simulation mode
  const simulatedSignal = useTradeSignalSimulator(30, isSimulationMode);
  
  // Update latest signal from simulator when in simulation mode
  useEffect(() => {
    if (isSimulationMode && simulatedSignal) {
      setLatestSignal(simulatedSignal);
    }
  }, [simulatedSignal, isSimulationMode]);

  return {
    isConnected,
    connectionError,
    tradePrompt,
    tradeHistory,
    latestSignal,
    autoAccept,
    solanaFee,
    toggleAutoAccept,
    handleTradeAccept,
    handleTradeDecline,
    isSimulationMode,
    connectionStats  // New stats for monitoring connection quality
  };
}

export default useTradeWebSocket;