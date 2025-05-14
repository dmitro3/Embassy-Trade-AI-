@echo off
echo Starting TradeForce AI Trading System with all MCP servers...
echo.

REM Set environment variables
set NODE_ENV=development
set PORT=3000

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Start Token Discovery MCP Server
echo Starting Token Discovery MCP Server...
start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && node index.js > ..\..\logs\token-discovery-mcp.log 2>&1"
timeout /t 3 > nul

REM Start DEXScreener MCP Server
echo Starting DEXScreener MCP Server...
start "DEXScreener MCP" cmd /c "cd mcp\dexscreener-mcp && node index.js > ..\..\logs\dexscreener-mcp.log 2>&1"
timeout /t 3 > nul

REM Start Pump.fun MCP Server
echo Starting Pump.fun MCP Server...
start "Pump.fun MCP" cmd /c "cd mcp\pumpfun-mcp && node index.js > ..\..\logs\pumpfun-mcp.log 2>&1"
timeout /t 3 > nul

REM Start SHYFT Data MCP Server
echo Starting SHYFT Data MCP Server...
start "SHYFT Data MCP" cmd /c "cd mcp\shyft-data-mcp && node index.js > ..\..\logs\shyft-data-mcp.log 2>&1"
timeout /t 3 > nul

REM Start backend server
echo Starting backend server...
start "Backend Server" cmd /c "cd backend && node server.js > ..\logs\backend.log 2>&1"
timeout /t 5 > nul

REM Start Next.js development server
echo Starting Next.js development server...
start "Next.js Dev Server" cmd /c "npm run dev > logs\nextjs.log 2>&1"
timeout /t 5 > nul

REM Open browser
echo Opening TradeForce in browser...
start http://localhost:3000/tradeforce

echo.
echo TradeForce AI Trading System started successfully!
echo.
echo MCP Servers:
echo - Token Discovery MCP: http://localhost:3001
echo - DEXScreener MCP: http://localhost:3002
echo - Pump.fun MCP: http://localhost:3003
echo - SHYFT Data MCP: http://localhost:3004
echo.
echo Backend Server: http://localhost:3008
echo Next.js Server: http://localhost:3000
echo.
echo Log files are stored in the logs directory.
echo.
echo Press any key to stop all servers...
pause > nul

REM Stop all servers
echo Stopping all servers...
taskkill /FI "WINDOWTITLE eq Token Discovery MCP*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq DEXScreener MCP*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Pump.fun MCP*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq SHYFT Data MCP*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend Server*" /F > nul 2>&1
taskkill /FI "WINDOWTITLE eq Next.js Dev Server*" /F > nul 2>&1

echo All servers stopped.
