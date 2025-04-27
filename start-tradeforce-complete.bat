@echo off
echo ========================================================
echo   TradeForce AI - Complete Development Environment
echo ========================================================
echo.

REM Set colors for better visibility
color 0A

REM Kill any existing Node.js processes that might be running servers
echo Stopping any existing Node.js processes...
taskkill /F /IM node.exe /T 2>nul
echo.

REM Kill any existing Python processes (for MCP servers if they use Python)
echo Stopping any existing Python processes...
taskkill /F /IM python.exe /T 2>nul
echo.

REM Clean temporary files
echo Cleaning temporary files...
if exist ".next" (
    rmdir /S /Q .next
    echo - Removed .next directory
)

REM Create necessary directories for MCP servers
echo Ensuring MCP directories exist...
if not exist "mcp\token-discovery-mcp\config" mkdir "mcp\token-discovery-mcp\config"
if not exist "mcp\shyft-data-mcp\config" mkdir "mcp\shyft-data-mcp\config"
echo.

REM Create default configuration files if they don't exist
echo Setting up default configurations...
if not exist "mcp\token-discovery-mcp\config\user-config.json" (
    echo {^
    "scanInterval": 15,^
    "filters": {^
        "birdeye": {^
            "minLiquidity": 2000,^
            "maxLiquidity": 300000,^
            "minHolders": 15,^
            "maxAgeHours": 72,^
            "minPriceChangePercent": 5,^
            "riskTolerance": "moderate"^
        },^
        "dexscreener": {^
            "minLiquidity": 2000,^
            "maxLiquidity": 300000,^
            "minPriceChange": 10,^
            "minVolume": 1000,^
            "excludedDexes": []^
        },^
        "pumpfun": {^
            "maxAgeHours": 24,^
            "minHolders": 20,^
            "minLiquidity": 5000,^
            "maxLiquidity": 500000,^
            "minPriceChangePercent": 10,^
            "minBuyRatio": 1.5,^
            "riskTolerance": "moderate"^
        }^
    },^
    "sources": {^
        "birdeye": true,^
        "dexscreener": true,^
        "pumpfun": true^
    },^
    "advanced": {^
        "scoreThreshold": 65,^
        "maxResults": 50,^
        "autoRefresh": true,^
        "notifications": true^
    }^
} > "mcp\token-discovery-mcp\config\user-config.json"
    echo - Created token discovery config
)
echo.

REM Test environment
echo Testing environment...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found. Please install Node.js.
    goto :error
)
echo - Node.js is installed
echo.

REM Install dependencies if needed
echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 goto :error
)
echo - Dependencies are installed
echo.

REM Start MCP servers in separate windows
echo ========================================================
echo               Starting MCP Servers
echo ========================================================

REM Start Token Discovery MCP server
echo Starting Token Discovery MCP server...
start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && if exist server.js (node server.js) else (echo ERROR: server.js not found && pause)"
ping 127.0.0.1 -n 3 > nul
echo - Token Discovery MCP server started

REM Start SHYFT Data MCP server (if exists)
echo Starting SHYFT Data MCP server...
if exist "mcp\shyft-data-mcp\server.js" (
    start "SHYFT Data MCP" cmd /c "cd mcp\shyft-data-mcp && node server.js"
    echo - SHYFT Data MCP server started
    ping 127.0.0.1 -n 3 > nul
) else (
    echo - SHYFT Data MCP server not found, skipping
)
echo.

REM Start backend server (if exists)
echo ========================================================
echo               Starting Backend Server
echo ========================================================
if exist "backend\server.js" (
    start "Backend Server" cmd /c "cd backend && node server.js"
    echo - Backend server started
    ping 127.0.0.1 -n 3 > nul
) else if exist "server.js" (
    start "Backend Server" cmd /c "node server.js"
    echo - Backend server started
    ping 127.0.0.1 -n 3 > nul
) else (
    echo - No dedicated backend server found, continuing
)
echo.

REM Wait a bit longer for servers to properly initialize
echo Waiting for all servers to initialize...
timeout /t 7 /nobreak > nul
echo.

REM Start Next.js development server
echo ========================================================
echo           Starting Next.js Frontend Server
echo ========================================================
echo.
echo Starting Next.js development server...
start "Next.js Dev Server" cmd /c "npm run dev"
echo - Next.js development server started
echo.

echo ========================================================
echo      🚀 TradeForce AI Development Environment Ready!
echo ========================================================
echo.
echo Your application is now available at: http://localhost:3008/tradeforce
echo.
echo The following services are running:
echo - Next.js Frontend (http://localhost:3008)
echo - Token Discovery MCP (http://localhost:3002)
echo - SHYFT Data MCP (if available) (http://localhost:3001)
echo - Backend Server (if available)
echo.
echo Press any key to shut down all servers and exit...
pause > nul

:shutdown
echo.
echo ========================================================
echo           Shutting down all services...
echo ========================================================
echo.
taskkill /F /IM node.exe /T 2>nul
echo All services stopped.
goto :end

:error
echo.
echo ========================================================
echo           ERROR: Startup failed!
echo ========================================================
echo.
echo Press any key to exit...
pause > nul

:end
color 07
echo.
echo ========================================================
echo           Development environment closed
echo ========================================================
