@echo off
REM ========================================================
REM TRADEFORCE AI - PORT CONFLICT RESOLUTION
REM ========================================================

echo.
echo ========================================================
echo TRADEFORCE AI - PORT CONFLICT RESOLUTION
echo ========================================================
echo.

REM Step 1: Stop all existing Node.js processes
echo 1. Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
  echo    Successfully stopped all Node.js processes
) ELSE (
  echo    No Node.js processes found running
)

REM Step 2: Stop all processes using port 3008
echo.
echo 2. Checking for processes using port 3008...
set found_port=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3008" ^| findstr "LISTENING"') do (
  set found_port=1
  echo    Found process using port 3008: PID %%a
  taskkill /F /PID %%a >nul 2>&1
  echo    Killed process %%a
)
if %found_port% EQU 0 (
  echo    No processes found using port 3008
)

REM Step 3: Check environment
echo.
echo 3. Cleaning environment...
IF EXIST ".next" (
  rmdir /S /Q ".next"
  echo    Cleaned .next directory
)

REM Step 4: Update wallet configuration
echo.
echo 4. Updating wallet configuration...
echo // Wallet configuration - Production Mode > lib\walletConfig.js
echo export const WALLET_CONFIG = { >> lib\walletConfig.js
echo   requireSignature: true, >> lib\walletConfig.js
echo   networkEndpoint: 'https://api.devnet.solana.com', >> lib\walletConfig.js
echo   minTransactions: 0, // No minimum transaction requirement >> lib\walletConfig.js
echo   enableMockData: false, >> lib\walletConfig.js
echo   allowedWallets: ['Phantom', 'Solflare', 'Slope', 'Sollet'], >> lib\walletConfig.js
echo   validationMode: true, >> lib\walletConfig.js
echo   persistSignatures: true, >> lib\walletConfig.js
echo   logPerformanceMetrics: true >> lib\walletConfig.js
echo }; >> lib\walletConfig.js
echo    Wallet configuration updated successfully

REM Step 5: Set up environment variables
echo.
echo 5. Setting environment variables...
echo SOLANA_NETWORK=devnet > .env.local
echo SOLANA_RPC_URL=https://api.devnet.solana.com >> .env.local
echo SOLANA_EXPLORER=https://explorer.solana.com >> .env.local
echo SOLANA_WEBSOCKET=wss://api.devnet.solana.com/ >> .env.local
echo USE_REAL_SOLANA_WALLET=true >> .env.local
echo ENABLE_MOCK_DATA=false >> .env.local
echo    Environment variables set

REM Step 6: Start MCP servers
echo.
echo 6. Starting MCP servers...
start cmd /c "title MCP Token Discovery && node mcp/token-discovery/server.js --devnet"
start cmd /c "title MCP Shyft Data && node mcp/shyft/server.js --devnet"
timeout /t 2 /nobreak >nul
echo    MCP servers started

REM Step 7: Start application
echo.
echo 7. Starting TradeForce AI application...
echo.
echo ========================================================
echo TRADEFORCE AI - STARTING WITH CORRECT PORT (3008)
echo ========================================================
echo.
echo Application will be available at: http://localhost:3008
echo Please wait while the application starts...
echo.

start cmd /k "title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && npm run dev"

REM Wait for application to start
echo Waiting for application to start...
timeout /t 10 /nobreak >nul

REM Open browser
start "" "http://localhost:3008"

echo.
echo Application started! Browser should open to http://localhost:3008
