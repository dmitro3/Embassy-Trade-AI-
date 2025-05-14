@echo off
REM ========================================================
REM TradeForce AI - Clean Start with Real Solana Integration
REM ========================================================

echo.
echo ========================================================
echo TRADEFORCE AI - REAL SOLANA DEVNET INTEGRATION
echo ========================================================
echo.

REM Stop all running processes first
echo [1/10] Stopping all running processes...
call stop-tradeforce-ai.bat
timeout /t 2 /nobreak >nul

REM Clean the environment
echo [2/10] Deep cleaning development environment...
rmdir /S /Q ".next" 2>nul
rmdir /S /Q "node_modules\.cache" 2>nul
del /S /Q ".\lib\*.log" 2>nul
npm cache clean --force --loglevel=error

REM Clear any wallet-related local storage
echo [3/10] Clearing mock wallet data...
echo const fs = require('fs'); > clear-mock-wallets.js
echo const path = require('path'); >> clear-mock-wallets.js
echo console.log('Clearing mock wallet data...'); >> clear-mock-wallets.js
echo if (typeof window !== 'undefined' && window.localStorage) { >> clear-mock-wallets.js
echo   localStorage.removeItem('mock_wallets'); >> clear-mock-wallets.js
echo   localStorage.removeItem('test_wallets'); >> clear-mock-wallets.js
echo   localStorage.removeItem('connected_wallets'); >> clear-mock-wallets.js
echo   localStorage.removeItem('current_wallet'); >> clear-mock-wallets.js
echo } else { >> clear-mock-wallets.js
echo   const testWalletsPath = path.join(process.cwd(), 'public', 'test-wallets.json'); >> clear-mock-wallets.js
echo   if (fs.existsSync(testWalletsPath)) { >> clear-mock-wallets.js
echo     fs.unlinkSync(testWalletsPath); >> clear-mock-wallets.js
echo     console.log('Removed test-wallets.json file'); >> clear-mock-wallets.js
echo   } >> clear-mock-wallets.js
echo   console.log('Environment cleaned of mock wallet data'); >> clear-mock-wallets.js
echo } >> clear-mock-wallets.js
node clear-mock-wallets.js
del clear-mock-wallets.js

REM Install or update dependencies
echo [4/10] Checking Solana dependencies...
npm list @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo Installing required Solana dependencies...
  npm install --save @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-wallets @solana/wallet-adapter-base bs58
)

REM Configure Solana devnet environment
echo [5/10] Setting up Solana devnet configuration...
echo SOLANA_NETWORK=devnet > .env.local
echo SOLANA_RPC_URL=https://api.devnet.solana.com >> .env.local
echo SOLANA_EXPLORER=https://explorer.solana.com >> .env.local
echo SOLANA_WEBSOCKET=wss://api.devnet.solana.com/ >> .env.local
echo USE_REAL_SOLANA_WALLET=true >> .env.local
echo ENABLE_MOCK_DATA=false >> .env.local
echo.

REM Update wallet configuration
echo [6/10] Updating wallet configuration for real wallets...
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
echo Wallet configuration updated.

REM Start required MCP servers
echo [7/10] Starting required MCP servers...
start cmd /c "title MCP Token Discovery && node mcp/token-discovery/server.js --devnet"
start cmd /c "title MCP Shyft Data && node mcp/shyft/server.js --devnet"
echo MCP servers started in devnet mode.
timeout /t 3 /nobreak >nul

REM Create logs directory if it doesn't exist
echo [8/10] Setting up logging infrastructure...
mkdir logs 2>nul
type nul > logs\solana-devnet-integration.log
echo Logging setup complete.

REM Start the web server with enhanced debugging
echo [9/10] Starting web server with real Solana devnet integration...
echo.
echo ******************************************************
echo *                                                    *
echo *  Starting TradeForce AI with REAL Solana devnet    *
echo *                                                    *
echo *  - Connect your actual Solana wallet               *
echo *  - Sign validation messages when prompted          *
echo *  - The Results tab will show your real txns        *
echo *  - No minimum transaction count required           *
echo *                                                    *
echo ******************************************************
echo.

start cmd /k "title TradeForce AI - Real Solana Integration && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && npm run dev"

REM Verify configuration
echo [10/10] Verifying Solana integration configuration...
node verify-solana-integration.cjs
IF %ERRORLEVEL% NEQ 0 (
  echo.
  echo WARNING: Solana integration verification failed.
  echo Press any key to continue anyway or Ctrl+C to abort...
  pause >nul
)

REM Log startup time
echo Startup completed at %time% on %date%

REM Final instructions
echo.
echo Waiting for application to start...
timeout /t 10 /nobreak
start "" "http://localhost:3000"

echo.
echo ========================================================
echo TRADEFORCE AI - REAL SOLANA INTEGRATION READY
echo ========================================================
echo.
echo Application is running with:
echo - Solana Devnet: ENABLED
echo - Mock Data: DISABLED
echo - Wallet Validation: REQUIRED (signature only)
echo - Transaction Requirement: NONE (any wallet works)
echo.
echo NOTE: You must connect a real Solana wallet to see trade data.
echo       The Results tab requires wallet validation.
echo.
echo Application URL: http://localhost:3000
echo Documentation: See docs/SOLANA_INTEGRATION.md
echo.
