@echo off
REM ========================================================
REM TradeForce AI - Quick Start with Real Solana Integration
REM ========================================================

echo.
echo ========================================================
echo TRADEFORCE AI - REAL SOLANA DEVNET INTEGRATION
echo ========================================================
echo.

REM Update the wallet config to use real wallets
echo import fs from 'fs'; > update-wallet-config.js
echo import path from 'path'; >> update-wallet-config.js
echo import { fileURLToPath } from 'url'; >> update-wallet-config.js
echo const __filename = fileURLToPath(import.meta.url); >> update-wallet-config.js
echo const __dirname = path.dirname(__filename); >> update-wallet-config.js
echo const walletConfigPath = path.join(__dirname, 'lib', 'walletConfig.js'); >> update-wallet-config.js
echo const walletConfig = `// Wallet configuration - Production Mode >> update-wallet-config.js
echo export const WALLET_CONFIG = { >> update-wallet-config.js
echo   requireSignature: true, >> update-wallet-config.js
echo   networkEndpoint: 'https://api.devnet.solana.com', >> update-wallet-config.js
echo   minTransactions: 0, // No minimum transaction requirement >> update-wallet-config.js
echo   enableMockData: false, >> update-wallet-config.js
echo   allowedWallets: ['Phantom', 'Solflare', 'Slope', 'Sollet'], >> update-wallet-config.js
echo   validationMode: true, >> update-wallet-config.js
echo   persistSignatures: true, >> update-wallet-config.js
echo   logPerformanceMetrics: true >> update-wallet-config.js
echo }; >> update-wallet-config.js
echo `; >> update-wallet-config.js
echo console.log('Updating wallet config...'); >> update-wallet-config.js
echo fs.writeFileSync(walletConfigPath, walletConfig, 'utf8'); >> update-wallet-config.js
echo console.log('Wallet config updated successfully.'); >> update-wallet-config.js
node update-wallet-config.js
del update-wallet-config.js

REM Clear any mock wallet data
echo import fs from 'fs'; > clear-mock-wallets.js
echo import path from 'path'; >> clear-mock-wallets.js
echo import { fileURLToPath } from 'url'; >> clear-mock-wallets.js
echo const __filename = fileURLToPath(import.meta.url); >> clear-mock-wallets.js
echo const __dirname = path.dirname(__filename); >> clear-mock-wallets.js
echo const testWalletsPath = path.join(__dirname, 'public', 'test-wallets.json'); >> clear-mock-wallets.js
echo console.log('Clearing mock wallet data...'); >> clear-mock-wallets.js
echo if (fs.existsSync(testWalletsPath)) { >> clear-mock-wallets.js
echo   console.log('Removing test-wallets.json...'); >> clear-mock-wallets.js
echo   fs.unlinkSync(testWalletsPath); >> clear-mock-wallets.js
echo } >> clear-mock-wallets.js
echo console.log('Mock wallet data cleared.'); >> clear-mock-wallets.js
node clear-mock-wallets.js
del clear-mock-wallets.js

REM Set up environment variables
echo SOLANA_NETWORK=devnet > .env.local
echo SOLANA_RPC_URL=https://api.devnet.solana.com >> .env.local
echo USE_REAL_SOLANA_WALLET=true >> .env.local
echo ENABLE_MOCK_DATA=false >> .env.local

REM Start MCP servers
echo Starting required MCP servers...
start cmd /c "title MCP Token Discovery && node mcp/token-discovery/server.js --devnet"
start cmd /c "title MCP Shyft Data && node mcp/shyft/server.js --devnet"
timeout /t 2 /nobreak >nul

REM Start the main application
echo.
echo ======================================================
echo Starting TradeForce AI with real Solana wallet support
echo ======================================================
echo.
echo Connect your Solana wallet when the application loads
echo to see your real devnet transaction data.
echo.
start cmd /k "title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && npm run dev"

REM Wait for the app to start
timeout /t 10 /nobreak
start "" "http://localhost:3008"

echo.
echo Application started with real Solana integration!
echo.
