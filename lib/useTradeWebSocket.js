"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSolanaFee } from './networks';

const NOTIFICATION_SOUND_URL = '/notification.mp3';
const WS_URL = 'ws://localhost:4000';  // Point to our local trading server
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

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
  
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);

  // Initialize notifications and fetch Solana fee
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Request notification permissions
      if ('Notification' in window) {
        Notification.requestPermission().catch(() => {
          // Silently handle notification permission errors
        });
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
    }
  }, []);

  // Handle WebSocket connection and reconnection
  const connect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError('Maximum reconnection attempts reached. Please refresh the page to try again.');
      return;
    }

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('Connected to trading server');
        reconnectAttempts.current = 0;
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionError(`Trading server disconnected. Attempting to reconnect... (${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        reconnectAttempts.current += 1;
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      };

      ws.current.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle different message types
          if (message.type === 'trade_prompt') {
            // Add Solana fee information to the trade prompt
            const tradeWithFee = {
              ...message,
              solanaFee: solanaFee
            };
            
            if (autoAccept) {
              handleTradeAccept(tradeWithFee);
            } else {
              setTradePrompt(tradeWithFee);
            }
            return;
          }

          if (message.signals?.[0]) {
            const signal = message.signals[0];
            setLatestSignal(signal);

            // Show notification for significant signals
            if (signal.confidence > 0.8 && typeof window !== 'undefined') {
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('High Confidence Trade Signal', {
                    body: `${signal.action.toUpperCase()} EMB at $${signal.price.toFixed(6)} (${(signal.confidence * 100).toFixed(1)}% confidence)`
                  });
                  
                  const audio = new Audio(NOTIFICATION_SOUND_URL);
                  audio.play().catch(() => {
                    // Silently handle audio playback errors
                  });
                } catch (notificationError) {
                  console.error('Notification error:', notificationError);
                }
              }
            }
          }

          if (message.type === 'trade_result') {
            setTradeHistory(prev => [{
              ...message,
              timestamp: new Date().toISOString(),
              status: 'executed',
              solanaFee: solanaFee // Add Solana fee to the trade history
            }, ...prev]);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      ws.current.onerror = (error) => {
        setConnectionError('Cannot connect to trading server. Server may be offline.');
        console.error('WebSocket error:', {});  // Avoid logging full error object which may not stringify well
      };
    } catch (error) {
      setConnectionError('Failed to establish WebSocket connection. Please check your network connection.');
      console.error('Error creating WebSocket connection:', {});
      reconnectAttempts.current += 1;
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    }
  }, [autoAccept, solanaFee]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      connect();
    }
    
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  // Handle auto-accept toggle
  const toggleAutoAccept = useCallback((value) => {
    setAutoAccept(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoAccept', JSON.stringify(value));
    }
  }, []);

  // Send trade response
  const sendTradeResponse = useCallback((tradeId, decision) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'trade_response',
        id: tradeId,
        decision,
        includedFee: solanaFee // Include the Solana fee in the response
      }));
    } else {
      console.error('Cannot send trade response: WebSocket not connected');
    }
  }, [solanaFee]);

  // Handle trade actions
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
    sendTradeResponse(trade.id, 'accept');
  }, [sendTradeResponse, solanaFee]);

  const handleTradeDecline = useCallback((trade) => {
    if (!trade) return;
    
    setTradeHistory(prev => [{
      trade,
      timestamp: new Date().toISOString(),
      status: 'declined',
      solanaFee: solanaFee // Include the current Solana fee even on declined trades for record-keeping
    }, ...prev]);
    
    setTradePrompt(null);
    sendTradeResponse(trade.id, 'decline');
  }, [sendTradeResponse, solanaFee]);

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
    handleTradeDecline
  };
}

export default useTradeWebSocket;