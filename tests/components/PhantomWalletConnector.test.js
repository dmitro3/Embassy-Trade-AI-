import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhantomWalletConnector from '../../components/PhantomWalletConnector';

// Mock dependencies
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn().mockReturnValue({
    connected: false,
    publicKey: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    wallet: null,
    isReady: true
  }),
}));

// Mock useEffect
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useEffect: jest.fn().mockImplementation(originalReact.useEffect),
  };
});

describe('PhantomWalletConnector', () => {
  let mockOnWalletChange;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a spy function for onWalletChange
    mockOnWalletChange = jest.fn();
    
    // Initialize counter to track calls
    global.onWalletChangeCalls = 0;
  });
  
  test('should prevent infinite update loops with debounced wallet changes', async () => {
    // Setup mock wallet data to simulate updates
    const mockWallet = {
      connected: false,
      publicKey: null,
    };
    
    require('@solana/wallet-adapter-react').useWallet.mockReturnValue(mockWallet);
    
    // Render the component with our mock function
    render(<PhantomWalletConnector 
      onWalletChange={mockOnWalletChange} 
      preferredWalletType="phantom" />
    );
    
    // Simulate a wallet connection
    act(() => {
      mockWallet.connected = true;
      mockWallet.publicKey = {
        toString: () => 'testPublicKey123',
        toBase58: () => 'testPublicKey123'
      };
      
      // Force React to re-render
      require('@solana/wallet-adapter-react').useWallet.mockReturnValue({...mockWallet});
      
      // Manually trigger the useEffect - simulating component update
      const [effectFn] = React.useEffect.mock.calls[0];
      effectFn();
    });
    
    // Wait for debounce to finish
    await waitFor(() => {
      expect(mockOnWalletChange).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
    
    // Simulate multiple rapid updates that should be debounced
    act(() => {
      // Update multiple times in rapid succession
      for (let i = 0; i < 5; i++) {
        mockWallet.publicKey = {
          toString: () => `testPublicKey${i}`,
          toBase58: () => `testPublicKey${i}`
        };
        
        // Force React to re-render
        require('@solana/wallet-adapter-react').useWallet.mockReturnValue({...mockWallet});
        
        // Manually trigger the useEffect - simulating component update
        const [effectFn] = React.useEffect.mock.calls[0];
        effectFn();
      }
    });
    
    // Wait for debounce to finish - should only trigger one additional call after debounce
    await waitFor(() => {
      // We expect only one more call (total 2) because the rapid updates should be debounced
      expect(mockOnWalletChange).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
  });
  
  test('should not trigger wallet change when no real state change occurs', async () => {
    // Setup mock wallet data
    const mockWallet = {
      connected: true,
      publicKey: {
        toString: () => 'testPublicKey123',
        toBase58: () => 'testPublicKey123'
      },
      balance: 100,
      isReady: true,
    };
    
    require('@solana/wallet-adapter-react').useWallet.mockReturnValue(mockWallet);
    
    // Initial render
    render(<PhantomWalletConnector 
      onWalletChange={mockOnWalletChange} 
      preferredWalletType="phantom" />
    );
    
    // Wait for initial call to complete
    await waitFor(() => {
      expect(mockOnWalletChange).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
    
    // Reset mock to clear initial call
    mockOnWalletChange.mockClear();
    
    // Simulate an update with same wallet state - should not trigger new call
    act(() => {
      // Force React to re-render with identical wallet data
      require('@solana/wallet-adapter-react').useWallet.mockReturnValue({...mockWallet});
      
      // Manually trigger the useEffect - simulating component update
      const [effectFn] = React.useEffect.mock.calls[0];
      effectFn();
    });
    
    // Wait to ensure no new calls are made
    await waitFor(() => {
      expect(mockOnWalletChange).not.toHaveBeenCalled();
    }, { timeout: 500 });
  });
});
