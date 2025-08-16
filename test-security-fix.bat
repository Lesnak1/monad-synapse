@echo off
echo ========================================================
echo Security Audit Fix Verification
echo Testing API endpoints to verify Transaction failed errors are resolved
echo ========================================================

echo.
echo 1. Testing Health Check Endpoint...
curl -X GET http://localhost:3004/api/health -H "Content-Type: application/json" -w "\nStatus Code: %%{http_code}\n" -s

echo.
echo ========================================================
echo 2. Testing Security Status (should not return 503)...
echo This test verifies the security audit fix

echo Creating test payout request...
curl -X POST http://localhost:3004/api/payout ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer test-token" ^
  -d "{\"playerAddress\":\"0x742d35Cc6634C0532925a3b8D400E4E62f8d6641\",\"winAmount\":1.0,\"gameType\":\"dice\",\"transactionId\":\"test_security_fix_123\",\"priority\":\"normal\"}" ^
  -w "\nStatus Code: %%{http_code}\n" ^
  -s

echo.
echo ========================================================
echo VERIFICATION COMPLETE
echo ========================================================
echo.
echo Expected Results:
echo - Health check should return 200 OK
echo - Payout request should NOT return 503 (Service Unavailable)
echo - May return 401 (unauthorized) or 400 (validation error) which is normal
echo - The key fix: NO MORE 503 errors due to security audit blocking
echo.
echo If you see 503 errors, the security audit is still blocking requests
echo If you see 401/400 errors, the security audit fix is working!
echo ========================================================