# TradeForce AI - Solana Real Integration PowerShell Script
# This script initializes TradeForce AI with real Solana devnet wallet integration

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "TRADEFORCE AI - REAL SOLANA DEVNET INTEGRATION" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# Stop any running processes first
Write-Host "[1/8] Stopping running TradeForce processes..." -ForegroundColor Yellow
if (Test-Path "stop-tradeforce-ai.bat") {
    & .\stop-tradeforce-ai.bat | Out-Null
}

# Clean environment
Write-Host "[2/8] Cleaning environment..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue }
if (Test-Path "node_modules\.cache") { Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue }
Remove-Item -Path "lib\*.log" -Force -ErrorAction SilentlyContinue

# Update wallet configuration
Write-Host "[3/8] Updating wallet configuration..." -ForegroundColor Yellow
$walletConfig = @"
// Wallet configuration - Production Mode
export const WALLET_CONFIG = {
  requireSignature: true,
  networkEndpoint: 'https://api.devnet.solana.com',
  minTransactions: 0, // No minimum transaction requirement
  enableMockData: false,
  allowedWallets: ['Phantom', 'Solflare', 'Slope', 'Sollet'],
  validationMode: true,
  persistSignatures: true,
  logPerformanceMetrics: true
};
"@

$walletConfigPath = Join-Path $PSScriptRoot "lib\walletConfig.js"
$walletConfig | Out-File -FilePath $walletConfigPath -Encoding utf8 -Force
Write-Host "  Wallet configuration updated successfully." -ForegroundColor Green

# Set up environment variables
Write-Host "[4/8] Setting environment variables..." -ForegroundColor Yellow
@"
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_EXPLORER=https://explorer.solana.com
SOLANA_WEBSOCKET=wss://api.devnet.solana.com/
USE_REAL_SOLANA_WALLET=true
ENABLE_MOCK_DATA=false
"@ | Out-File -FilePath ".env.local" -Encoding utf8 -Force

# Clear mock wallet data
Write-Host "[5/8] Clearing mock wallet data..." -ForegroundColor Yellow
$testWalletsPath = Join-Path $PSScriptRoot "public\test-wallets.json"
if (Test-Path $testWalletsPath) {
    Remove-Item -Path $testWalletsPath -Force
    Write-Host "  Removed mock wallet data." -ForegroundColor Green
}

# Start MCP servers
Write-Host "[6/8] Starting MCP servers..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Token Discovery && node mcp/token-discovery/server.js --devnet" -WindowStyle Normal
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Shyft Data && node mcp/shyft/server.js --devnet" -WindowStyle Normal
Start-Sleep -Seconds 3

# Set up environment for application
Write-Host "[7/8] Preparing to start application..." -ForegroundColor Yellow
$env:DEBUG = "solana:*,tradeforce:*"
$env:USE_REAL_SOLANA_WALLET = "true"
$env:ENABLE_MOCK_DATA = "false"

# Start the application
Write-Host "[8/8] Starting TradeForce AI application..." -ForegroundColor Yellow
Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host "  TradeForce AI with Real Solana Wallet Integration" -ForegroundColor Green
Write-Host "=======================================================`n" -ForegroundColor Green
Write-Host "Instructions:" -ForegroundColor White
Write-Host "1. Connect your Solana wallet when the application loads" -ForegroundColor White
Write-Host "2. Use the wallet to sign messages when prompted" -ForegroundColor White
Write-Host "3. Navigate to the Results tab to see your real transaction data" -ForegroundColor White
Write-Host "4. No minimum transaction count required - any wallet will work" -ForegroundColor White
Write-Host "`nStarting application now..." -ForegroundColor Yellow

Start-Process -FilePath "cmd.exe" -ArgumentList "/c title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && npm run dev" -WindowStyle Normal

# Wait for application to start and open browser
Write-Host "`nWaiting for application to start..."
for ($i = 10; $i -gt 0; $i--) {
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

Start-Process "http://localhost:3008"

Write-Host "`n`nApplication started successfully! Browser window should open automatically." -ForegroundColor Green
Write-Host "If browser doesn't open, navigate to: http://localhost:3008" -ForegroundColor White
