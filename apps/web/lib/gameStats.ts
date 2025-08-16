// Game statistics tracking
interface GameRecord {
  userAddress: string;
  gameType: string;
  betAmount: number;
  winAmount: number;
  isWin: boolean;
  multiplier: number;
  timestamp: number;
}

// In-memory storage for user game history (production would use database)
let gameHistory: GameRecord[] = [];

// Function to add a game record
export function addGameRecord(userAddress: string, gameType: string, betAmount: number, winAmount: number, isWin: boolean, multiplier: number) {
  gameHistory.push({
    userAddress,
    gameType,
    betAmount,
    winAmount,
    isWin,
    multiplier,
    timestamp: Date.now()
  });
  
  // Keep only last 1000 records to prevent memory issues
  if (gameHistory.length > 1000) {
    gameHistory = gameHistory.slice(-1000);
  }
  
  console.log(`📊 Game recorded: ${userAddress} played ${gameType}, bet ${betAmount} MON, ${isWin ? 'won' : 'lost'} ${winAmount} MON`);
}

// Function to get game history for a user
export function getUserGameHistory(userAddress: string): GameRecord[] {
  return gameHistory.filter(game => game.userAddress.toLowerCase() === userAddress.toLowerCase());
}

// Function to get all game history (for admin purposes)
export function getAllGameHistory(): GameRecord[] {
  return [...gameHistory];
}