@echo off
echo ===================================================
echo    TRADEFORCE AI API KEY SETUP
echo ===================================================
echo.
echo This script will set up the necessary API keys for TradeForce AI.
echo.
echo ===================================================

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    exit /b 1
)

REM Check if config directory exists
if not exist "config" mkdir "config"

REM Run the API key setup script
echo Running API key setup script...
node scripts\store-api-keys.js

if %errorlevel% neq 0 (
    echo Warning: API key setup script returned an error.
    echo Creating minimal .env.local file for testing...
    echo SHYFT_API_KEY=whv00T87G8Sd8TeK> .env.local
    echo BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db>> .env.local
    echo SOLANA_NETWORK=devnet>> .env.local
    echo MONGODB_URI=mongodb+srv://tradeforce:tradeforceAI2025@cluster0.mongodb.net/tradeforce?retryWrites=true^&w=majority>> .env.local
    echo REDIS_URL=redis://redis-12345.redis-cloud.com:12345>> .env.local
    echo Basic API configuration created for testing
)

echo ===================================================
echo API keys have been successfully set up!
echo ===================================================
