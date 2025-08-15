import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SlideGame } from '@/components/games/slide';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

jest.mock('@/lib/useGameContract');
jest.mock('react-hot-toast');

const mockUseGameContract = useGameContract as jest.MockedFunction<typeof useGameContract>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});
global.cancelAnimationFrame = jest.fn();

describe('SlideGame', () => {
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
    render(<SlideGame />);
    expect(screen.getByText('🎯 Slide')).toBeInTheDocument();
    expect(screen.getByText('Perfect timing precision game with multiplying rewards!')).toBeInTheDocument();
  });

  it('displays game statistics', () => {
    render(<SlideGame />);
    expect(screen.getByText('10.5000 MON')).toBeInTheDocument(); // Balance
    expect(screen.getByText('1/10')).toBeInTheDocument(); // Level
    expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Speed
  });

  it('handles speed selection', () => {
    render(<SlideGame />);
    
    const slowButton = screen.getByText('SLOW');
    const fastButton = screen.getByText('FAST');
    
    fireEvent.click(slowButton);
    expect(slowButton).toHaveClass('bg-purple-500');
    
    fireEvent.click(fastButton);
    expect(fastButton).toHaveClass('bg-purple-500');
  });

  it('validates bet amounts', async () => {
    render(<SlideGame />);
    const betInput = screen.getByRole('spinbutton');
    const startButton = screen.getByText(/START SLIDE GAME/);

    fireEvent.change(betInput, { target: { value: '0.05' } });
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bet amount must be between 0.1 and 5 MON');
    });
  });

  it('shows level multipliers preview', () => {
    render(<SlideGame />);
    expect(screen.getByText('Level Multipliers (medium speed)')).toBeInTheDocument();
    expect(screen.getByText('Level 1:')).toBeInTheDocument();
    expect(screen.getByText('+ 5 more levels...')).toBeInTheDocument();
  });

  it('handles wallet disconnection', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isConnected: false,
      address: null,
    });

    render(<SlideGame />);
    const startButton = screen.getByText(/START SLIDE GAME/);

    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please connect your wallet first');
    });
  });

  it('starts game with instructions phase', async () => {
    render(<SlideGame />);
    const startButton = screen.getByText(/START SLIDE GAME/);

    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'slide');
    });
  });

  it('displays game rules', () => {
    render(<SlideGame />);
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Watch the slider move and click STOP when it's in the target zone/)).toBeInTheDocument();
    expect(screen.getByText(/RTP: 96% \| House Edge: 4%/)).toBeInTheDocument();
  });

  it('handles bet amount changes with 2x button', () => {
    render(<SlideGame />);
    const betInput = screen.getByRole('spinbutton');
    const doubleButton = screen.getByText('2x');
    
    fireEvent.change(betInput, { target: { value: '2' } });
    fireEvent.click(doubleButton);
    expect(betInput).toHaveValue(4);
  });

  it('shows trade analysis section', () => {
    render(<SlideGame />);
    expect(screen.getByText('Trade Analysis')).toBeInTheDocument();
    expect(screen.getByText('Potential Win:')).toBeInTheDocument();
    expect(screen.getByText('Win Probability:')).toBeInTheDocument();
  });
});