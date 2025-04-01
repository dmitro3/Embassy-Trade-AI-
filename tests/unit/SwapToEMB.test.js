import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SwapToEMB from '@/components/SwapToEMB';

describe('SwapToEMB Component', () => {
  const mockOnSwap = jest.fn();
  
  beforeEach(() => {
    mockOnSwap.mockClear();
  });
  
  test('renders with default props', () => {
    const balances = { SOL: 50, EMB: 100 };
    render(
      <SwapToEMB 
        selectedCoin="SOL" 
        balances={balances} 
        onSwap={mockOnSwap} 
      />
    );
    
    // Check if component renders correctly
    expect(screen.getByText(/Swap to \$EMB/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount \(SOL\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Available: 50 SOL/i)).toBeInTheDocument();
  });
  
  test('validates insufficient balance', () => {
    const balances = { SOL: 50, EMB: 100 };
    render(
      <SwapToEMB 
        selectedCoin="SOL" 
        balances={balances} 
        onSwap={mockOnSwap} 
      />
    );
    
    // Enter amount larger than balance
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '60' } });
    
    // Try to swap
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapButton);
    
    // Check if error message is displayed
    expect(screen.getByText(/Insufficient SOL balance/i)).toBeInTheDocument();
    
    // Verify onSwap was not called
    expect(mockOnSwap).not.toHaveBeenCalled();
  });
  
  test('executes swap successfully', () => {
    const balances = { SOL: 50, EMB: 100 };
    render(
      <SwapToEMB 
        selectedCoin="SOL" 
        balances={balances} 
        onSwap={mockOnSwap} 
      />
    );
    
    // Enter valid amount
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '10' } });
    
    // Execute swap
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapButton);
    
    // Verify onSwap was called with correct parameters
    expect(mockOnSwap).toHaveBeenCalledWith('SOL', 'EMB', 10);
  });
  
  test('displays current swap rate information', () => {
    const balances = { SOL: 50, EMB: 100 };
    const swapRate = 2; // 1 SOL = 2 EMB
    
    render(
      <SwapToEMB 
        selectedCoin="SOL" 
        balances={balances} 
        onSwap={mockOnSwap}
        swapRate={swapRate}
      />
    );
    
    // Check if swap rate information is displayed
    expect(screen.getByText(/1 SOL = 2 EMB/i)).toBeInTheDocument();
    
    // Enter amount and check estimate
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '5' } });
    
    // Check if estimate is updated
    expect(screen.getByText(/You'll receive: 10 EMB/i)).toBeInTheDocument();
  });
  
  test('clears form after successful swap', async () => {
    const balances = { SOL: 50, EMB: 100 };
    
    render(
      <SwapToEMB 
        selectedCoin="SOL" 
        balances={balances} 
        onSwap={mockOnSwap}
      />
    );
    
    // Enter amount
    const amountInput = screen.getByLabelText(/Amount \(SOL\)/i);
    fireEvent.change(amountInput, { target: { value: '10' } });
    
    // Execute swap
    const swapButton = screen.getByText(/Swap to \$EMB/i);
    fireEvent.click(swapButton);
    
    // Verify input is cleared after swap
    expect(amountInput.value).toBe('');
  });
});