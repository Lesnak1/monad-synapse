'use client';

// Casino Analytics and Profitability Calculator

export interface GameAnalytics {
  name: string;
  houseEdge: number; // Percentage
  rtp: number; // Return to Player percentage
  averageSessionTime: number; // Minutes
  expectedHourlyRevenue: number; // MON per hour
  riskLevel: 'low' | 'medium' | 'high';
  popularityScore: number; // 1-10
}

export const GAME_ANALYTICS: Record<string, GameAnalytics> = {
  'coin-master': {
    name: 'Coin Master',
    houseEdge: 8.5,
    rtp: 91.5,
    averageSessionTime: 15,
    expectedHourlyRevenue: 2.8,
    riskLevel: 'medium',
    popularityScore: 8
  },
  'crash': {
    name: 'Crash',
    houseEdge: 5.0,
    rtp: 95.0,
    averageSessionTime: 25,
    expectedHourlyRevenue: 4.2,
    riskLevel: 'high',
    popularityScore: 9
  },
  'mines': {
    name: 'Mines',
    houseEdge: 6.5,
    rtp: 93.5,
    averageSessionTime: 20,
    expectedHourlyRevenue: 3.5,
    riskLevel: 'medium',
    popularityScore: 7
  },
  'plinko': {
    name: 'Plinko',
    houseEdge: 4.0,
    rtp: 96.0,
    averageSessionTime: 18,
    expectedHourlyRevenue: 3.1,
    riskLevel: 'medium',
    popularityScore: 8
  },
  'dice': {
    name: 'Dice',
    houseEdge: 5.0,
    rtp: 95.0,
    averageSessionTime: 12,
    expectedHourlyRevenue: 2.4,
    riskLevel: 'low',
    popularityScore: 6
  },
  'wheel': {
    name: 'Roulette Wheel',
    houseEdge: 2.7,
    rtp: 97.3,
    averageSessionTime: 30,
    expectedHourlyRevenue: 5.2,
    riskLevel: 'low',
    popularityScore: 9
  }
};

export class CasinoAnalytics {
  static calculateDailyRevenue(dailyPlayers: number, averageBetSize: number): number {
    let totalRevenue = 0;
    
    Object.values(GAME_ANALYTICS).forEach(game => {
      const playersPerGame = dailyPlayers * (game.popularityScore / 10) * 0.15; // 15% of players try each popular game
      const sessionsPerPlayer = 24 * 60 / game.averageSessionTime * 0.1; // Players play ~10% of the day
      const betsPerSession = game.averageSessionTime * 2; // 2 bets per minute average
      
      const totalBets = playersPerGame * sessionsPerPlayer * betsPerSession;
      const totalWagered = totalBets * averageBetSize;
      const gameRevenue = totalWagered * (game.houseEdge / 100);
      
      totalRevenue += gameRevenue;
    });
    
    return totalRevenue;
  }

  static calculateMonthlyRevenue(dailyPlayers: number, averageBetSize: number): number {
    return this.calculateDailyRevenue(dailyPlayers, averageBetSize) * 30;
  }

  static getGameProfitability(gameType: string): {
    hourlyProfit: number;
    dailyProfit: number;
    monthlyProfit: number;
    riskAssessment: string;
  } {
    const game = GAME_ANALYTICS[gameType];
    if (!game) {
      throw new Error('Unknown game type');
    }

    const hourlyProfit = game.expectedHourlyRevenue;
    const dailyProfit = hourlyProfit * 16; // Assuming 16 active hours
    const monthlyProfit = dailyProfit * 30;

    let riskAssessment = '';
    switch (game.riskLevel) {
      case 'low':
        riskAssessment = 'Düşük risk, istikrarlı gelir';
        break;
      case 'medium':
        riskAssessment = 'Orta risk, dengeli getiri';
        break;
      case 'high':
        riskAssessment = 'Yüksek risk, yüksek potansiyel getiri';
        break;
    }

    return {
      hourlyProfit,
      dailyProfit,
      monthlyProfit,
      riskAssessment
    };
  }

  static generateProfitabilityReport(): {
    totalHourlyRevenue: number;
    totalDailyRevenue: number;
    totalMonthlyRevenue: number;
    gameBreakdown: Array<{
      game: string;
      contribution: number;
      percentage: number;
    }>;
    recommendations: string[];
  } {
    const gameBreakdown = Object.entries(GAME_ANALYTICS).map(([key, game]) => {
      const profit = this.getGameProfitability(key);
      return {
        game: game.name,
        contribution: profit.hourlyProfit,
        percentage: 0 // Will be calculated below
      };
    });

    const totalHourlyRevenue = gameBreakdown.reduce((sum, game) => sum + game.contribution, 0);
    const totalDailyRevenue = totalHourlyRevenue * 16;
    const totalMonthlyRevenue = totalDailyRevenue * 30;

    // Calculate percentages
    gameBreakdown.forEach(game => {
      game.percentage = (game.contribution / totalHourlyRevenue) * 100;
    });

    const recommendations = [
      'Roulette Wheel en yüksek saatlik geliri sağlıyor - promosyonlara odaklanın',
      'Crash oyunu yüksek popülerlik skoru ile öne çıkıyor',
      'Coin Master house edge\'i yüksek - daha çok reklam yapılabilir',
      'Dice oyunu düşük risk seviyesi ile güvenilir gelir kaynağı',
      'Mines ve Plinko dengeli risk-getiri oranı sunuyor'
    ];

    return {
      totalHourlyRevenue,
      totalDailyRevenue,
      totalMonthlyRevenue,
      gameBreakdown,
      recommendations
    };
  }

  static calculatePlayerLossRate(gameType: string, betAmount: number): number {
    const game = GAME_ANALYTICS[gameType];
    if (!game) return 0;

    return betAmount * (game.houseEdge / 100);
  }

  static predictUserBehavior(gameType: string): {
    expectedSessionLength: number;
    churnRate: number;
    retentionProbability: number;
  } {
    const game = GAME_ANALYTICS[gameType];
    
    // Higher RTP games have better retention
    const retentionProbability = game.rtp / 100 * 0.8;
    
    // Churn rate inversely related to RTP and popularity
    const churnRate = (100 - game.rtp) / 100 * 0.6;

    return {
      expectedSessionLength: game.averageSessionTime,
      churnRate,
      retentionProbability
    };
  }

  static getOptimalPricingStrategy(gameType: string): {
    minBet: number;
    maxBet: number;
    recommendedBet: number;
    reasoning: string;
  } {
    const game = GAME_ANALYTICS[gameType];
    
    let reasoning = '';
    let recommendedBet = 1.0;

    switch (game.riskLevel) {
      case 'low':
        recommendedBet = 0.5;
        reasoning = 'Düşük risk oyunları için konservatif bahis limitleri önerilir';
        break;
      case 'medium':
        recommendedBet = 1.0;
        reasoning = 'Dengeli risk oyunları için orta seviye bahis limitleri uygundur';
        break;
      case 'high':
        recommendedBet = 2.0;
        reasoning = 'Yüksek risk oyunları daha büyük bahislere teşvik edebilir';
        break;
    }

    return {
      minBet: 0.1,
      maxBet: 5.0,
      recommendedBet,
      reasoning
    };
  }
}

export const generateFullAnalyticsReport = () => {
  const profitReport = CasinoAnalytics.generateProfitabilityReport();
  
  const detailedGameAnalysis = Object.entries(GAME_ANALYTICS).map(([key, game]) => ({
    gameKey: key,
    ...game,
    profitability: CasinoAnalytics.getGameProfitability(key),
    userBehavior: CasinoAnalytics.predictUserBehavior(key),
    pricing: CasinoAnalytics.getOptimalPricingStrategy(key)
  }));

  return {
    summary: {
      totalGames: Object.keys(GAME_ANALYTICS).length,
      averageHouseEdge: Object.values(GAME_ANALYTICS).reduce((sum, game) => sum + game.houseEdge, 0) / Object.keys(GAME_ANALYTICS).length,
      averageRTP: Object.values(GAME_ANALYTICS).reduce((sum, game) => sum + game.rtp, 0) / Object.keys(GAME_ANALYTICS).length,
      ...profitReport
    },
    gameAnalysis: detailedGameAnalysis,
    businessInsights: {
      mostProfitable: detailedGameAnalysis.reduce((a, b) => 
        a.profitability.hourlyProfit > b.profitability.hourlyProfit ? a : b
      ),
      mostPopular: detailedGameAnalysis.reduce((a, b) => 
        a.popularityScore > b.popularityScore ? a : b
      ),
      lowestRisk: detailedGameAnalysis.filter(game => game.riskLevel === 'low'),
      highestRTP: detailedGameAnalysis.reduce((a, b) => 
        a.rtp > b.rtp ? a : b
      )
    }
  };
};