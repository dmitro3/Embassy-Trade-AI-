@echo off
echo Starting TradeForce AI Trading System Complete Environment...
echo.

REM Set environment variables
set NEXT_PUBLIC_SHYFT_API_KEY=whv00T87G8Sd8TeK
set NEXT_PUBLIC_BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db
set NEXT_PUBLIC_PHOTON_PRIVATE_KEY=38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe

REM Start MCP servers in separate windows
echo Starting Token Discovery MCP Server...
start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && npm start"

echo Starting Pump.fun MCP Server...
if exist "mcp\pumpfun-mcp" (
  start "Pump.fun MCP" cmd /c "cd mcp\pumpfun-mcp && npm start"
) else (
  echo Pump.fun MCP Server not found. Skipping...
)

echo Starting DEXScreener MCP Server...
if exist "mcp\dexscreener-mcp" (
  start "DEXScreener MCP" cmd /c "cd mcp\dexscreener-mcp && npm start"
) else (
  echo DEXScreener MCP Server not found. Skipping...
)

echo Starting Jupiter Aggregation MCP Server...
if exist "mcp\jupiter-mcp" (
  start "Jupiter MCP" cmd /c "cd mcp\jupiter-mcp && npm start"
) else (
  echo Jupiter MCP Server not found. Skipping...
)

echo Starting Raydium Swaps MCP Server...
if exist "mcp\raydium-mcp" (
  start "Raydium MCP" cmd /c "cd mcp\raydium-mcp && npm start"
) else (
  echo Raydium MCP Server not found. Skipping...
)

echo Starting Photon Execution MCP Server...
if exist "mcp\photon-mcp" (
  start "Photon MCP" cmd /c "cd mcp\photon-mcp && npm start"
) else (
  echo Photon MCP Server not found. Skipping...
)

echo Starting Birdeye Analytics MCP Server...
if exist "mcp\birdeye-mcp" (
  start "Birdeye MCP" cmd /c "cd mcp\birdeye-mcp && npm start"
) else (
  echo Birdeye MCP Server not found. Skipping...
)

REM Wait for MCP servers to start
echo Waiting for MCP servers to initialize...
timeout /t 10 /nobreak > nul

REM Start Next.js development server
echo Starting Next.js Development Server...
start "Next.js Dev Server" cmd /c "npm run dev"

REM Open browser after a delay
timeout /t 10 /nobreak > nul
echo Opening TradeForce in browser...
start http://localhost:3000/tradeforce

echo.
echo TradeForce AI Trading System Complete Environment started successfully!
echo.
echo Press any key to stop all servers...
pause > nul

REM Kill all processes
echo Stopping all servers...
taskkill /f /im node.exe > nul 2>&1

echo.
echo TradeForce AI Trading System Complete Environment stopped successfully!
timeout /t 3 /nobreak > nul
