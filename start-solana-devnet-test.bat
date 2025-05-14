@echo off
REM ========================================================
REM TradeForce AI Clean Start Script for Solana Devnet Testing
REM ========================================================

echo Starting clean restart for Solana Devnet testing...

REM Stop all running processes
echo.
echo Stopping all running processes...
call stop-tradeforce-ai.bat

REM Clear cache
echo.
echo Clearing npm cache...
npm cache clean --force

REM Clear local storage for MCP servers
echo.
echo Clearing local storage and caches...
rmdir /S /Q ".next" 2>nul
rmdir /S /Q ".cache" 2>nul
rmdir /S /Q "node_modules/.cache" 2>nul

REM Get API keys from .env file if it exists
echo.
echo Setting up Solana Devnet configuration...
SET SOLANA_API_URL=https://api.devnet.solana.com

REM Install dependencies
echo.
echo Installing dependencies...
npm install

REM Start MCP servers
echo.
echo Starting MCP servers in debug mode...
call start-mcp-servers.bat debug

REM Start Solana local validator (if needed)
REM Uncomment this line to start a local validator for testing
REM echo Starting Solana local validator...
REM start cmd /k "npx solana-test-validator"

REM Setup wallet configuration for real blockchain data
echo.
echo Setting up wallet configuration for real blockchain data...
echo const fs = require('fs'); > setup-wallet-config.js
echo const path = require('path'); >> setup-wallet-config.js

echo // Create wallet config file >> setup-wallet-config.js
echo const walletConfigPath = path.join(process.cwd(), 'lib', 'walletConfig.js'); >> setup-wallet-config.js
echo const walletConfig = `/** >> setup-wallet-config.js
echo  * Wallet Configuration for TradeForce AI >> setup-wallet-config.js
echo  * >> setup-wallet-config.js
echo  * Real Solana integration with devnet support >> setup-wallet-config.js
echo  * Updated for enhanced blockchain data fetching >> setup-wallet-config.js
echo  */ >> setup-wallet-config.js
echo export const WALLET_CONFIG = { >> setup-wallet-config.js
echo   // Connection settings >> setup-wallet-config.js
echo   networkEndpoint: 'https://api.devnet.solana.com', >> setup-wallet-config.js
echo   connectionConfig: { >> setup-wallet-config.js
echo     commitment: 'confirmed', >> setup-wallet-config.js
echo     maxSupportedTransactionVersion: 0 >> setup-wallet-config.js
echo   }, >> setup-wallet-config.js
echo   >> setup-wallet-config.js
echo   // Wallet validation >> setup-wallet-config.js
echo   requireSignature: true, >> setup-wallet-config.js
echo   minTransactions: 0, // No minimum requirement for testing >> setup-wallet-config.js
echo   validationMode: true, >> setup-wallet-config.js
echo   persistSignatures: true, >> setup-wallet-config.js
echo   >> setup-wallet-config.js
echo   // Data settings >> setup-wallet-config.js
echo   enableMockData: false, // Use real blockchain data only >> setup-wallet-config.js
echo   fetchLimit: 50,        // Limit transactions fetched per wallet >> setup-wallet-config.js
echo   refreshInterval: 60000, // 1 minute refresh interval >> setup-wallet-config.js
echo   >> setup-wallet-config.js
echo   // Performance >> setup-wallet-config.js
echo   logPerformanceMetrics: true, >> setup-wallet-config.js
echo   >> setup-wallet-config.js
echo   // Wallet support >> setup-wallet-config.js
echo   allowedWallets: ['Phantom', 'Solflare', 'Slope', 'Sollet', 'Backpack'] >> setup-wallet-config.js
echo }; >> setup-wallet-config.js
echo `; >> setup-wallet-config.js

echo // Write wallet config >> setup-wallet-config.js
echo fs.writeFileSync(walletConfigPath, walletConfig); >> setup-wallet-config.js
echo console.log('Wallet configuration created for real Solana data at lib/walletConfig.js'); >> setup-wallet-config.js

echo // Setup demo test wallets for convenience >> setup-wallet-config.js
echo const testWallets = [ >> setup-wallet-config.js
echo   "7FzXBBPjzrNJbm9MrZKZcyvP3cqbMrLgqqiEWQD9rz2E", >> setup-wallet-config.js
echo   "5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8" >> setup-wallet-config.js
echo ]; >> setup-wallet-config.js
echo const walletData = JSON.stringify(testWallets); >> setup-wallet-config.js
echo fs.writeFileSync(path.join(process.cwd(), 'public', 'test-wallets.json'), walletData); >> setup-wallet-config.js
echo console.log('Test wallet information saved to public/test-wallets.json'); >> setup-wallet-config.js

node setup-wallet-config.js
del setup-wallet-config.js

REM Start the web server with additional debugging
echo.
echo Starting web server in debug mode...
start cmd /k "set DEBUG=solana:*,tradeforce:* && npm run dev"

REM Log the startup time
echo Startup completed at %time% on %date%

REM Open browser after a delay
timeout /t 10 /nobreak
start "" "http://localhost:3008"

echo.
echo TradeForce AI started with Solana Devnet integration! Running in test mode.
echo.
