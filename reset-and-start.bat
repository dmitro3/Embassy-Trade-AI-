@echo off
REM ========================================================
REM TRADEFORCE AI - PORT CONFLICT FIXER
REM ========================================================

echo.
echo ========================================================
echo TRADEFORCE AI - RESET AND START CLEAN
echo ========================================================
echo.

REM Step 1: Stop all Node.js processes and processes using important ports
echo [1/5] Stopping all related processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

REM Step 2: Clear environment
echo [2/5] Cleaning environment...
rmdir /S /Q ".next" 2>nul
rmdir /S /Q "node_modules\.cache" 2>nul
del /S /Q ".\lib\*.log" 2>nul

REM Step 3: Configure wallet for real Solana
echo [3/5] Setting up wallet configuration...
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

REM Step 4: Start MCP servers
echo [4/5] Starting MCP servers...
start cmd /c "title MCP Token Discovery && node mcp/token-discovery/server.js --devnet"
start cmd /c "title MCP Shyft Data && node mcp/shyft/server.js --devnet"
timeout /t 2 /nobreak >nul

REM Step 5: Start the application
echo [5/5] Starting TradeForce AI application...
echo.
echo ========================================================
echo TRADEFORCE AI - STARTING SOLANA INTEGRATION
echo ========================================================
echo.
echo Application URL: http://localhost:3008
echo.
echo 1. Please be patient while the application starts
echo 2. Connect your Solana wallet when prompted
echo 3. Navigate to the Results tab to see real transaction data
echo.

start cmd /k "title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && set ENABLE_MOCK_DATA=false && npm run dev"

REM Wait for application to start
echo Waiting for application to start...
timeout /t 15 /nobreak >nul

REM Open browser
start "" "http://localhost:3008"

echo.
echo TradeForce AI started with real Solana integration!
echo If browser does not open, go to http://localhost:3008 manually.
