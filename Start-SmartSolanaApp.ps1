# Smart Start Script for TradeForce AI with Solana Integration
# This script finds available ports and starts the application

# Set strict mode to catch common errors
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-ColorText {
    param (
        [string]$Text,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Text -ForegroundColor $ForegroundColor
}

function Test-PortAvailable {
    param (
        [int]$Port
    )
    
    $result = $null
    try {
        # Try to create a listener on the port
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

function Find-AvailablePort {
    param (
        [int]$StartPort,
        [int]$MaxAttempts = 20
    )
    
    $currentPort = $StartPort
    $attempts = 0
    
    while ($attempts -lt $MaxAttempts) {
        if (Test-PortAvailable -Port $currentPort) {
            return $currentPort
        }
        $currentPort++
        $attempts++
    }
    
    # If we couldn't find an available port, return 0
    return 0
}

# Show startup banner
Clear-Host
Write-ColorText "========================================================" "Cyan"
Write-ColorText "TRADEFORCE AI - SMART START WITH SOLANA INTEGRATION" "Cyan"
Write-ColorText "========================================================" "Cyan"
Write-ColorText ""

# Find available ports
Write-ColorText "Finding available ports for application..." "Yellow"
$preferredPort = 3008
$webPort = Find-AvailablePort -StartPort $preferredPort

if ($webPort -eq 0) {
    Write-ColorText "ERROR: Could not find an available port for the web application!" "Red"
    exit 1
}

# Show port selection
if ($webPort -eq $preferredPort) {
    Write-ColorText "✓ Using preferred port $webPort for web application" "Green"
} else {
    Write-ColorText "! Preferred port $preferredPort is in use" "Yellow"
    Write-ColorText "✓ Using alternative port $webPort for web application" "Green"
}

# Update wallet configuration 
Write-ColorText "`nUpdating wallet configuration..." "Yellow"
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
Write-ColorText "✓ Wallet configuration updated" "Green"

# Update environment variables
Write-ColorText "`nSetting environment variables..." "Yellow"
$envSettings = @"
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_EXPLORER=https://explorer.solana.com
SOLANA_WEBSOCKET=wss://api.devnet.solana.com/
USE_REAL_SOLANA_WALLET=true
ENABLE_MOCK_DATA=false
WEB_PORT=$webPort
"@
$envSettings | Out-File -FilePath ".env.local" -Encoding utf8 -Force
Write-ColorText "✓ Environment variables set" "Green"

# Start MCP servers
Write-ColorText "`nStarting MCP servers..." "Yellow"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Token Discovery && node mcp/token-discovery/server.js --devnet" -WindowStyle Normal
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Shyft Data && node mcp/shyft/server.js --devnet" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-ColorText "✓ MCP servers started" "Green"

# Create modified startup command
$startCommand = "concurrently `"next dev --turbo --port $webPort`" `"npm run start-server`""

# Start application
Write-ColorText "`nStarting TradeForce AI..." "Yellow"
Write-ColorText ""
Write-ColorText "========================================================" "Green"
Write-ColorText "STARTING TRADEFORCE AI WITH PORT $webPort" "Green"
Write-ColorText "========================================================" "Green"

$startProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && set PORT=$webPort && npx $startCommand" -WindowStyle Normal -PassThru

# Wait for application to start
Write-ColorText "Waiting for application to start..." "Yellow"
$startTime = Get-Date
$maxWaitTime = 30 # seconds
$appStarted = $false

for ($i = 0; $i -lt $maxWaitTime; $i++) {
    Write-Host "." -NoNewline
    
    # Check if port is now active
    try {
        $connection = Get-NetTCPConnection -LocalPort $webPort -ErrorAction SilentlyContinue
        if ($connection) {
            $appStarted = $true
            $elapsed = (Get-Date) - $startTime
            Write-ColorText "`n✓ Application started in $($elapsed.TotalSeconds.ToString("0.0")) seconds" "Green"
            break
        }
    } catch {}
    
    # Check if process is still running
    if ($startProcess.HasExited) {
        Write-ColorText "`n! Application process has exited unexpectedly" "Red"
        break
    }
    
    Start-Sleep -Seconds 1
}

if ($appStarted) {
    # Open browser
    Write-ColorText "`nOpening browser to http://localhost:$webPort" "Cyan"
    Start-Process "http://localhost:$webPort"
    
    Write-ColorText "`n========================================================" "Green"
    Write-ColorText "TRADEFORCE AI STARTED WITH REAL SOLANA INTEGRATION" "Green"
    Write-ColorText "========================================================" "Green"
    Write-ColorText "`nApplication URL: http://localhost:$webPort" "White"
    Write-ColorText "1. Connect your Solana wallet when prompted" "White"
    Write-ColorText "2. Navigate to the Results tab to see real transaction data" "White"
} else {
    Write-ColorText "`n! Application may not have started properly" "Yellow"
    Write-ColorText "  Try opening http://localhost:$webPort manually" "Yellow"
}
