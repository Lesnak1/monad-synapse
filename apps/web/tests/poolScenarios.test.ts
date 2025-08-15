/**
 * Comprehensive test scenarios for pool balance management
 * Tests critical business logic for insufficient pool funds
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPoolBalance, sendFromPool } from '../lib/poolWallet';
import { PoolMonitor } from '../lib/poolMonitoring';
import { adminNotifications } from '../lib/adminNotifications';

// Mock functions
vi.mock('../lib/poolWallet', () => ({
  getPoolBalance: vi.fn(),
  sendFromPool: vi.fn(),
  POOL_WALLET_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Pool Balance Management - Critical Business Logic', () => {
  let poolMonitor: PoolMonitor;

  beforeEach(() => {
    vi.clearAllMocks();
    poolMonitor = PoolMonitor.getInstance();
  });

  describe('Pool Sufficiency Checks', () => {
    it('should allow bets when pool balance is sufficient', async () => {
      // Arrange: Pool has 100 MON, user wants to bet 1 MON (max win: 50 MON)
      vi.mocked(getPoolBalance).mockResolvedValue(100);
      
      // Act
      const result = poolMonitor.isBetAllowed(1, 100);
      
      // Assert
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block bets when pool balance is insufficient for max possible payout', async () => {
      // Arrange: Pool has 30 MON, user wants to bet 1 MON (max win: 50 MON, reserve: 10 MON)
      vi.mocked(getPoolBalance).mockResolvedValue(30);
      
      // Act
      const result = poolMonitor.isBetAllowed(1, 30);
      
      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('max bet');
      expect(result.maxBet).toBeLessThan(1);
    });

    it('should completely block bets when pool is below minimum reserve', async () => {
      // Arrange: Pool has 8 MON (below 10 MON reserve)
      vi.mocked(getPoolBalance).mockResolvedValue(8);
      
      // Act
      const result = poolMonitor.isBetAllowed(0.1, 8);
      
      // Assert
      expect(result.allowed).toBe(false);
      expect(result.maxBet).toBe(0);
      expect(result.reason).toContain('refilled');
    });
  });

  describe('Pool Status Detection', () => {
    it('should return healthy status for sufficient balance', () => {
      const status = poolMonitor.getPoolStatus(100);
      expect(status).toBe('healthy');
    });

    it('should return low status for balance below 50 MON', () => {
      const status = poolMonitor.getPoolStatus(45);
      expect(status).toBe('low');
    });

    it('should return critical status for balance below 20 MON', () => {
      const status = poolMonitor.getPoolStatus(15);
      expect(status).toBe('critical');
    });

    it('should return insufficient status for balance below 10 MON', () => {
      const status = poolMonitor.getPoolStatus(8);
      expect(status).toBe('insufficient');
    });
  });

  describe('Payout Failure Scenarios', () => {
    it('should handle partial payout when pool has limited funds', async () => {
      // Arrange: User won 50 MON but pool only has 30 MON available
      const mockResponse = {
        success: true,
        partial: true,
        payoutAmount: 20, // Partial amount
        originalAmount: 50,
        message: 'Partial payout processed',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await sendFromPool('0x123', 50, 'mines');
      
      // Assert: Should still return success for partial payout
      expect(result).toBe(true);
    });

    it('should reject payout when pool is completely insufficient', async () => {
      // Arrange: Pool service returns insufficient funds error
      const mockResponse = {
        success: false,
        error: 'pool_insufficient',
        message: 'Pool is being refilled',
        retryAfter: 300,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve(mockResponse),
      });

      // Act
      const result = await sendFromPool('0x123', 50, 'mines');
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Admin Notification Triggers', () => {
    it('should trigger warning notification for low balance', async () => {
      // Arrange
      vi.mocked(getPoolBalance).mockResolvedValue(45); // Below 50 MON threshold
      const notificationSpy = vi.spyOn(adminNotifications, 'sendNotification');

      // Act
      await adminNotifications.checkAndNotify();

      // Assert
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_balance',
          severity: 'warning',
          poolBalance: 45,
          threshold: 50,
        })
      );
    });

    it('should trigger critical notification for very low balance', async () => {
      // Arrange
      vi.mocked(getPoolBalance).mockResolvedValue(15); // Below 20 MON threshold
      const notificationSpy = vi.spyOn(adminNotifications, 'sendNotification');

      // Act
      await adminNotifications.checkAndNotify();

      // Assert
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_balance',
          severity: 'critical',
          poolBalance: 15,
          threshold: 20,
        })
      );
    });

    it('should trigger emergency notification for insufficient balance', async () => {
      // Arrange
      vi.mocked(getPoolBalance).mockResolvedValue(5); // Below 10 MON reserve
      const notificationSpy = vi.spyOn(adminNotifications, 'sendNotification');

      // Act
      await adminNotifications.checkAndNotify();

      // Assert
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'insufficient_funds',
          severity: 'emergency',
          poolBalance: 5,
          threshold: 10,
        })
      );
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('should handle pool balance fetch errors gracefully', async () => {
      // Arrange
      vi.mocked(getPoolBalance).mockRejectedValue(new Error('Network error'));

      // Act & Assert: Should not throw
      await expect(adminNotifications.checkAndNotify()).resolves.not.toThrow();
    });

    it('should prevent notification spam with cooldown', async () => {
      // Arrange
      vi.mocked(getPoolBalance).mockResolvedValue(15);
      const notificationSpy = vi.spyOn(adminNotifications, 'sendNotification');

      // Act: Call twice rapidly
      await adminNotifications.checkAndNotify();
      await adminNotifications.checkAndNotify();

      // Assert: Should only send one notification due to cooldown
      expect(notificationSpy).toHaveBeenCalledTimes(1);
    });

    it('should calculate correct max bet based on pool balance', () => {
      // Arrange: Pool has 60 MON, reserve 10 MON = 50 MON available
      // Max win multiplier is 50x, so max bet = 50/50 = 1 MON
      
      // Act
      const result = poolMonitor.isBetAllowed(1, 60);
      
      // Assert
      expect(result.allowed).toBe(true);
      
      // Test slightly higher bet
      const result2 = poolMonitor.isBetAllowed(1.1, 60);
      expect(result2.allowed).toBe(false);
      expect(result2.maxBet).toBeCloseTo(1.0, 2);
    });
  });

  describe('User Experience Scenarios', () => {
    it('should provide helpful error message for blocked bets', () => {
      const result = poolMonitor.isBetAllowed(5, 30); // Bet too high for pool
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Current max bet');
      expect(result.maxBet).toBeGreaterThan(0);
    });

    it('should provide refill message when pool is empty', () => {
      const result = poolMonitor.isBetAllowed(0.1, 5); // Pool below reserve
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('refilled');
      expect(result.maxBet).toBe(0);
    });

    it('should show appropriate status messages', () => {
      expect(poolMonitor.getStatusMessage('healthy', 100)).toContain('🟢');
      expect(poolMonitor.getStatusMessage('low', 40)).toContain('🟡');
      expect(poolMonitor.getStatusMessage('critical', 15)).toContain('🟠');
      expect(poolMonitor.getStatusMessage('insufficient', 5)).toContain('🔴');
    });
  });
});

// Integration test for complete flow
describe('Complete Pool Management Flow', () => {
  it('should handle complete user journey with insufficient funds', async () => {
    // Scenario: User tries to play when pool is low
    
    // 1. User loads game - pool status should be visible
    vi.mocked(getPoolBalance).mockResolvedValue(25); // Low balance
    const poolMonitor = PoolMonitor.getInstance();
    const status = poolMonitor.getPoolStatus(25);
    expect(status).toBe('low');

    // 2. User tries to bet 1 MON - should be allowed
    const betCheck1 = poolMonitor.isBetAllowed(1, 25);
    expect(betCheck1.allowed).toBe(true);

    // 3. User tries to bet 2 MON - should be blocked
    const betCheck2 = poolMonitor.isBetAllowed(2, 25);
    expect(betCheck2.allowed).toBe(false);
    expect(betCheck2.maxBet).toBeLessThan(2);

    // 4. Pool drops further to 8 MON - all bets blocked
    const betCheck3 = poolMonitor.isBetAllowed(0.1, 8);
    expect(betCheck3.allowed).toBe(false);
    expect(betCheck3.maxBet).toBe(0);

    // 5. Admin should be notified
    vi.mocked(getPoolBalance).mockResolvedValue(8);
    const notificationSpy = vi.spyOn(adminNotifications, 'sendNotification');
    await adminNotifications.checkAndNotify();
    expect(notificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'insufficient_funds',
        severity: 'emergency',
      })
    );
  });
});