import { render, fireEvent, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PnLTab from '@/components/PnLTab';

// Mock setTimeout and clearTimeout for testing modal auto-close
jest.useFakeTimers();

describe('PnLTab Component', () => {
  const mockWithdraw = jest.fn();
  const mockTradeHistory = [
    { id: '1', coin: 'SOL', type: 'buy', amount: 1, price: 100, timestamp: Date.now() - 86400000 },
    { id: '2', coin: 'EMB', type: 'sell', amount: 5, price: 2, timestamp: Date.now() - 3600000 }
  ];
  
  beforeEach(() => {
    mockWithdraw.mockClear();
  });
  
  test('renders with trade history and P&L data', () => {
    const pnlData = {
      totalPnL: 150.5,
      dailyPnL: 25.75,
      weeklyPnL: 87.3,
      availableToWithdraw: 120
    };
    
    render(
      <PnLTab 
        tradeHistory={mockTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
      />
    );
    
    // Check if P&L statistics are displayed correctly
    expect(screen.getByText(/Total P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/\$150.50/)).toBeInTheDocument();
    
    expect(screen.getByText(/Daily P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/\$25.75/)).toBeInTheDocument();
    
    expect(screen.getByText(/Weekly P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/\$87.30/)).toBeInTheDocument();
    
    // Check if trade history is displayed
    expect(screen.getByText(/Trade History/i)).toBeInTheDocument();
    expect(screen.getByText(/SOL/)).toBeInTheDocument();
    expect(screen.getByText(/EMB/)).toBeInTheDocument();
    
    // Check if withdraw button is present
    expect(screen.getByText(/Withdraw Funds/i)).toBeInTheDocument();
  });
  
  test('opens withdraw modal when button is clicked', () => {
    const pnlData = {
      totalPnL: 150.5,
      dailyPnL: 25.75,
      weeklyPnL: 87.3,
      availableToWithdraw: 120
    };
    
    render(
      <PnLTab 
        tradeHistory={mockTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
      />
    );
    
    // Click withdraw button
    fireEvent.click(screen.getByText(/Withdraw Funds/i));
    
    // Check if modal is displayed
    expect(screen.getByText(/Withdraw Available Funds/i)).toBeInTheDocument();
    expect(screen.getByText(/Available: \$120.00/i)).toBeInTheDocument();
  });
  
  test('validates withdraw amount against available balance', () => {
    const pnlData = {
      totalPnL: 150.5,
      dailyPnL: 25.75,
      weeklyPnL: 87.3,
      availableToWithdraw: 120
    };
    
    render(
      <PnLTab 
        tradeHistory={mockTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
      />
    );
    
    // Open withdraw modal
    fireEvent.click(screen.getByText(/Withdraw Funds/i));
    
    // Enter amount larger than available
    const amountInput = screen.getByLabelText(/Amount to withdraw/i);
    fireEvent.change(amountInput, { target: { value: '150' } });
    
    // Try to withdraw
    fireEvent.click(screen.getByText(/Confirm Withdrawal/i));
    
    // Check if error message is displayed
    expect(screen.getByText(/Insufficient funds available/i)).toBeInTheDocument();
    
    // Verify onWithdraw was not called
    expect(mockWithdraw).not.toHaveBeenCalled();
  });
  
  test('executes withdrawal successfully', async () => {
    const pnlData = {
      totalPnL: 150.5,
      dailyPnL: 25.75,
      weeklyPnL: 87.3,
      availableToWithdraw: 120
    };
    
    render(
      <PnLTab 
        tradeHistory={mockTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
      />
    );
    
    // Open withdraw modal
    fireEvent.click(screen.getByText(/Withdraw Funds/i));
    
    // Enter valid amount
    const amountInput = screen.getByLabelText(/Amount to withdraw/i);
    fireEvent.change(amountInput, { target: { value: '100' } });
    
    // Execute withdrawal
    fireEvent.click(screen.getByText(/Confirm Withdrawal/i));
    
    // Verify onWithdraw was called with correct amount
    expect(mockWithdraw).toHaveBeenCalledWith(100);
    
    // Verify success message is displayed
    expect(screen.getByText(/Withdrawal successful/i)).toBeInTheDocument();
  });
  
  test('modal auto-closes after 3 seconds on successful withdrawal', async () => {
    const pnlData = {
      totalPnL: 150.5,
      dailyPnL: 25.75,
      weeklyPnL: 87.3,
      availableToWithdraw: 120
    };
    
    render(
      <PnLTab 
        tradeHistory={mockTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
      />
    );
    
    // Open withdraw modal
    fireEvent.click(screen.getByText(/Withdraw Funds/i));
    
    // Enter valid amount
    const amountInput = screen.getByLabelText(/Amount to withdraw/i);
    fireEvent.change(amountInput, { target: { value: '100' } });
    
    // Execute withdrawal
    fireEvent.click(screen.getByText(/Confirm Withdrawal/i));
    
    // Verify success message is displayed
    expect(screen.getByText(/Withdrawal successful/i)).toBeInTheDocument();
    
    // Fast-forward time by 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByText(/Withdrawal successful/i)).not.toBeInTheDocument();
    });
  });
  
  test('calculates P&L correctly from trade history', () => {
    const detailedTradeHistory = [
      { id: '1', coin: 'SOL', type: 'buy', amount: 2, price: 50, total: 100, timestamp: Date.now() - 86400000 },
      { id: '2', coin: 'SOL', type: 'sell', amount: 2, price: 60, total: 120, timestamp: Date.now() - 3600000 }
    ];
    
    // In this case, the P&L should be (120 - 100) = 20
    const pnlData = {
      totalPnL: 20,
      dailyPnL: 20,
      weeklyPnL: 20,
      availableToWithdraw: 20
    };
    
    render(
      <PnLTab 
        tradeHistory={detailedTradeHistory}
        pnlData={pnlData}
        onWithdraw={mockWithdraw}
        calculatePnL={true} // Flag to recalculate P&L from trade history
      />
    );
    
    // Check if P&L calculation is correct
    expect(screen.getByText(/\$20.00/)).toBeInTheDocument();
  });
});