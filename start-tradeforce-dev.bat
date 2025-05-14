@echo off
echo Starting TradeForce AI Trading System Development Environment...
echo.

REM Set environment variables
set NEXT_PUBLIC_SHYFT_API_KEY=whv00T87G8Sd8TeK
set NEXT_PUBLIC_BIRDEYE_API_KEY=67f8ce614c594ab2b3efb742f8db69db
set NEXT_PUBLIC_PHOTON_PRIVATE_KEY=38HQ8wNk38Q4VCfrSfESGgggoefgPF9kaeZbYvLC6nKqGTLnQN136CLRiqi6e68yppFB5ypjwzjNCTdjyoieiQQe

REM Start MCP servers in separate windows
echo Starting Token Discovery MCP Server...
start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && npm start"

REM Wait for MCP servers to start
timeout /t 5 /nobreak > nul

REM Start Next.js development server
echo Starting Next.js Development Server...
start "Next.js Dev Server" cmd /c "npm run dev"

REM Open browser after a delay
timeout /t 10 /nobreak > nul
echo Opening TradeForce in browser...
start http://localhost:3008/tradeforce

echo.
echo TradeForce AI Trading System Development Environment started successfully!
echo.
echo Press any key to stop all servers...
pause > nul

REM Kill all processes
echo Stopping all servers...
taskkill /f /im node.exe > nul 2>&1

echo.
echo TradeForce AI Trading System Development Environment stopped successfully!
timeout /t 3 /nobreak > nul
