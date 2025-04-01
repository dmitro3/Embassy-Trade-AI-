import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TradingSimulator from '@/components/TradingSimulator';
import * as NetworksModule from '@/lib/networks';
import useTradeWebSocket from '@/lib/useTradeWebSocket';

// Mock the useTradeWebSocket hook
jest.mock('@/lib/useTradeWebSocket', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the WalletProvider hook
jest.mock('@/lib/WalletProvider', () => ({
  useWallet: () => ({
    publicKey: { toString: () => '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7Eo6mjrPBBJN' }
  })
}));

// Mock the EMBTokenManager
jest.mock('@/lib/embToken', () => ({
  __esModule: true,
  default: {
    validateTradeFees: jest.fn().mockResolvedValue({ canTrade: true, tradeFee: 0.1 })
  },
  validateTradeFees: jest.fn().mockResolvedValue({ canTrade: true, tradeFee: 0.1 })
}));

// Mock the GamificationSystem
jest.mock('../lib/gamification', () => ({
  GamificationSystem: jest.fn().mockImplementation(() => ({
    // Mock methods if needed
  }))
}));

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      signals: [{
        name: 'Test Signal',
        description: 'Test Description',
        trend: 'up',
        confidence: 0.8,
        price: 100,
        strategy: 'Test Strategy'
      }]
    })
  })
);

describe('TradingSimulator Component with Solana Fees', () => {
  // Default props for component
  const defaultProps = {
    mockMode: true,
    embBalance: 10,
    selectedCoin: 'SOL',
    onSuccessfulTrade: jest.fn()
  };

  beforeEach(() => {
    // Setup default mock for useTradeWebSocket hook
    useTradeWebSocket.mockImplementation(() => ({
      isConnected: true,
      connectionError: null,
      latestSignal: null,
      autoAccept: false,
      toggleAutoAccept: jest.fn(),
      tradePrompt: null,
      solanaFee: 0.000005
    }));

    // Mock the getSolanaFee function
    jest.spyOn(NetworksModule, 'getSolanaFee').mockResolvedValue(0.000005);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders TradingSimulator with Solana fee information', async () => {
    render(<TradingSimulator {...defaultProps} />);

    // Verify Solana fee is displayed
    await waitFor(() => {
      expect(screen.getByText(/Network Fee/i)).toBeInTheDocument();
      expect(screen.getByText(/0.000005/i)).toBeInTheDocument();
    });
  });

  test('applies Solana fee when executing a trade', async () => {
    const onSuccessfulTrade = jest.fn();

    render(
      <TradingSimulator
        {...defaultProps}
        onSuccessfulTrade={onSuccessfulTrade}
      />
    );

    // Enter trade amount
    fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
      target: { value: '10' }
    });

    // Click buy button
    await act(async () => {
      fireEvent.click(screen.getByText('Buy'));
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async operations
    });

    // Check that onSuccessfulTrade was called with correct params including Solana fee
    await waitFor(() => {
      expect(onSuccessfulTrade).toHaveBeenCalled();
      const tradeResult = onSuccessfulTrade.mock.calls[0][0];
      expect(tradeResult).toHaveProperty('solanaFee', 0.000005);
      expect(tradeResult).toHaveProperty('tradingCoin', 'SOL');
    });

    // Verify notification with fee is displayed
    await waitFor(() => {
      expect(screen.getByText(/Trade Executed/i)).toBeInTheDocument();
      expect(screen.getByText(/Solana Fee:/i)).toBeInTheDocument();
    });
  });

  test('updates Solana fee from useTradeWebSocket hook', async () => {
    // Mock with a different fee value
    useTradeWebSocket.mockImplementation(() => ({
      isConnected: true,
      connectionError: null,
      latestSignal: null,
      autoAccept: false,
      toggleAutoAccept: jest.fn(),
      tradePrompt: null,
      solanaFee: 0.000010 // Different fee value
    }));

    render(<TradingSimulator {...defaultProps} />);

    // Verify the updated fee is displayed
    await waitFor(() => {
      expect(screen.getByText(/SOL Fee: 0.000010/i)).toBeInTheDocument();
    });
  });

  test('handles API failure gracefully by using default fee', async () => {
    // Mock API failure
    jest.spyOn(NetworksModule, 'getSolanaFee').mockRejectedValue(new Error('API Error'));

    render(<TradingSimulator {...defaultProps} />);

    // Should still render with default fee
    await waitFor(() => {
      expect(screen.getByText(/SOL Fee: 0.000005/i)).toBeInTheDocument();
    });

    // Should still allow trading
    fireEvent.change(screen.getByPlaceholderText(/Enter amount/i), {
      target: { value: '5' }
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Buy'));
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Trade should still succeed with default fee
    await waitFor(() => {
      expect(defaultProps.onSuccessfulTrade).toHaveBeenCalled();
    });
  });
});