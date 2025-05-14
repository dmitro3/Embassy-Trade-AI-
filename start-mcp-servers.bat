@echo off
echo ===================================================
echo    TRADEFORCE AI MCP SERVERS STARTUP
echo ===================================================
echo.
echo This script will start all MCP servers required for TradeForce AI.
echo.
echo ===================================================

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir "logs"

REM Check if .env.local exists, create a minimal version if not
if not exist ".env.local" (
    echo Creating minimal .env.local file...
    echo SHYFT_API_KEY=whv00T87G8Sd8TeK> .env.local
    echo BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db>> .env.local
    echo SOLANA_NETWORK=devnet>> .env.local
)

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    exit /b 1
)

REM Run dependency checker
echo Checking and installing required dependencies...
node scripts\check-deps.cjs

REM Start DexScreener MCP server
echo Starting DexScreener MCP server...
if exist "mcp\dexscreener-mcp" (
    start "DexScreener MCP" cmd /c "cd mcp\dexscreener-mcp && node index.js > ..\..\logs\dexscreener-mcp.log 2>&1"
    timeout /t 3 > nul
) else (
    echo DexScreener MCP server not found. Skipping...
)

REM Start Token Discovery MCP server
echo Starting Token Discovery MCP server...
if exist "mcp\token-discovery-mcp" (
    start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && node index.js > ..\..\logs\token-discovery-mcp.log 2>&1"
    timeout /t 3 > nul
) else (
    echo Token Discovery MCP server not found. Skipping...
)

REM Start PumpFun MCP server
echo Starting PumpFun MCP server...
if exist "mcp\pumpfun-mcp" (
    start "PumpFun MCP" cmd /c "cd mcp\pumpfun-mcp && node index.js > ..\..\logs\pumpfun-mcp.log 2>&1"
    timeout /t 3 > nul
) else (
    echo PumpFun MCP server not found. Skipping...
)

REM Start Shyft Data MCP server
echo Starting Shyft Data MCP server...
if exist "mcp\shyft-data-mcp" (
    start "Shyft Data MCP" cmd /c "cd mcp\shyft-data-mcp && node index.js > ..\..\logs\shyft-data-mcp.log 2>&1"
    timeout /t 3 > nul
) else (
    echo Shyft Data MCP server not found. Skipping...
)

REM Check if any MCP servers were started
echo Checking MCP server status...
tasklist /FI "WINDOWTITLE eq *MCP*" > nul 2>&1
if %errorlevel% neq 0 (
    echo No MCP servers were started. Please check the logs for errors.
    exit /b 1
)

echo ===================================================
echo MCP servers have been successfully started!
echo.
echo You can view the logs in the logs directory.
echo ===================================================
