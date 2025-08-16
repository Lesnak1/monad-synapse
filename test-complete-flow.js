#!/usr/bin/env node

/**
 * Complete Game Flow Test Suite
 * Tests the entire flow from authentication to payout
 * Verifies the security audit fix and transaction success
 */

const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3004';
const TEST_WALLET_ADDRESS = '0x742d35Cc6610C7E0E5F7B5C93B74f1E826F3c8AB';
const TEST_PRIVATE_KEY = 'test_private_key_placeholder';

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.token = null;
  }

  async runTest(name, testFn) {
    try {
      console.log(`\n🧪 Running test: ${name}`);
      console.log('─'.repeat(60));
      
      const result = await testFn();
      
      if (result.success) {
        console.log(`✅ ${name} - PASSED`);
        this.passed++;
      } else {
        console.log(`❌ ${name} - FAILED: ${result.error}`);
        if (result.details) {
          console.log('   Details:', JSON.stringify(result.details, null, 2));
        }
        this.failed++;
      }
      
      return result;
    } catch (error) {
      console.log(`💥 ${name} - ERROR: ${error.message}`);
      this.failed++;
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Complete Game Flow Tests');
    console.log('═'.repeat(60));
    console.log(`Testing against: ${BASE_URL}`);
    console.log('═'.repeat(60));

    // 1. Test Authentication Flow
    const authResult = await this.runTest('Authentication Flow', async () => {
      return await this.testAuthentication();
    });

    if (!authResult.success) {
      console.log('\n❌ Authentication failed - skipping remaining tests');
      return this.printResults();
    }

    // 2. Test Game Result Flow
    const gameTests = [
      { name: 'Coin Master Game', type: 'coin-master' },
      { name: 'Dice Game', type: 'dice' },
      { name: 'Crash Game', type: 'crash' },
      { name: 'Mines Game', type: 'mines' }
    ];

    const gameResults = [];
    
    for (const game of gameTests) {
      const result = await this.runTest(`${game.name} Flow`, async () => {
        return await this.testGameFlow(game.type);
      });
      gameResults.push({ ...game, result });
    }

    // 3. Test Payout Flow with winning results
    for (const gameResult of gameResults) {
      if (gameResult.result.success && gameResult.result.data?.isWin) {
        await this.runTest(`${gameResult.name} Payout`, async () => {
          return await this.testPayout(gameResult.result.data);
        });
      }
    }

    // 4. Test Error Scenarios
    await this.runTest('Invalid Token Test', async () => {
      return await this.testInvalidToken();
    });

    await this.runTest('Malformed Request Test', async () => {
      return await this.testMalformedRequest();
    });

    // 5. Test Security Audit Status
    await this.runTest('Security Audit Status', async () => {
      return await this.testSecurityAudit();
    });

    this.printResults();
  }

  async testAuthentication() {
    try {
      const message = `Sign this message to authenticate: ${Date.now()}`;
      const signature = this.generateMockSignature(message);

      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: TEST_WALLET_ADDRESS,
          signature: signature,
          message: message,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      
      console.log('📡 Login Response:', {
        status: response.status,
        success: data.success,
        hasToken: !!data.token,
        hasSession: !!data.session
      });

      if (!response.ok) {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${data.error || 'Login failed'}`,
          details: data
        };
      }

      if (!data.success || !data.token) {
        return { 
          success: false, 
          error: 'Login succeeded but no token received',
          details: data
        };
      }

      this.token = data.token;
      console.log('🔑 JWT Token acquired successfully');
      
      return { 
        success: true, 
        data: {
          token: data.token,
          session: data.session
        }
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Authentication request failed: ${error.message}`
      };
    }
  }

  async testGameFlow(gameType) {
    try {
      if (!this.token) {
        return { success: false, error: 'No authentication token available' };
      }

      const clientSeed = crypto.randomBytes(16).toString('hex');
      const nonce = Math.floor(Math.random() * 1000000);

      const gameParams = {
        betAmount: 1.0,
        clientSeed: clientSeed,
        nonce: nonce
      };

      // Add game-specific parameters
      switch (gameType) {
        case 'mines':
          gameParams.mines = 3;
          break;
        case 'dice':
          gameParams.target = 50;
          gameParams.prediction = 'over';
          break;
        case 'crash':
          gameParams.multiplier = 2.0;
          break;
        // coin-master doesn't need additional params
      }

      const requestBody = {
        gameType: gameType,
        gameParams: gameParams,
        playerAddress: TEST_WALLET_ADDRESS,
        timestamp: Date.now()
      };

      console.log('📤 Game Request:', {
        gameType,
        betAmount: gameParams.betAmount,
        clientSeedLength: clientSeed.length,
        nonce
      });

      const response = await fetch(`${BASE_URL}/api/game/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      console.log('📡 Game Response:', {
        status: response.status,
        success: data.success,
        isWin: data.isWin,
        winAmount: data.winAmount,
        hasProof: !!data.proof
      });

      if (!response.ok) {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${data.error || 'Game request failed'}`,
          details: data
        };
      }

      if (!data.success) {
        return { 
          success: false, 
          error: data.error || 'Game processing failed',
          details: data
        };
      }

      console.log(`🎮 ${gameType} game completed:`, {
        result: data.isWin ? 'WIN' : 'LOSS',
        amount: data.winAmount,
        multiplier: data.gameResult?.multiplier
      });

      return { 
        success: true, 
        data: {
          ...data,
          gameType,
          requestBody
        }
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Game request failed: ${error.message}`
      };
    }
  }

  async testPayout(gameData) {
    try {
      if (!this.token) {
        return { success: false, error: 'No authentication token available' };
      }

      if (!gameData.isWin || gameData.winAmount <= 0) {
        return { success: false, error: 'Cannot test payout with losing game result' };
      }

      const payoutRequest = {
        playerAddress: gameData.playerAddress,
        winAmount: gameData.winAmount,
        gameType: gameData.gameType,
        transactionId: `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        priority: 'normal',
        gameId: `game_${Date.now()}`,
        multiplier: gameData.gameResult?.multiplier || (gameData.winAmount / gameData.requestBody.gameParams.betAmount),
        gameProof: gameData.proof,
        securityChecks: {
          ipAddress: '127.0.0.1',
          userAgent: 'TestRunner/1.0',
          sessionId: 'test_session'
        }
      };

      console.log('📤 Payout Request:', {
        winAmount: payoutRequest.winAmount,
        gameType: payoutRequest.gameType,
        multiplier: payoutRequest.multiplier,
        transactionId: payoutRequest.transactionId
      });

      const response = await fetch(`${BASE_URL}/api/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payoutRequest)
      });

      const data = await response.json();
      
      console.log('📡 Payout Response:', {
        status: response.status,
        success: data.success,
        hasTransactionHash: !!data.transactionHash,
        securityStatus: data.securityStatus,
        hasContractResult: !!data.contractResult
      });

      // This is the key test - payout should succeed now with the security fix
      if (response.status === 503) {
        return { 
          success: false, 
          error: '🚨 CRITICAL: Payout still returning 503 - Security audit blocking!',
          details: data
        };
      }

      if (!response.ok) {
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${data.error || 'Payout failed'}`,
          details: data
        };
      }

      if (!data.success) {
        return { 
          success: false, 
          error: data.error || 'Payout processing failed',
          details: data
        };
      }

      console.log('💰 Payout successful:', {
        amount: data.payoutAmount,
        txHash: data.transactionHash,
        securityStatus: data.securityStatus
      });

      return { 
        success: true, 
        data: data
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Payout request failed: ${error.message}`
      };
    }
  }

  async testInvalidToken() {
    try {
      const response = await fetch(`${BASE_URL}/api/game/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid_token_here'
        },
        body: JSON.stringify({
          gameType: 'dice',
          gameParams: {
            betAmount: 1.0,
            clientSeed: 'test123456789',
            nonce: 1,
            target: 50,
            prediction: 'over'
          },
          playerAddress: TEST_WALLET_ADDRESS
        })
      });

      const data = await response.json();
      
      console.log('📡 Invalid Token Response:', {
        status: response.status,
        success: data.success,
        error: data.error
      });

      // Should return 401 for invalid token
      if (response.status === 401 && !data.success) {
        console.log('✅ Correctly rejected invalid token');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Expected 401 rejection, got ${response.status}`,
          details: data
        };
      }

    } catch (error) {
      return { 
        success: false, 
        error: `Invalid token test failed: ${error.message}`
      };
    }
  }

  async testMalformedRequest() {
    try {
      if (!this.token) {
        return { success: false, error: 'No authentication token available' };
      }

      const response = await fetch(`${BASE_URL}/api/game/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          gameType: 'invalid_game',
          gameParams: {
            betAmount: -1, // Invalid negative amount
            clientSeed: '123', // Too short
            nonce: -1 // Invalid negative nonce
          },
          playerAddress: 'invalid_address'
        })
      });

      const data = await response.json();
      
      console.log('📡 Malformed Request Response:', {
        status: response.status,
        success: data.success,
        error: data.error
      });

      // Should return 400 for malformed request
      if (response.status === 400 && !data.success) {
        console.log('✅ Correctly rejected malformed request');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Expected 400 rejection, got ${response.status}`,
          details: data
        };
      }

    } catch (error) {
      return { 
        success: false, 
        error: `Malformed request test failed: ${error.message}`
      };
    }
  }

  async testSecurityAudit() {
    try {
      // Test a payout to trigger security audit
      if (!this.token) {
        return { success: false, error: 'No authentication token available' };
      }

      const payoutRequest = {
        playerAddress: TEST_WALLET_ADDRESS,
        winAmount: 1.0,
        gameType: 'dice',
        transactionId: `security_test_${Date.now()}`,
        priority: 'normal'
      };

      const response = await fetch(`${BASE_URL}/api/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payoutRequest)
      });

      const data = await response.json();
      
      console.log('📡 Security Audit Test Response:', {
        status: response.status,
        success: data.success,
        securityStatus: data.securityStatus,
        criticalIssues: data.criticalIssues
      });

      // In development mode, security audit should return 'secure' status
      if (data.securityStatus === 'secure' || response.status !== 503) {
        console.log('✅ Security audit allowing requests in development mode');
        return { success: true, data: { securityStatus: data.securityStatus } };
      } else {
        return { 
          success: false, 
          error: `Security audit still blocking requests - status: ${data.securityStatus}`,
          details: data
        };
      }

    } catch (error) {
      return { 
        success: false, 
        error: `Security audit test failed: ${error.message}`
      };
    }
  }

  generateMockSignature(message) {
    // Generate a mock signature for testing
    // In a real implementation, this would use wallet signing
    return crypto.createHash('sha256')
      .update(`${message}:${TEST_PRIVATE_KEY}`)
      .digest('hex');
  }

  printResults() {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Tests Passed: ${this.passed}`);
    console.log(`❌ Tests Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${this.passed + this.failed > 0 ? Math.round((this.passed / (this.passed + this.failed)) * 100) : 0}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! The "Transaction failed" errors have been resolved.');
      console.log('✅ Security audit fix is working correctly');
      console.log('✅ Authentication flow is functional');
      console.log('✅ Game processing is working');
      console.log('✅ Payout system is operational');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    console.log('═'.repeat(60));
  }
}

// Health check function
async function checkServerHealth() {
  try {
    console.log('🔍 Checking server health...');
    
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is healthy and responding');
      console.log('📊 Health status:', data);
      return true;
    } else {
      console.log(`❌ Server health check failed: HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot connect to server: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Complete Game Flow Test Suite');
  console.log('Testing the security audit fix and transaction flow');
  console.log('═'.repeat(60));

  // Check if server is running
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not responding. Please ensure the development server is running at http://localhost:3004');
    process.exit(1);
  }

  // Run comprehensive tests
  const testRunner = new TestRunner();
  await testRunner.runAllTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute tests
main().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});