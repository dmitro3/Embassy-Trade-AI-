# Solve Port Conflicts and Start TradeForce AI
# This script terminates any existing Node processes and starts TradeForce AI with the correct port

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "TRADEFORCE AI - PORT CONFLICT RESOLUTION" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host ""

# Function to check if a port is in use
function Test-PortInUse {
    param(
        [int]$Port
    )
    
    try {
        $tcpConnections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($tcpConnections) {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

# Function to kill process using a specific port
function Kill-ProcessUsingPort {
    param(
        [int]$Port
    )
    
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                $processName = (Get-Process -Id $processId -ErrorAction SilentlyContinue).ProcessName
                
                Write-Host "   Found process $processName (PID: $processId) using port $Port" -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "   Killed process $processId" -ForegroundColor Green
            }
            return $true
        }
        return $false
    } catch {
        Write-Host "   Error finding processes using port $Port: $_" -ForegroundColor Red
        return $false
    }
}

# Step 1: Stop all existing Node.js processes
Write-Host "1. Stopping existing Node.js processes..." -ForegroundColor Cyan

$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
if ($nodeProcesses) {
    Write-Host "   Found $($nodeProcesses.Count) Node.js processes running" -ForegroundColor Yellow
    foreach ($process in $nodeProcesses) {
        try {
            Stop-Process -Id $process.Id -Force
            Write-Host "   Stopped process $($process.Id)" -ForegroundColor Gray
        } catch {
            Write-Host "   Failed to stop process $($process.Id): $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   No Node.js processes found running" -ForegroundColor Green
}

# Step 2: Check for processes using key ports (3008 and 4001)
Write-Host ""
Write-Host "2. Checking for processes using required ports..." -ForegroundColor Cyan

# Check for port 3008 (Next.js web server)
Write-Host "   Checking port 3008 (Web server)..." -ForegroundColor White
if (Test-PortInUse -Port 3008) {
    $killed = Kill-ProcessUsingPort -Port 3008
    if ($killed) {
        Write-Host "   ✓ Successfully freed port 3008" -ForegroundColor Green
    } else {
        Write-Host "   ! Warning: Port 3008 is still in use" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✓ Port 3008 is available" -ForegroundColor Green
}

# Check for port 4001 (API server)
Write-Host "   Checking port 4001 (API server)..." -ForegroundColor White
if (Test-PortInUse -Port 4001) {
    $killed = Kill-ProcessUsingPort -Port 4001
    if ($killed) {
        Write-Host "   ✓ Successfully freed port 4001" -ForegroundColor Green
    } else {
        Write-Host "   ! Warning: Port 4001 is still in use" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✓ Port 4001 is available" -ForegroundColor Green
}

# Double check for any remaining port issues with netstat
$remainingPortConflicts = netstat -ano | findstr ":3008|:4001" | findstr "LISTENING" | Out-String
if ($remainingPortConflicts) {
    Write-Host "   ! Some port conflicts may still exist:" -ForegroundColor Yellow
    Write-Host $remainingPortConflicts -ForegroundColor Gray
}

# Step 3: Check environment
Write-Host ""
Write-Host "3. Checking environment..." -ForegroundColor Cyan

# Check for .next directory and clean if needed
if (Test-Path ".next") {
    Write-Host "   Cleaning .next directory..." -ForegroundColor Yellow
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

# Update wallet configuration
Write-Host ""
Write-Host "4. Updating wallet configuration..." -ForegroundColor Cyan
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
Write-Host "   Wallet configuration updated successfully" -ForegroundColor Green

# Step 5: Set up environment variables
Write-Host ""
Write-Host "5. Setting environment variables..." -ForegroundColor Cyan
$envSettings = @"
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_EXPLORER=https://explorer.solana.com
SOLANA_WEBSOCKET=wss://api.devnet.solana.com/
USE_REAL_SOLANA_WALLET=true
ENABLE_MOCK_DATA=false
"@
$envSettings | Out-File -FilePath ".env.local" -Encoding utf8 -Force
Write-Host "   Environment variables set" -ForegroundColor Green

# Step 6: Start MCP servers
Write-Host ""
Write-Host "6. Starting MCP servers..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Token Discovery && node mcp/token-discovery/server.js --devnet" -WindowStyle Normal
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title MCP Shyft Data && node mcp/shyft/server.js --devnet" -WindowStyle Normal
Start-Sleep -Seconds 2
Write-Host "   MCP servers started" -ForegroundColor Green

# Step 7: Start application
Write-Host ""
Write-Host "7. Starting TradeForce AI application..." -ForegroundColor Cyan

# Set environment variables
$env:DEBUG = "solana:*,tradeforce:*"
$env:USE_REAL_SOLANA_WALLET = "true"
$env:ENABLE_MOCK_DATA = "false"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "TRADEFORCE AI - STARTING WITH CORRECT PORT (3008)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application will be available at: http://localhost:3008" -ForegroundColor Cyan
Write-Host "Please wait while the application starts..." -ForegroundColor White
Write-Host ""

# Start the application process
$startTime = Get-Date
Write-Host "Starting application at $startTime..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c title TradeForce AI - Real Solana && set DEBUG=solana:*,tradeforce:* && set USE_REAL_SOLANA_WALLET=true && set ENABLE_MOCK_DATA=false && npm run dev" -WindowStyle Normal

# Wait for application to start and verify port availability
Write-Host "Waiting for application to start..." -ForegroundColor Yellow
$maxWaitSeconds = 30
$isPortActive = $false

for ($i = 0; $i -lt $maxWaitSeconds; $i++) {
    if ($i % 5 -eq 0 -and $i -gt 0) {
        Write-Host " $i seconds" -NoNewline -ForegroundColor Gray
    } else {
        Write-Host "." -NoNewline
    }
    
    # Check if port 3008 is now active
    if ((Get-NetTCPConnection -LocalPort 3008 -ErrorAction SilentlyContinue).Count -gt 0) {
        $isPortActive = $true
        $elapsedTime = (Get-Date) - $startTime
        Write-Host "`nDetected application running on port 3008 after $($elapsedTime.TotalSeconds.ToString("0.0")) seconds" -ForegroundColor Green
        break
    }
    
    Start-Sleep -Seconds 1
}

# Check if application started successfully
if ($isPortActive) {
    # Open browser
    Write-Host "Opening browser to http://localhost:3008..." -ForegroundColor Cyan
    Start-Process "http://localhost:3008"
    
    Write-Host "`nApplication started successfully!" -ForegroundColor Green
    Write-Host "Connect your Solana wallet to access the Results tab." -ForegroundColor White
} else {
    Write-Host "`nWarning: Could not detect application running on port 3008 after $maxWaitSeconds seconds" -ForegroundColor Yellow
    Write-Host "The application might still be starting. Try manually opening: http://localhost:3008" -ForegroundColor Yellow
    
    # Try to open browser anyway
    Start-Process "http://localhost:3008"
}
