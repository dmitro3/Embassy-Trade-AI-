@echo off
echo ===================================================
echo    TRADEFORCE AI LIGHTWEIGHT STARTUP
echo ===================================================
echo.
echo This script will start TradeForce AI with minimal external dependencies.
echo.
echo ===================================================

REM Create necessary directories
if not exist "logs" mkdir "logs"
if not exist "data" mkdir "data"
if not exist "config" mkdir "config"

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
if %errorlevel% neq 0 (
    echo Failed to check or install dependencies.
    echo Continuing with minimal setup...
)

REM Create minimal .env.local file if it doesn't exist
if not exist ".env.local" (
    echo Creating minimal .env.local file...
    echo SHYFT_API_KEY=whv00T87G8Sd8TeK> .env.local
    echo BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db>> .env.local
    echo SOLANA_NETWORK=devnet>> .env.local
    echo MONGODB_URI=mongodb+srv://tradeforce:tradeforceAI2025@cluster0.mongodb.net/tradeforce?retryWrites=true^&w=majority>> .env.local
    echo REDIS_URL=redis://redis-12345.redis-cloud.com:12345>> .env.local
)

REM Start MCP servers
echo Starting MCP servers...
call start-mcp-servers.bat
if %errorlevel% neq 0 (
    echo Warning: Some MCP servers may not have started correctly.
    echo Continuing with available services...
)

REM Start the development server
echo Starting TradeForce AI development server...
start "TradeForce AI" cmd /c "npm run dev"

REM Wait for the server to start
echo Waiting for the server to start...
timeout /t 10 > nul

REM Open the TradeForce AI dashboard in the default browser
echo Opening TradeForce AI dashboard...
start http://localhost:3008/tradeforce-ai

echo ===================================================
echo TradeForce AI has been started with the available components!
echo You can access the dashboard at: http://localhost:3008/tradeforce-ai
echo ===================================================
echo.
echo Press any key to stop all services when you're done...
pause > nul

REM Stop services when the user presses a key
echo Stopping services...
taskkill /FI "WINDOWTITLE eq *MCP*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq *TradeForce AI*" /F > nul 2>&1
echo Services stopped.
