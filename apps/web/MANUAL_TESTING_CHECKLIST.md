# Manual Testing Checklist for Monad Synapse Casino

## Pre-Testing Setup
- [ ] Ensure environment variables are properly set in Vercel
- [ ] Verify pool wallet address is configured correctly
- [ ] Check that the application is deployed and accessible
- [ ] Confirm wallet connection works (RainbowKit + MetaMask)

## Authentication Flow Testing
- [ ] **Wallet Connection**
  - [ ] Connect wallet successfully
  - [ ] See wallet address displayed in interface
  - [ ] Sign authentication message when prompted
  - [ ] Verify JWT token is generated and stored

- [ ] **Session Management**
  - [ ] Authentication persists across page refreshes
  - [ ] Session expires appropriately (24 hours)
  - [ ] Can reconnect wallet after session expires

## Game Testing - Secure Components (No Transaction Errors)

### Coin Master Game (Secure)
- [ ] Navigate to `/games/coin-master`
- [ ] Game loads without errors
- [ ] Can adjust bet amount (0.1 - 1000 MON)
- [ ] Spin button works and shows animation
- [ ] Game result displays properly with symbols
- [ ] Win/loss calculation is correct
- [ ] No "Transaction failed" errors
- [ ] Winnings are processed via API only

### Dice Game (Secure)  
- [ ] Navigate to `/games/dice`
- [ ] Game loads without errors
- [ ] Can adjust bet amount (0.1 - 1000 MON)
- [ ] Can set target number (1-99)
- [ ] Can switch between "under" and "over" predictions
- [ ] Roll dice button works
- [ ] Game result shows dice roll and win/loss
- [ ] Multiplier calculation is accurate
- [ ] No "Transaction failed" errors
- [ ] Winnings are processed via API only

## Game Testing - Legacy Components (May Have Transaction Errors)

### Crash Game
- [ ] Navigate to `/games/crash`
- [ ] Game loads without errors
- [ ] Can set bet amount and multiplier
- [ ] Game shows crash simulation
- [ ] Check if any transaction errors occur
- [ ] Note if this needs migration to secure version

### Mines Game
- [ ] Navigate to `/games/mines`
- [ ] Game loads without errors
- [ ] Can set number of mines and bet amount
- [ ] Tile selection works
- [ ] Game reveals mines correctly
- [ ] Check for transaction errors
- [ ] Note if needs migration to secure version

## API Functionality Testing

### Game Result API
- [ ] **POST /api/game/result**
  - [ ] Requires valid JWT authentication
  - [ ] Accepts valid game parameters
  - [ ] Returns proper game results
  - [ ] Includes provably fair proof
  - [ ] Calculates winnings correctly
  - [ ] Handles all supported game types:
    - [ ] mines, dice, crash, slots, plinko
    - [ ] coin-flip, coin-master, tower, limbo
    - [ ] sweet-bonanza, diamonds, slide, burning-wins

### Authentication API
- [ ] **POST /api/auth/login**
  - [ ] Validates wallet signature
  - [ ] Returns JWT token
  - [ ] Creates user session
  - [ ] Handles invalid signatures gracefully

## Pool Wallet Testing
- [ ] Pool wallet balance displays correctly (not mock 1000 tokens)
- [ ] Balance reflects real blockchain data
- [ ] Pool wallet address matches environment configuration
- [ ] Transactions deduct from actual pool balance

## Error Handling Testing
- [ ] Invalid bet amounts rejected (below 0.1 or above 1000)
- [ ] Invalid game parameters handled gracefully
- [ ] Network errors display user-friendly messages
- [ ] Authentication failures redirect to wallet connection
- [ ] Game request failures show specific error messages

## Performance Testing
- [ ] Game responses within 2-3 seconds
- [ ] No memory leaks during extended gameplay
- [ ] Smooth animations and UI transitions
- [ ] Works well on mobile devices
- [ ] Handles concurrent game requests properly

## Security Testing
- [ ] Cannot play games without authentication
- [ ] Invalid JWT tokens are rejected
- [ ] Client seed validation prevents manipulation
- [ ] Game results are cryptographically secure
- [ ] No sensitive data exposed in client
- [ ] Pool wallet private key never exposed

## User Experience Testing
- [ ] Clear win/loss feedback
- [ ] Bet amount validation with helpful messages
- [ ] Game rules and controls are intuitive
- [ ] Responsive design works on all screen sizes
- [ ] Loading states provide clear feedback
- [ ] Error messages are user-friendly

## Production Readiness
- [ ] All games work without "Game request failed" errors
- [ ] No "Transaction failed" messages
- [ ] Pool wallet shows real balance
- [ ] Authentication flow is seamless
- [ ] Performance is acceptable for public use
- [ ] All environment variables configured in Vercel
- [ ] No console errors in browser

## Critical Issues to Watch For
⚠️ **High Priority Issues:**
- "Game request failed" errors → Check authentication and API endpoints
- "Transaction failed" errors → Verify secure game components are being used
- Pool wallet showing 1000 mock tokens → Check environment variable configuration
- Authentication failures → Verify JWT generation and validation

## Success Criteria
✅ **Platform is ready for public launch when:**
- All secure games (coin-master, dice) work without errors
- Authentication flow is seamless
- Pool wallet shows real blockchain balance
- No mock or demo data is visible to users
- Game results are provably fair and secure
- Performance is acceptable for real users

---

## Notes for Developers
- Secure games use `useSecureGame` hook (API-only, no blockchain transactions)
- Legacy games use `useGameContract` hook (may cause transaction errors)
- Migrate remaining games to secure versions to eliminate transaction failures
- All game logic is handled server-side for security and reliability