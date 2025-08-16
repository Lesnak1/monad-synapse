/**
 * Test Runner Script
 * Runs all comprehensive tests with proper setup and reporting
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Authentication Tests',
    pattern: '__tests__/api/auth-login.test.ts',
    description: 'Tests wallet authentication flow, JWT tokens, and security'
  },
  {
    name: 'Game API Tests',
    pattern: '__tests__/api/game-result-comprehensive.test.ts',
    description: 'Tests all game types, validation, and game logic'
  },
  {
    name: 'Payout API Tests',
    pattern: '__tests__/api/payout-comprehensive.test.ts',
    description: 'Tests payout processing, security, and error handling'
  },
  {
    name: 'Integration Tests',
    pattern: '__tests__/integration/full-game-flow.test.ts',
    description: 'Tests complete game flows from auth to payout'
  },
  {
    name: 'Security Tests',
    pattern: '__tests__/security/security-comprehensive.test.ts',
    description: 'Tests security measures, rate limiting, and attack prevention'
  }
];

const originalTestSuites: TestSuite[] = [
  {
    name: 'Original Game Result Tests',
    pattern: '__tests__/api/game-result.test.ts',
    description: 'Original game result tests'
  },
  {
    name: 'Original Payout Tests',
    pattern: '__tests__/api/payout.test.ts',
    description: 'Original payout tests'
  },
  {
    name: 'Integration Casino Flow',
    pattern: '__tests__/integration/casino-flow.test.ts',
    description: 'Original casino flow integration tests'
  }
];

function runTestSuite(suite: TestSuite): boolean {
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`📝 ${suite.description}`);
  console.log('─'.repeat(60));
  
  try {
    const testPath = path.join(process.cwd(), suite.pattern);
    
    if (!existsSync(testPath)) {
      console.log(`⚠️  Test file not found: ${testPath}`);
      return false;
    }

    execSync(`npm test -- "${suite.pattern}"`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`✅ ${suite.name} completed successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${suite.name} failed`);
    console.error(error);
    return false;
  }
}

function runAllTests(): void {
  console.log('🚀 Starting Comprehensive Game API Test Suite');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Run comprehensive test suites
  console.log('\n📋 Running Comprehensive Test Suites:');
  for (const suite of testSuites) {
    results.total++;
    if (runTestSuite(suite)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Optionally run original test suites
  if (process.env.RUN_ORIGINAL_TESTS === 'true') {
    console.log('\n📋 Running Original Test Suites:');
    for (const suite of originalTestSuites) {
      results.total++;
      if (runTestSuite(suite)) {
        results.passed++;
      } else {
        results.failed++;
      }
    }
  }

  // Generate coverage report
  console.log('\n📊 Generating Coverage Report...');
  try {
    execSync('npm run test:coverage', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.log('⚠️  Coverage report generation failed');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Test Results Summary:');
  console.log('─'.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total:  ${results.total}`);
  console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The game API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

function runSpecificTestSuite(suiteName?: string): void {
  if (!suiteName) {
    console.log('Available test suites:');
    console.log('─'.repeat(40));
    
    testSuites.forEach((suite, index) => {
      console.log(`${index + 1}. ${suite.name}`);
      console.log(`   ${suite.description}`);
    });
    
    originalTestSuites.forEach((suite, index) => {
      console.log(`${testSuites.length + index + 1}. ${suite.name}`);
      console.log(`   ${suite.description}`);
    });
    
    console.log('\nUsage: npm run test:specific <suite-number>');
    return;
  }

  const suiteIndex = parseInt(suiteName) - 1;
  const allSuites = [...testSuites, ...originalTestSuites];
  
  if (suiteIndex >= 0 && suiteIndex < allSuites.length) {
    runTestSuite(allSuites[suiteIndex]);
  } else {
    console.log(`Invalid suite number. Please choose between 1 and ${allSuites.length}`);
  }
}

// Main execution
const command = process.argv[2];
const argument = process.argv[3];

switch (command) {
  case 'all':
    runAllTests();
    break;
  case 'specific':
    runSpecificTestSuite(argument);
    break;
  case 'list':
    runSpecificTestSuite();
    break;
  default:
    console.log('Game API Test Runner');
    console.log('Usage:');
    console.log('  npm run test:all           - Run all comprehensive tests');
    console.log('  npm run test:specific <n>  - Run specific test suite by number');
    console.log('  npm run test:list          - List available test suites');
    console.log('');
    console.log('Environment Variables:');
    console.log('  RUN_ORIGINAL_TESTS=true    - Also run original test suites');
    break;
}

export { runAllTests, runSpecificTestSuite, testSuites };