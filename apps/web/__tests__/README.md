# Comprehensive Game API Test Suite

This directory contains a comprehensive test suite for verifying all game functionality works correctly. The tests cover authentication, game logic, payout processing, security measures, and complete integration flows.

## Test Structure

### 📁 Test Categories

#### 1. **Authentication Tests** (`/api/auth-login.test.ts`)
- ✅ Wallet authentication flow with JWT tokens
- ✅ Invalid authentication scenarios
- ✅ Token expiration handling
- ✅ Signature validation
- ✅ Input sanitization
- ✅ Multiple session management

#### 2. **Game API Tests** (`/api/game-result-comprehensive.test.ts`)
- ✅ All 14 supported game types: `mines`, `dice`, `crash`, `slots`, `plinko`, `slide`, `diamonds`, `burning-wins`, `sweet-bonanza`, `coin-flip`, `coin-master`, `tower`, `spin-win`, `limbo`
- ✅ Valid game requests with proper parameters
- ✅ Invalid game requests (bad parameters, missing auth, etc.)
- ✅ Client seed validation (alphanumeric only)
- ✅ Bet amount validation (0.1 - 1000 MON)
- ✅ Game-specific parameter validation
- ✅ Provably fair proof generation
- ✅ Response structure consistency

#### 3. **Payout API Tests** (`/api/payout-comprehensive.test.ts`)
- ✅ Successful payout processing
- ✅ Payout authentication and authorization
- ✅ Invalid payout scenarios
- ✅ Pool insufficient funds handling
- ✅ Multi-signature requirement scenarios
- ✅ Replay protection
- ✅ Rate limiting
- ✅ Security auditing integration
- ✅ Game win amount limits

#### 4. **Integration Tests** (`/integration/full-game-flow.test.ts`)
- ✅ Complete game flow: authenticate → play game → receive result → process payout
- ✅ Multiple games in sequence
- ✅ Error scenarios in game flow
- ✅ High-value game and payout flows
- ✅ Concurrent user sessions
- ✅ Performance under load

#### 5. **Security Tests** (`/security/security-comprehensive.test.ts`)
- ✅ Client seed validation security
- ✅ Rate limiting enforcement
- ✅ Replay attack prevention
- ✅ Input sanitization and validation
- ✅ JWT token security
- ✅ Bet amount security
- ✅ Nonce validation security
- ✅ Authorization header security

## 🚀 Running Tests

### Quick Start
```bash
# Run all comprehensive tests
npm run test:all

# Run specific test suites
npm run test:auth          # Authentication tests
npm run test:games         # Game API tests  
npm run test:payout        # Payout API tests
npm run test:integration   # Integration tests
npm run test:security      # Security tests
```

### Advanced Usage
```bash
# List available test suites
npm run test:list

# Run specific test suite by number
npm run test:specific 1    # Run authentication tests
npm run test:specific 2    # Run game API tests
# ... etc

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run for CI/CD
npm run test:ci
```

### Environment Variables
```bash
# Also run original test suites (optional)
RUN_ORIGINAL_TESTS=true npm run test:all

# Set test environment
NODE_ENV=test

# Custom test timeouts
JEST_TIMEOUT=30000
```

## 🧪 Test Coverage

The test suite covers:

### **API Endpoints**
- ✅ `/api/auth/login` - Wallet authentication
- ✅ `/api/game/result` - Game result processing  
- ✅ `/api/payout` - Payout processing

### **Authentication & Security**
- ✅ JWT token generation and validation
- ✅ Wallet signature verification
- ✅ Rate limiting (50-100 requests per minute)
- ✅ Replay attack prevention
- ✅ Input sanitization and validation
- ✅ Authorization header security

### **Game Logic**
- ✅ All 14 game types with specific logic
- ✅ Provably fair random number generation
- ✅ Game parameter validation
- ✅ Win/loss calculation accuracy
- ✅ Multiplier calculations

### **Validation Rules**
- ✅ Client seed: 8-64 characters, alphanumeric only
- ✅ Bet amount: 0.1 - 1000 MON
- ✅ Nonce: 0 to Number.MAX_SAFE_INTEGER
- ✅ Player address: Valid Ethereum address format
- ✅ Game-specific parameters (mines count, target numbers, etc.)

### **Error Handling**
- ✅ Malformed JSON requests
- ✅ Missing required fields
- ✅ Invalid parameter values
- ✅ Network and system errors
- ✅ Pool insufficient funds scenarios
- ✅ Security audit failures

## 🔒 Security Test Coverage

### **Input Validation**
- XSS prevention in all input fields
- SQL injection prevention
- Path traversal prevention
- Null byte injection prevention
- CRLF injection prevention
- Command injection prevention

### **Authentication Security**
- JWT tampering detection
- Token expiration enforcement
- Signature verification
- Session management security
- Rate limiting per IP/user

### **Game Security**
- Client seed format enforcement
- Nonce replay prevention
- Bet amount manipulation prevention
- Game result tampering prevention
- Provably fair validation

### **Payout Security**
- Transaction replay prevention
- Amount validation and limits
- Multi-signature requirements for large payouts
- Pool balance verification
- Security audit integration

## 📊 Expected Results

### **Test Metrics**
- **Total Tests**: ~200+ individual test cases
- **Code Coverage**: >80% for API routes and core logic
- **Performance**: All tests should complete within 30 seconds
- **Success Rate**: 100% for properly configured environment

### **Game Type Coverage**
All 14 supported games are tested:
1. **mines** - Mine field game with configurable mine count
2. **dice** - Number prediction game with over/under
3. **crash** - Multiplier crash game
4. **slots** - Traditional slot machine
5. **plinko** - Ball drop probability game
6. **slide** - Precision-based sliding game
7. **diamonds** - Match-3 style game
8. **burning-wins** - Slot variant with fire theme
9. **sweet-bonanza** - 6x5 grid symbol matching
10. **coin-flip** - Simple heads/tails prediction
11. **coin-master** - 3-reel slot machine
12. **tower** - Tower climbing risk game
13. **spin-win** - 5-reel slot machine
14. **limbo** - Multiplier target game

## 🐛 Troubleshooting

### Common Issues

**Tests failing with authentication errors:**
```bash
# Ensure JWT_SECRET is set in test environment
export JWT_SECRET="test-jwt-secret-key-for-testing-only"
```

**Rate limiting causing test failures:**
```bash
# Run tests with slower execution
npm run test:watch --runInBand
```

**Coverage reports not generating:**
```bash
# Ensure coverage directory exists
mkdir -p coverage
npm run test:coverage
```

**Memory issues with large test suites:**
```bash
# Run with increased memory
node --max-old-space-size=4096 node_modules/.bin/jest
```

### Environment Setup
```bash
# Required environment variables for testing
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
API_KEY_SECRET=test-api-key-secret-for-testing-only
SECURE_WALLET_ENCRYPTION_KEY=test-encryption-key-32-bytes-long
DATABASE_PATH=./test-data
LOG_DIRECTORY=./test-logs
LOG_LEVEL=ERROR
```

## 📈 Test Reports

### Coverage Report
After running tests with coverage, view the HTML report:
```bash
open coverage/lcov-report/index.html
```

### Test Results
Test results include:
- ✅ Pass/fail status for each test
- 📊 Execution time per test suite  
- 🔍 Code coverage metrics
- ⚠️ Security findings
- 📋 Performance benchmarks

## 🔄 Continuous Integration

For CI/CD integration:
```yaml
# .github/workflows/test.yml example
- name: Run Comprehensive Tests
  run: |
    npm ci
    npm run test:ci
    npm run test:coverage
```

The test suite is designed to run in any environment that supports Node.js and can connect to the test APIs.

## 📝 Contributing

When adding new tests:

1. **Follow naming conventions**: `*.test.ts` for test files
2. **Group related tests**: Use `describe` blocks for organization  
3. **Write descriptive test names**: Clear, specific test descriptions
4. **Mock external dependencies**: Avoid real network calls
5. **Test both success and failure cases**: Comprehensive coverage
6. **Update this README**: Document new test categories

### Test File Template
```typescript
/**
 * [Test Suite Name]
 * [Brief description of what this tests]
 */

describe('[Test Suite Name]', () => {
  beforeEach(() => {
    // Setup code
  });

  describe('[Feature Group]', () => {
    test('should [expected behavior]', async () => {
      // Test implementation
    });
  });
});
```

## 🎯 Success Criteria

The test suite validates that:
- ✅ All game types work correctly with proper validation
- ✅ Authentication is secure and properly enforced
- ✅ Payouts are processed safely with proper checks
- ✅ Rate limiting prevents abuse
- ✅ Security measures protect against common attacks
- ✅ Error handling is comprehensive and user-friendly
- ✅ Performance meets acceptable standards
- ✅ Code coverage exceeds quality thresholds

This comprehensive test suite ensures the game platform is robust, secure, and ready for production use.