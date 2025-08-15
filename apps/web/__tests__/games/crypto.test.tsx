import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CryptoGame } from '@/components/games/crypto';
import { useGameContract } from '@/lib/useGameContract';
import { toast } from 'react-hot-toast';

jest.mock('@/lib/useGameContract');
jest.mock('react-hot-toast');

const mockUseGameContract = useGameContract as jest.MockedFunction<typeof useGameContract>;
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock setInterval and clearInterval
global.setInterval = jest.fn();
global.clearInterval = jest.fn();

describe('CryptoGame', () => {
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
    render(<CryptoGame />);
    expect(screen.getByText('₿ Crypto Trading')).toBeInTheDocument();
    expect(screen.getByText('Predict crypto price movements and win!')).toBeInTheDocument();
  });

  it('displays initial cryptocurrency pairs', () => {
    render(<CryptoGame />);
    expect(screen.getByText('₿ BTC/USD')).toBeInTheDocument();
    expect(screen.getByText('⟠ ETH/USD')).toBeInTheDocument();
    expect(screen.getByText('◈ MON/USD')).toBeInTheDocument();
    expect(screen.getByText('◉ BNB/USD')).toBeInTheDocument();
  });

  it('displays timeframe options', () => {
    render(<CryptoGame />);
    expect(screen.getByText('30S')).toBeInTheDocument();
    expect(screen.getByText('1M')).toBeInTheDocument();
    expect(screen.getByText('2M')).toBeInTheDocument();
    expect(screen.getByText('5M')).toBeInTheDocument();
  });

  it('shows trading pair prices', () => {
    render(<CryptoGame />);
    expect(screen.getByText('$45,000')).toBeInTheDocument(); // BTC price
    expect(screen.getByText('$2,800')).toBeInTheDocument(); // ETH price
  });

  it('handles pair selection', () => {
    render(<CryptoGame />);
    const ethPair = screen.getByText('⟠ ETH/USD');
    
    fireEvent.click(ethPair);
    // ETH pair should be selected (background change)
    expect(ethPair.closest('button')).toHaveClass('bg-blue-500/30');
  });

  it('handles timeframe selection', () => {
    render(<CryptoGame />);
    const oneMinute = screen.getByText('1M');
    
    fireEvent.click(oneMinute);
    expect(oneMinute).toHaveClass('bg-purple-500/30');
  });

  it('validates bet amounts', async () => {
    render(<CryptoGame />);
    const betInput = screen.getByRole('spinbutton');
    const upButton = screen.getByText(/PREDICT UP/);

    fireEvent.change(betInput, { target: { value: '0.05' } });
    fireEvent.click(upButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Bet amount must be between 0.1 and 5 MON');
    });
  });

  it('handles UP prediction', async () => {
    render(<CryptoGame />);
    const upButton = screen.getByText(/PREDICT UP/);

    fireEvent.click(upButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'crypto');
    });
  });

  it('handles DOWN prediction', async () => {
    render(<CryptoGame />);
    const downButton = screen.getByText(/PREDICT DOWN/);

    fireEvent.click(downButton);
    
    await waitFor(() => {
      expect(mockGameContract.placeBet).toHaveBeenCalledWith(1.0, 'crypto');
    });
  });

  it('displays trade analysis', () => {
    render(<CryptoGame />);
    expect(screen.getByText('Trade Analysis')).toBeInTheDocument();
    expect(screen.getByText('Potential Win:')).toBeInTheDocument();
    expect(screen.getByText('Win Probability:')).toBeInTheDocument();
    expect(screen.getByText('Volatility:')).toBeInTheDocument();
  });

  it('shows proper multipliers for timeframes', () => {
    render(<CryptoGame />);
    // Check that multipliers are displayed correctly
    expect(screen.getByText('1.8x')).toBeInTheDocument(); // 30s multiplier
  });

  it('handles wallet disconnection', async () => {
    mockUseGameContract.mockReturnValue({
      ...mockGameContract,
      isConnected: false,
      address: null,
    });

    render(<CryptoGame />);
    const upButton = screen.getByText(/PREDICT UP/);

    fireEvent.click(upButton);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Please connect your wallet first');
    });
  });

  it('displays game rules', () => {
    render(<CryptoGame />);
    expect(screen.getByText('How to Play')).toBeInTheDocument();
    expect(screen.getByText(/Choose a cryptocurrency pair and timeframe/)).toBeInTheDocument();
    expect(screen.getByText(/RTP: 90% \| House Edge: 10%/)).toBeInTheDocument();
  });

  it('calculates potential win correctly', () => {
    render(<CryptoGame />);
    const betInput = screen.getByRole('spinbutton');
    
    fireEvent.change(betInput, { target: { value: '2' } });
    // Should show 2 * 1.8 = 3.6000 MON for 30s timeframe
    expect(screen.getByText('3.6000 MON')).toBeInTheDocument();
  });
});