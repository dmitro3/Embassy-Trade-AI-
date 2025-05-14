import { renderHook, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useEnhancedShyftWebSocket } from '../../lib/enhancedShyftWebSocket';

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
    
    // Call onopen after a short delay to simulate connection
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) this.onopen({ target: this });
    }, 50);
  }
  
  send(data) {
    // Mock send functionality
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not connected');
    }
  }
  
  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' });
  }
};

// Mock fetch for network check
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    status: 200
  })
);

// Mock logger
jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('enhancedShyftWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('should establish WebSocket connection with network check', async () => {
    // Spy on WebSocket constructor
    const webSocketSpy = jest.spyOn(global, 'WebSocket');
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    // Render the hook with test config
    const { result } = renderHook(() => useEnhancedShyftWebSocket({
      apiKey: 'test-api-key',
      endpoint: 'wss://test-endpoint.com',
      fallbackEndpoint: 'wss://fallback-endpoint.com',
    }));
    
    // Wait for connection to be established
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/health', expect.any(Object));
      expect(webSocketSpy).toHaveBeenCalledWith('wss://test-endpoint.com');
      expect(result.current.connectionStatus).toBe('connected');
    });
    
    // Verify that the connection was established
    expect(result.current.isConnected).toBe(true);
  });
  
  test('should attempt fallback connection when primary fails', async () => {
    // Override WebSocket to simulate failure on first attempt
    let connectionAttempt = 0;
    global.WebSocket = class MockFailingWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
        
        // Fail first connection attempt, succeed on fallback
        connectionAttempt++;
        
        if (connectionAttempt === 1) {
          // Fail the first attempt (primary endpoint)
          setTimeout(() => {
            if (this.onerror) this.onerror(new Error('Connection failed'));
            if (this.onclose) this.onclose({ code: 1006, reason: 'Abnormal closure' });
          }, 50);
        } else {
          // Succeed on fallback endpoint
          setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) this.onopen({ target: this });
          }, 50);
        }
      }
      
      send(data) {
        // Mock send functionality
        if (this.readyState !== 1) {
          throw new Error('WebSocket is not connected');
        }
      }
      
      close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose({ code: 1000, reason: 'Normal closure' });
      }
    };
    
    // Spy on WebSocket constructor
    const webSocketSpy = jest.spyOn(global, 'WebSocket');
    
    // Render the hook with test config
    const { result } = renderHook(() => useEnhancedShyftWebSocket({
      apiKey: 'test-api-key',
      endpoint: 'wss://test-endpoint.com',
      fallbackEndpoint: 'wss://fallback-endpoint.com',
    }));
    
    // Wait for initial failure
    await waitFor(() => {
      expect(webSocketSpy).toHaveBeenCalledWith('wss://test-endpoint.com');
      expect(result.current.connectionStatus).toBe('disconnected');
    });
    
    // Wait for fallback connection
    await waitFor(() => {
      expect(webSocketSpy).toHaveBeenCalledWith('wss://fallback-endpoint.com');
      expect(result.current.connectionStatus).toBe('connected');
    }, { timeout: 5000 });
    
    // Verify that the connection was established using fallback
    expect(result.current.isConnected).toBe(true);
  });
  
  test('should handle network connectivity check failure gracefully', async () => {
    // Mock fetch to simulate network failure
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
    
    // Spy on WebSocket constructor
    const webSocketSpy = jest.spyOn(global, 'WebSocket');
    
    // Render the hook with test config
    const { result } = renderHook(() => useEnhancedShyftWebSocket({
      apiKey: 'test-api-key',
      endpoint: 'wss://test-endpoint.com',
    }));
    
    // Wait for connection attempt despite network check failure
    await waitFor(() => {
      // Should still attempt WebSocket connection despite network check failing
      expect(webSocketSpy).toHaveBeenCalledWith('wss://test-endpoint.com');
    });
  });
});
