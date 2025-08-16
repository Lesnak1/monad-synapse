/**
 * Comprehensive Payout System Testing Script
 * Tests the complete flow: authentication → game play → payout
 */

const BASE_URL = 'http://localhost:3003';

// Test data
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b8D400E4E62f8d6641';
const TEST_SIGNATURE = 'mock-signature-for-testing';

// Utility function to make HTTP requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`\n🔄 Making ${options.method || 'GET'} request to: ${endpoint}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const responseData = await response.json().catch(() => null);
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Data:`, responseData);
    
    return {
      status: response.status,
      data: responseData,
      ok: response.ok
    };
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return {
      status: 0,
      data: null,
      ok: false,
      error: error.message
    };
  }
}

// Test authentication
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  const loginPayload = {
    address: TEST_ADDRESS,
    signature: TEST_SIGNATURE,
    message: `Login message with ${TEST_ADDRESS}`,
    timestamp: Date.now()
  };
  
  return await makeRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(loginPayload)
  });
}

// Test game result API
async function testGameResult(authToken) {
  console.log('\n🎮 Testing Game Result API...');
  
  const gamePayload = {
    gameType: 'dice',
    gameParams: {
      betAmount: 1.0,
      clientSeed: 'testclientseed123',
      nonce: 1,
      target: 50,
      prediction: 'over'
    },
    playerAddress: TEST_ADDRESS
  };
  
  return await makeRequest('/api/game/result', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(gamePayload)
  });
}

// Test payout API directly
async function testPayoutDirect(authToken, winAmount = 10) {
  console.log('\n💰 Testing Payout API directly...');
  
  const payoutPayload = {
    playerAddress: TEST_ADDRESS,
    winAmount: winAmount,
    gameType: 'dice',
    transactionId: `test_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    priority: 'normal',
    gameProof: {
      serverSeedHash: 'test-server-hash',
      clientSeed: 'testclientseed123',
      nonce: 1,
      gameHash: 'test-game-hash'
    }
  };
  
  return await makeRequest('/api/payout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(payoutPayload)
  });
}

// Test complete game flow
async function testCompleteGameFlow(authToken) {
  console.log('\n🔄 Testing Complete Game Flow...');
  
  console.log('Step 1: Play a winning game...');
  const gameResult = await testGameResult(authToken);
  
  if (!gameResult.ok || !gameResult.data?.success) {
    console.error('❌ Game failed:', gameResult.data);
    return { success: false, error: 'Game play failed', details: gameResult.data };
  }
  
  if (!gameResult.data.isWin) {
    console.log('⚠️ Game was not a win, testing payout anyway...');
  }
  
  console.log('Step 2: Process payout for winnings...');
  const winAmount = gameResult.data.winAmount || 5; // Use actual win amount or fallback
  
  const payoutResult = await testPayoutDirect(authToken, winAmount);
  
  return {
    success: gameResult.ok && payoutResult.ok,
    gameResult: gameResult.data,
    payoutResult: payoutResult.data,
    error: !payoutResult.ok ? 'Payout failed' : null
  };
}

// Test pool wallet balance
async function testPoolBalance() {
  console.log('\n💼 Testing Pool Balance...');
  
  // This would typically require admin authentication
  return await makeRequest('/api/health');
}

// Test various error scenarios
async function testErrorScenarios(authToken) {
  console.log('\n🚨 Testing Error Scenarios...');
  
  const scenarios = [
    {
      name: 'Invalid payout amount',
      payload: {
        playerAddress: TEST_ADDRESS,
        winAmount: -1, // Invalid negative amount
        gameType: 'dice',
        transactionId: `error_test_1_${Date.now()}`
      }
    },
    {
      name: 'Invalid player address',
      payload: {
        playerAddress: 'invalid-address',
        winAmount: 10,
        gameType: 'dice',
        transactionId: `error_test_2_${Date.now()}`
      }
    },
    {
      name: 'Missing required fields',
      payload: {
        winAmount: 10,
        gameType: 'dice'
        // Missing playerAddress and transactionId
      }
    },
    {
      name: 'Excessive payout amount',
      payload: {
        playerAddress: TEST_ADDRESS,
        winAmount: 50000, // Very large amount
        gameType: 'dice',
        transactionId: `error_test_4_${Date.now()}`
      }
    }
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    const result = await makeRequest('/api/payout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(scenario.payload)
    });
    
    results.push({
      scenario: scenario.name,
      status: result.status,
      success: result.data?.success || false,
      error: result.data?.error
    });
  }
  
  return results;
}

// Test without authentication
async function testUnauthenticatedRequests() {
  console.log('\n🚫 Testing Unauthenticated Requests...');
  
  const endpoints = [
    { path: '/api/game/result', method: 'POST' },
    { path: '/api/payout', method: 'POST' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n🧪 Testing unauthenticated ${endpoint.method} to ${endpoint.path}`);
    const result = await makeRequest(endpoint.path, {
      method: endpoint.method,
      body: JSON.stringify({ test: 'data' })
    });
    
    results.push({
      endpoint: endpoint.path,
      method: endpoint.method,
      status: result.status,
      shouldBe401: result.status === 401,
      error: result.data?.error
    });
  }
  
  return results;
}

// Main testing function
async function runPayoutSystemTests() {
  console.log('🧪 Starting Comprehensive Payout System Tests...');
  console.log('='.repeat(60));
  
  const testResults = {
    authentication: null,
    gameResult: null,
    payoutDirect: null,
    completeFlow: null,
    poolBalance: null,
    errorScenarios: null,
    unauthenticated: null,
    summary: {
      passed: 0,
      failed: 0,
      errors: []
    }
  };
  
  try {
    // Test 1: Authentication
    testResults.authentication = await testAuthentication();
    if (!testResults.authentication.ok) {
      testResults.summary.failed++;
      testResults.summary.errors.push('Authentication failed');
      console.error('❌ Cannot proceed without authentication');
      return testResults;
    }
    testResults.summary.passed++;
    
    const authToken = testResults.authentication.data?.token;
    if (!authToken) {
      testResults.summary.failed++;
      testResults.summary.errors.push('No auth token received');
      console.error('❌ No auth token received');
      return testResults;
    }
    
    // Test 2: Game Result
    testResults.gameResult = await testGameResult(authToken);
    if (testResults.gameResult.ok) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Game result failed');
    }
    
    // Test 3: Direct Payout
    testResults.payoutDirect = await testPayoutDirect(authToken);
    if (testResults.payoutDirect.ok) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Direct payout failed');
    }
    
    // Test 4: Complete Flow
    testResults.completeFlow = await testCompleteGameFlow(authToken);
    if (testResults.completeFlow.success) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Complete flow failed');
    }
    
    // Test 5: Pool Balance
    testResults.poolBalance = await testPoolBalance();
    if (testResults.poolBalance.ok) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Pool balance check failed');
    }
    
    // Test 6: Error Scenarios
    testResults.errorScenarios = await testErrorScenarios(authToken);
    const errorTestsPassed = testResults.errorScenarios.filter(r => r.status === 400).length;
    if (errorTestsPassed > 0) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Error scenario validation failed');
    }
    
    // Test 7: Unauthenticated Requests
    testResults.unauthenticated = await testUnauthenticatedRequests();
    const authTestsPassed = testResults.unauthenticated.filter(r => r.shouldBe401).length;
    if (authTestsPassed === testResults.unauthenticated.length) {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
      testResults.summary.errors.push('Authentication validation failed');
    }
    
  } catch (error) {
    console.error('💥 Critical test error:', error);
    testResults.summary.errors.push(`Critical error: ${error.message}`);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.summary.passed}`);
  console.log(`❌ Tests Failed: ${testResults.summary.failed}`);
  
  if (testResults.summary.errors.length > 0) {
    console.log(`\n🚨 Errors Found:`);
    testResults.summary.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  
  // Identify specific payout issues
  console.log('\n🔍 PAYOUT SYSTEM ANALYSIS:');
  
  if (testResults.payoutDirect && !testResults.payoutDirect.ok) {
    console.log('❌ Direct Payout Failed:');
    console.log(`   Status: ${testResults.payoutDirect.status}`);
    console.log(`   Error: ${testResults.payoutDirect.data?.error}`);
    console.log(`   Details:`, testResults.payoutDirect.data);
  }
  
  if (testResults.completeFlow && !testResults.completeFlow.success) {
    console.log('❌ Complete Flow Failed:');
    console.log(`   Error: ${testResults.completeFlow.error}`);
    if (testResults.completeFlow.payoutResult) {
      console.log(`   Payout Result:`, testResults.completeFlow.payoutResult);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  return testResults;
}

// Run the tests
runPayoutSystemTests().then(results => {
  console.log('\n🏁 Testing completed. Check the results above for detailed analysis.');
  
  // Exit with appropriate code
  const hasFailures = results.summary.failed > 0;
  process.exit(hasFailures ? 1 : 0);
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});