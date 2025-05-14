@echo off
echo Starting Pump.fun MCP Server...

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js and try again.
    exit /b 1
)

:: Check if .env file exists
if not exist ".env" (
    echo .env file not found. Creating default .env file...
    (
        echo # Pump.fun MCP Server Environment Variables
        echo.
        echo # API Keys
        echo SHYFT_API_KEY=whv00T87G8Sd8TeK
        echo BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db
        echo PHOTON_API_KEY=38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe
        echo.
        echo # Server Configuration
        echo PORT=3001
        echo LOG_LEVEL=info
        echo TRADEFORCE_API_ENDPOINT=http://localhost:3000/api
        echo.
        echo # Risk Assessment Configuration
        echo MIN_LIQUIDITY_THRESHOLD=5000
        echo MIN_HOLDERS_THRESHOLD=10
        echo MAX_RISK_SCORE_FOR_AUTO_SNIPE=0.7
        echo.
        echo # WebSocket Configuration
        echo WEBSOCKET_MAX_RECONNECT_ATTEMPTS=10
        echo WEBSOCKET_RECONNECT_INTERVAL=5000
    ) > .env
    echo Default .env file created.
)

:: Check if node_modules directory exists
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo Failed to install dependencies. Please run 'npm install' manually.
        exit /b 1
    )
)

:: Start the server
echo Starting Pump.fun MCP Server on port %PORT%...
node index.js

:: If the server exits, pause to keep the window open
pause
