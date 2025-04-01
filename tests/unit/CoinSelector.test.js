import { render, screen, fireEvent } from '@testing-library/react';
import CoinSelector from '../../components/CoinSelector';

describe('CoinSelector Component', () => {
  const mockOnCoinChange = jest.fn();
  const defaultCoins = ['SOL', 'USDC', 'JITO', 'EMB'];

  beforeEach(() => {
    mockOnCoinChange.mockClear();
  });

  test('renders with default props', () => {
    render(<CoinSelector selectedCoin="SOL" onCoinChange={mockOnCoinChange} />);
    
    // Check if the component renders correctly
    expect(screen.getByLabelText('Select Trading Coin')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('SOL');
    
    // Check if all default coins are present
    defaultCoins.forEach(coin => {
      expect(screen.getByText(`$${coin}`)).toBeInTheDocument();
    });
  });

  test('calls onCoinChange when selection changes', () => {
    render(<CoinSelector selectedCoin="SOL" onCoinChange={mockOnCoinChange} />);
    
    const selectElement = screen.getByRole('combobox');
    fireEvent.change(selectElement, { target: { value: 'EMB' } });
    
    expect(mockOnCoinChange).toHaveBeenCalledWith('EMB');
  });

  test('shows reward info when non-EMB coin is selected', () => {
    render(<CoinSelector selectedCoin="SOL" onCoinChange={mockOnCoinChange} />);
    
    expect(screen.getByText(/Trading with \$EMB earns you additional rewards!/)).toBeInTheDocument();
  });

  test('hides reward info when EMB coin is selected', () => {
    render(<CoinSelector selectedCoin="EMB" onCoinChange={mockOnCoinChange} />);
    
    expect(screen.queryByText(/Trading with \$EMB earns you additional rewards!/)).not.toBeInTheDocument();
  });

  test('renders with custom coins array', () => {
    const customCoins = ['BTC', 'ETH', 'DOT'];
    render(<CoinSelector selectedCoin="BTC" onCoinChange={mockOnCoinChange} coins={customCoins} />);
    
    customCoins.forEach(coin => {
      expect(screen.getByText(`$${coin}`)).toBeInTheDocument();
    });
    
    // Default coins should not be present
    expect(screen.queryByText('$SOL')).not.toBeInTheDocument();
  });
});