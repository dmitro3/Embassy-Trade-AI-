import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import CoinSelector from '@/components/CoinSelector';
import SwapToEMB from '@/components/SwapToEMB';
import { WalletProvider } from '@/lib/WalletProvider';

// Mock the gamification module
jest.mock('@/lib/gamification', () => ({
  __esModule: true,
  addXpPoints: jest.fn().mockResolvedValue({ success: true, level: 2 }),
  showNotification: jest.fn(),
  getCurrentXP: jest.fn().mockReturnValue(100),
  getLevel: jest.fn().mockReturnValue(2),
}));

// Mock the embToken module
jest.mock('@/lib/embToken', () => ({
  __esModule: true,
  default: {
    getBalance: jest.fn().mockResolvedValue(50),
    validateTradeFees: jest.fn().mockResolvedValue({
      canTrade: true,
      tradeFee: 0.1,
    }),
  },
  EMBTokenManager: jest.fn(),
  EMB_TOKEN_ADDRESS: 'D8U9GxmBGs98geNjWkrYf4GUjHqDvMgG5XdL41TXpump',
}));

// Mock the wallet provider
jest.mock('@/lib/WalletProvider', () => ({
  __esModule: true,
  useWallet: jest.fn().mockReturnValue({
    publicKey: { toString: () => '9ZNTfG4NyQgxy2SWjSiQoUyBPEvXT2xo7Eo6mjrPBBJN' },
    connected: true,
  }),
  WalletProvider: ({ children }) => <>{children}</>,
}));

// Import mocked modules so we can spy on their implementations
import { addXpPoints, showNotification } from '@/lib/gamification';

describe('Swap Flow Integration', () => {
  const mockBalances = {
    SOL: 10,
    USDC: 100,
    JITO: 5,
    EMB: 50
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('swapping SOL to EMB awards +15 XP', async () => {
    const handleSwap = jest.fn().mockImplementation(() => {
      // Simulate successful swap by updating balances
      return Promise.resolve(true);
    });

    render(
      <WalletProvider>
        <div>
          <CoinSelector 
            selectedCoin="SOL" 
            onCoinChange={() => {}}
          />
          <SwapToEMB 
            selectedCoin="SOL"
            balances={mockBalances}
            onSwap={handleSwap}
          />
        </div>
      </WalletProvider>
    );

    // Enter swap amount
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '5' } });

    // Click swap button
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapButton);

    // Wait for the swap to complete
    await waitFor(() => {
      expect(handleSwap).toHaveBeenCalledWith('SOL', 'EMB', 5);
    });

    // Verify XP was awarded
    expect(addXpPoints).toHaveBeenCalledWith(15, 'Swapping to $EMB');
    expect(showNotification).toHaveBeenCalledWith(
      '+15 XP for Swapping to $EMB', 
      'success'
    );
  });

  test('failed swap does not award XP', async () => {
    // Mock a failed swap
    const handleSwap = jest.fn().mockImplementation(() => {
      return Promise.reject(new Error('Swap failed'));
    });
    
    render(
      <WalletProvider>
        <div>
          <CoinSelector 
            selectedCoin="SOL" 
            onCoinChange={() => {}}
          />
          <SwapToEMB 
            selectedCoin="SOL"
            balances={mockBalances}
            onSwap={handleSwap}
          />
        </div>
      </WalletProvider>
    );
    
    // Enter swap amount
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '5' } });
    
    // Click swap button
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    
    // Use try-catch to handle the expected rejection
    try {
      await act(async () => {
        fireEvent.click(swapButton);
      });
    } catch (e) {
      // Expected error
    }
    
    // Verify swap was attempted
    expect(handleSwap).toHaveBeenCalledWith('SOL', 'EMB', 5);
    
    // Verify no XP was awarded
    expect(addXpPoints).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalledWith(
      '+15 XP for Swapping to $EMB', 
      'success'
    );
    
    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/Swap failed/i)).toBeInTheDocument();
    });
  });

  test('swapping different coins with different balances works correctly', async () => {
    const handleSwap = jest.fn().mockResolvedValue(true);
    const { rerender } = render(
      <WalletProvider>
        <div>
          <SwapToEMB 
            selectedCoin="SOL"
            balances={mockBalances}
            onSwap={handleSwap}
          />
        </div>
      </WalletProvider>
    );

    // Enter SOL swap amount
    const solAmountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    expect(screen.getByText(/Available: 10 SOL/i)).toBeInTheDocument();
    fireEvent.change(solAmountInput, { target: { value: '5' } });
    
    // Click swap button
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapButton);
    
    // Wait for SOL swap to complete
    await waitFor(() => {
      expect(handleSwap).toHaveBeenCalledWith('SOL', 'EMB', 5);
    });
    
    // Rerender with USDC selected
    rerender(
      <WalletProvider>
        <div>
          <SwapToEMB 
            selectedCoin="USDC"
            balances={mockBalances}
            onSwap={handleSwap}
          />
        </div>
      </WalletProvider>
    );
    
    // Enter USDC swap amount
    const usdcAmountInput = screen.getByLabelText(/Amount \(USDC\)/i);
    expect(screen.getByText(/Available: 100 USDC/i)).toBeInTheDocument();
    fireEvent.change(usdcAmountInput, { target: { value: '50' } });
    
    // Click swap button again
    const swapUSDCButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapUSDCButton);
    
    // Wait for USDC swap to complete
    await waitFor(() => {
      expect(handleSwap).toHaveBeenCalledWith('USDC', 'EMB', 50);
    });
    
    // Verify XP was awarded twice (once for each successful swap)
    expect(addXpPoints).toHaveBeenCalledTimes(2);
  });
});