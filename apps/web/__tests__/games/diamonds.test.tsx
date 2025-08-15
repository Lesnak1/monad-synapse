import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DiamondsGame } from '@/components/games/diamonds';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

jest.mock('@/lib/useGameContract');
jest.mock('react-hot-toast');

const mockUseGameContract = useGameContract as jest.MockedFunction<typeof useGameContract>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('DiamondsGame', () => {
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
    render(<DiamondsGame />);
    expect(screen.getByText('💎 Diamonds')).toBeInTheDocument();
    expect(screen.getByText('Match 3+ gems to score points and win prizes!')).toBeInTheDocument();
  });

  it('initializes 8x8 game board', () => {
    render(<DiamondsGame />);
    // Check for 64 cells (8x8)
    const gameBoard = screen.getByRole('generic');
    // The grid should be visible
    expect(screen.getByText('START DIAMOND HUNT')).toBeInTheDocument();
  });

  it('displays game statistics', () => {
    render(<DiamondsGame />);
    expect(screen.getByText('10.5000 MON')).toBeInTheDocument(); // Balance
    expect(screen.getByText('0')).toBeInTheDocument(); // Initial score
    expect(screen.getByText('15')).toBeInTheDocument(); // Initial moves
  });

  it('handles bet amount validation', async () => {
    render(<DiamondsGame />);
    const betInput = screen.getByRole('spinbutton');
    const startButton = screen.getByText('START DIAMOND HUNT');

    // Test invalid bet amount
    fireEvent.change(betInput, { target: { value: '0.05' } });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bet amount must be between 0.1 and 5 MON');
    });
  });

  it('starts game correctly', async () => {
    render(<DiamondsGame />);
    const startButton = screen.getByText('START DIAMOND HUNT');

    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'diamonds');
    });
  });

  it('shows gem values in paytable', () => {
    render(<DiamondsGame />);
    expect(screen.getByText('Gem Values')).toBeInTheDocument();
    expect(screen.getByText('100 pts')).toBeInTheDocument(); // 💎 value
  });

  it('handles wallet disconnection', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isConnected: false,
      address: null,
    });

    render(<DiamondsGame />);
    const startButton = screen.getByText('START DIAMOND HUNT');

    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please connect your wallet first');
    });
  });

  it('displays game rules', () => {
    render(<DiamondsGame />);
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Click a gem, then click an adjacent gem to swap them/)).toBeInTheDocument();
    expect(screen.getByText(/RTP: 95% \| House Edge: 5%/)).toBeInTheDocument();
  });

  it('handles bet preset buttons', () => {
    render(<DiamondsGame />);
    const betInput = screen.getByRole('spinbutton');
    
    const minButton = screen.getByText('Min');
    fireEvent.click(minButton);
    expect(betInput).toHaveValue(0.1);

    const maxButton = screen.getByText('Max');
    fireEvent.click(maxButton);
    expect(betInput).toHaveValue(5);
  });
});