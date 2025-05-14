@echo off
echo ===================================================
echo    TRADEFORCE AI LAUNCH SCRIPT
echo ===================================================
echo.
echo This script will launch all necessary services for TradeForce AI
echo and ensure all changes are saved.
echo.
echo Starting services in the following order:
echo 1. MongoDB
echo 2. Redis
echo 3. API Key Setup
echo 4. MCP Servers
echo 5. TradeForce AI Development Server
echo.
echo ===================================================

REM Create necessary directories if they don't exist
if not exist "data\db" mkdir "data\db"
if not exist "logs" mkdir "logs"

REM Check if MongoDB is installed
echo Checking MongoDB installation...
mongod --version > nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB is not installed or not in PATH.
    echo Using MongoDB connection string from environment variables instead.
    set USE_LOCAL_MONGODB=false
) else (
    set USE_LOCAL_MONGODB=true
)

REM Check if Redis is installed
echo Checking Redis installation...
redis-server --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Redis is not installed or not in PATH.
    echo Using Redis connection string from environment variables instead.
    set USE_LOCAL_REDIS=false
) else (
    set USE_LOCAL_REDIS=true
)

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    goto :error
)

REM Start MongoDB in a new terminal window if available
if "%USE_LOCAL_MONGODB%"=="true" (
    echo Starting local MongoDB instance...
    if not exist "data\db" mkdir "data\db"
    start "MongoDB" cmd /c "mongod --dbpath data\db > logs\mongodb.log 2>&1"
    timeout /t 5 > nul
) else (
    echo Using remote MongoDB instance via connection string...
    echo Make sure MONGODB_URI is set in your .env.local file
)

REM Start Redis in a new terminal window if available
if "%USE_LOCAL_REDIS%"=="true" (
    echo Starting local Redis instance...
    start "Redis" cmd /c "redis-server > logs\redis.log 2>&1"
    timeout /t 3 > nul
) else (
    echo Using remote Redis instance via connection string...
    echo Make sure REDIS_URL is set in your .env.local file
)

REM Setup API keys
echo Setting up API keys...
call scripts\store-api-keys.bat
if %errorlevel% neq 0 (
    echo Failed to set up API keys.
    goto :error
)

REM Start MCP servers
echo Starting MCP servers...
call start-mcp-servers.bat
if %errorlevel% neq 0 (
    echo Failed to start MCP servers.
    goto :error
)

REM Ensure all changes are saved
echo Ensuring all changes are saved...
copy TRADEFORCE_AI_IMPLEMENTATION_PLAN.md backup_implementation_plan.md > nul
copy TRADEFORCE_AI_TECHNICAL_SPEC.md backup_technical_spec.md > nul
copy TRADEFORCE_AI_TASK_BREAKDOWN.md backup_task_breakdown.md > nul
copy TRADEFORCE_AI_EXECUTIVE_SUMMARY.md backup_executive_summary.md > nul
copy README_TRADEFORCE_AI.md backup_readme.md > nul

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
echo TradeForce AI has been successfully launched!
echo.
echo You can access the dashboard at: http://localhost:3000/tradeforce-ai
echo.
echo To stop all services, close the terminal windows or run:
echo   stop-tradeforce-ai.bat
echo ===================================================
goto :eof

:error
echo.
echo ===================================================
echo ERROR: Failed to launch TradeForce AI.
echo Please check the logs for more information.
echo ===================================================
exit /b 1
