@echo off
echo 🧪 Testing Authentication Fix
echo.
echo 📋 Test Steps:
echo 1. Go to http://localhost:3000/debug
echo 2. Connect your wallet
echo 3. Click "Test Authentication" button
echo 4. Sign the message when prompted
echo 5. Verify authentication status shows "Yes"
echo 6. Click "Test Coin Master Game" to test complete flow
echo.
echo 🎮 Game Testing:
echo 1. Go to http://localhost:3000/games/coin-master
echo 2. Connect wallet if not connected
echo 3. Click "SIGN TO PLAY" button
echo 4. Sign message when prompted
echo 5. Click "SPIN" to play game
echo 6. Verify game works without "Transaction failed" errors
echo.
echo ✅ Success criteria:
echo - Authentication works without errors
echo - Games play successfully after authentication
echo - No "Transaction failed" messages
echo - JWT token is properly stored and used
echo.
echo 🔗 Debug page: http://localhost:3000/debug
echo 🎰 Coin Master: http://localhost:3000/games/coin-master
echo 🎡 Wheel game: http://localhost:3000/games/wheel
echo 🎲 Plinko game: http://localhost:3000/games/plinko
echo.
pause