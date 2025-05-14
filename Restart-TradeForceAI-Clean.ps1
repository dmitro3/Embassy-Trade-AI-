# TradeForce AI Clean Restart - PowerShell Script
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "TradeForce AI Clean Restart Script" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor White
Write-Host "1. Kill any running Node.js processes" -ForegroundColor White
Write-Host "2. Clear temporary files and caches" -ForegroundColor White
Write-Host "3. Install/update dependencies" -ForegroundColor White
Write-Host "4. Start TradeForce AI in development mode" -ForegroundColor White
Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan

# Kill any running Node.js processes
Write-Host "Stopping any running Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Clean next.js cache
Write-Host "Cleaning Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

# Clean node_modules cache
Write-Host "Cleaning node_modules cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Check port availability and kill processes if needed
$port = 3008
Write-Host "Checking if port $port is in use..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    Write-Host "Port $port is in use. Terminating processes..." -ForegroundColor Red
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess
        Write-Host "Killing process: $($process.Name) (PID: $($process.Id))" -ForegroundColor Red
        Stop-Process -Id $conn.OwningProcess -Force
    }
    Start-Sleep -Seconds 2
}

# Start the servers in a new PowerShell window
Write-Host "Starting backend servers..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD'; npm run start-server"
Start-Sleep -Seconds 3

# Start the application
Write-Host "Starting TradeForce AI..." -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The application should now be starting..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the application." -ForegroundColor Yellow
Write-Host ""
Write-Host "If you encounter any errors, please report them for analysis." -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

npm run tradeforce-ai

# Check if the application started successfully
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error starting TradeForce AI. Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Check the logs for more information." -ForegroundColor Red
} else {
    Write-Host "TradeForce AI started successfully!" -ForegroundColor Green
}
