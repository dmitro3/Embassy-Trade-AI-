import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import CoinSelector from '../../components/CoinSelector';
import TradingSimulator from '../../components/TradingSimulator';
import { WalletProvider } from '@/lib/WalletProvider';

// Mock dependencies
jest.mock('@/lib/useTradeWebSocket', () => ({
  __esModule: true,
  default: () => ({
    isConnected: true,
    latestSignal: {
      name: 'MACD Signal',
      description: 'Moving Average Convergence Divergence',
      trend: 'up',
      confidence: 85,
      price: 100,
      strategy: 'Technical Analysis'
    }
  })
}));

jest.mock('@/lib/embToken', () => ({
  validateTradeFees: jest.fn().mockResolvedValue({
    canTrade: true,
    tradeFee: 0.1
  })
}));

jest.mock('@/lib/WalletProvider', () => {
  const originalModule = jest.requireActual('@/lib/WalletProvider');
  return {
    ...originalModule,
    useWallet: jest.fn().mockReturnValue({
      publicKey: { toString: () => '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7Eo6mjrPBBJN' },
      connected: true
    }),
    WalletProvider: ({ children }) => <>{children}</>
  };
});

// Mock fetch
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      signals: [{
        price: 100,
        strategy: 'Technical Analysis',
        confidence: 0.85
      }]
    })
  })
);

describe('Trading Flow Integration', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('trading flow with different coins', async () => {
    const onCoinChange = jest.fn();
    const onSuccessfulTrade = jest.fn();
    
    // Render the container component with both components
    render(
      <WalletProvider>
        <div>
          <CoinSelector 
            selectedCoin="SOL" 
            onCoinChange={onCoinChange} 
          />
          <TradingSimulator 
            mockMode={true}
            onSuccessfulTrade={onSuccessfulTrade}
            embBalance={10}
          />
        </div>
      </WalletProvider>
    );
    
    // Verify CoinSelector rendered
    expect(screen.getByText('Select Trading Coin')).toBeInTheDocument();
    
    // Verify TradingSimulator rendered
    expect(screen.getByText('Trading Simulator')).toBeInTheDocument();
    expect(screen.getByText('EMB Balance')).toBeInTheDocument();
    expect(screen.getByText('10.00 EMB')).toBeInTheDocument();
    
    // Change the selected coin
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'EMB' } });
    
    // Verify the coin change handler was called
    expect(onCoinChange).toHaveBeenCalledWith('EMB');
    
    // Enter trade amount
    const amountInput = screen.getByPlaceholderText('Enter amount');
    fireEvent.change(amountInput, { target: { value: '5' } });
    
    // Execute a trade
    const buyButton = screen.getByText('Buy');
    
    await act(async () => {
      fireEvent.click(buyButton);
    });
    
    // Wait for trade to complete
    await waitFor(() => {
      expect(onSuccessfulTrade).toHaveBeenCalled();
    });
    
    // Verify the fetch call was made
    expect(global.fetch).toHaveBeenCalledWith('/api/trade-signals');
    
    // Verify trade fee is displayed
    expect(screen.getByText('Trade Fee: 0.1 EMB')).toBeInTheDocument();
  });
  
  test('trading is disabled with insufficient EMB balance', async () => {
    // Render with insufficient balance
    render(
      <WalletProvider>
        <div>
          <CoinSelector selectedCoin="SOL" onCoinChange={() => {}} />
          <TradingSimulator mockMode={true} embBalance={0.05} />
        </div>
      </WalletProvider>
    );
    
    // Verify the warning about insufficient EMB balance
    expect(screen.getByText(/Insufficient EMB balance/)).toBeInTheDocument();
    
    // Verify the Buy button is disabled
    const buyButton = screen.getByText('Buy');
    expect(buyButton).toBeDisabled();
  });
});