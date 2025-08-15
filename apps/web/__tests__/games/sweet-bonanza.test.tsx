import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SweetBonanzaGame } from '@/components/games/sweet-bonanza';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('@/lib/useGameContract');
jest.mock('react-hot-toast');

const mockUseGameContract = useGameContract as jest.MockedFunction<typeof useGameContract>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('SweetBonanzaGame', () => {
  const mockGameContract = {
    address: '0x123',
    balance: 10.5,
    isConnected: true,
    placeBet: jest.fn(),
    payoutWin: jest.fn(),
    gameState: { isPlaying: false },
    isTransacting: false,
    finalizeRound: jest.fn(),
  };

  beforeEach(() => {
    mockUseGameContract.mockReturnValue(mockGameContract);
    mockToast.error = jest.fn();
    mockToast.success = jest.fn();
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SweetBonanzaGame />);
    expect(screen.getByText('🍭 Sweet Bonanza')).toBeInTheDocument();
    expect(screen.getByText('Tumbling reels with cascade multipliers!')).toBeInTheDocument();
  });

  it('displays game stats correctly', () => {
    render(<SweetBonanzaGame />);
    expect(screen.getByText('10.5000 MON')).toBeInTheDocument();
    expect(screen.getByText('1.00 MON')).toBeInTheDocument();
  });

  it('handles bet amount changes', () => {
    render(<SweetBonanzaGame />);
    const betInput = screen.getByRole('spinbutton');
    
    fireEvent.change(betInput, { target: { value: '2.5' } });
    expect(betInput).toHaveValue(2.5);
  });

  it('validates bet amounts', async () => {
    render(<SweetBonanzaGame />);
    const betInput = screen.getByRole('spinbutton');
    const spinButton = screen.getByText(/SPIN SWEET BONANZA/);

    // Test minimum bet validation
    fireEvent.change(betInput, { target: { value: '0.05' } });
    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bet amount must be between 0.1 and 5 MON');
    });

    // Test maximum bet validation
    fireEvent.change(betInput, { target: { value: '10' } });
    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bet amount must be between 0.1 and 5 MON');
    });
  });

  it('handles insufficient balance', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      balance: 0.5,
    });

    render(<SweetBonanzaGame />);
    const betInput = screen.getByRole('spinbutton');
    const spinButton = screen.getByText(/SPIN SWEET BONANZA/);

    fireEvent.change(betInput, { target: { value: '1' } });
    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Insufficient balance');
    });
  });

  it('handles wallet not connected', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isConnected: false,
      address: null,
    });

    render(<SweetBonanzaGame />);
    const spinButton = screen.getByText(/SPIN SWEET BONANZA/);

    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please connect your wallet first');
    });
  });

  it('places bet when spinning', async () => {
    render(<SweetBonanzaGame />);
    const spinButton = screen.getByText(/SPIN SWEET BONANZA/);

    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'sweet-bonanza');
    });
  });

  it('disables spin button when transacting', () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isTransacting: true,
    });

    render(<SweetBonanzaGame />);
    const spinButton = screen.getByText(/SPIN SWEET BONANZA/);
    
    expect(spinButton).toBeDisabled();
  });

  it('initializes game board correctly', () => {
    render(<SweetBonanzaGame />);
    // Check that the 6x5 grid is rendered
    const cells = screen.getAllByText('', { selector: 'div[class*="w-12 h-12"]' });
    expect(cells).toHaveLength(30); // 6x5 = 30 cells
  });

  it('handles bet preset buttons', () => {
    render(<SweetBonanzaGame />);
    const betInput = screen.getByRole('spinbutton');
    
    // Test Min button
    const minButton = screen.getByText('Min');
    fireEvent.click(minButton);
    expect(betInput).toHaveValue(0.1);

    // Test 1 MON button
    const oneButton = screen.getByText('1 MON');
    fireEvent.click(oneButton);
    expect(betInput).toHaveValue(1);

    // Test Max button
    const maxButton = screen.getByText('Max');
    fireEvent.click(maxButton);
    expect(betInput).toHaveValue(5);
  });

  it('handles 2x bet multiplier button', () => {
    render(<SweetBonanzaGame />);
    const betInput = screen.getByRole('spinbutton');
    const doubleButton = screen.getByText('2x');
    
    fireEvent.change(betInput, { target: { value: '1' } });
    fireEvent.click(doubleButton);
    expect(betInput).toHaveValue(2);

    // Test that it caps at max
    fireEvent.change(betInput, { target: { value: '3' } });
    fireEvent.click(doubleButton);
    expect(betInput).toHaveValue(5); // Capped at max
  });

  it('displays game rules', () => {
    render(<SweetBonanzaGame />);
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Need 8\+ matching symbols anywhere on the board to win/)).toBeInTheDocument();
    expect(screen.getByText(/RTP: 94% \| House Edge: 6%/)).toBeInTheDocument();
  });

  it('shows symbol values in paytable', () => {
    render(<SweetBonanzaGame />);
    expect(screen.getByText('Symbol Values (8+ symbols)')).toBeInTheDocument();
    // Check that symbols are displayed
    expect(screen.getByText('50x')).toBeInTheDocument(); // 🍭 value
  });
});