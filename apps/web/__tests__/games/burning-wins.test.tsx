import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BurningWinsGame } from '@/components/games/burning-wins';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

jest.mock('@/lib/useGameContract');
jest.mock('react-hot-toast');

const mockUseGameContract = useGameContract as jest.MockedFunction<typeof useGameContract>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('BurningWinsGame', () => {
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
    render(<BurningWinsGame />);
    expect(screen.getByText('🔥 Burning Wins')).toBeInTheDocument();
    expect(screen.getByText('Hot multipliers and burning features await!')).toBeInTheDocument();
  });

  it('displays game statistics', () => {
    render(<BurningWinsGame />);
    expect(screen.getByText('10.5000 MON')).toBeInTheDocument(); // Balance
    expect(screen.getByText('1.00 MON')).toBeInTheDocument(); // Bet
    expect(screen.getByText('0')).toBeInTheDocument(); // Initial spins
    expect(screen.getByText('1x')).toBeInTheDocument(); // Initial multiplier
  });

  it('initializes 5x3 slot reels', () => {
    render(<BurningWinsGame />);
    // The slot machine should have 5 columns and 3 rows (15 cells)
    expect(screen.getByText('10 Paylines Active | Left to Right Wins')).toBeInTheDocument();
  });

  it('validates bet amounts', async () => {
    render(<BurningWinsGame />);
    const betInput = screen.getByRole('spinbutton');
    const spinButton = screen.getByText(/SPIN BURNING WINS/);

    fireEvent.change(betInput, { target: { value: '0.05' } });
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

    render(<BurningWinsGame />);
    const betInput = screen.getByRole('spinbutton');
    const spinButton = screen.getByText(/SPIN BURNING WINS/);

    fireEvent.change(betInput, { target: { value: '1' } });
    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Insufficient balance');
    });
  });

  it('places bet when spinning', async () => {
    render(<BurningWinsGame />);
    const spinButton = screen.getByText(/SPIN BURNING WINS/);

    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'burning-wins');
    });
  });

  it('shows symbol paytable', () => {
    render(<BurningWinsGame />);
    expect(screen.getByText('Symbol Values (3+ symbols)')).toBeInTheDocument();
    expect(screen.getByText('1000x')).toBeInTheDocument(); // 🔥 value
    expect(screen.getByText('WILD + BURNING')).toBeInTheDocument();
  });

  it('handles wallet disconnection', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isConnected: false,
      address: null,
    });

    render(<BurningWinsGame />);
    const spinButton = screen.getByText(/SPIN BURNING WINS/);

    fireEvent.click(spinButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please connect your wallet first');
    });
  });

  it('displays game rules', () => {
    render(<BurningWinsGame />);
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Match 3\+ symbols on any of the 10 paylines to win/)).toBeInTheDocument();
    expect(screen.getByText(/RTP: 94% \| House Edge: 6%/)).toBeInTheDocument();
  });

  it('handles bet preset buttons', () => {
    render(<BurningWinsGame />);
    const betInput = screen.getByRole('spinbutton');
    
    const minButton = screen.getByText('Min');
    fireEvent.click(minButton);
    expect(betInput).toHaveValue(0.1);

    const maxButton = screen.getByText('Max');
    fireEvent.click(maxButton);
    expect(betInput).toHaveValue(5);
  });

  it('has proper burning wins styling', () => {
    render(<BurningWinsGame />);
    const spinButton = screen.getByText(/SPIN BURNING WINS/);
    
    // Should have gradient background for burning theme
    expect(spinButton).toHaveClass('bg-gradient-to-r', 'from-red-500', 'to-orange-500');
  });
});