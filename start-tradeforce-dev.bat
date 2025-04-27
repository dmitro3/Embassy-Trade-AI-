@echo off
echo Starting TradeForce AI Development Environment...
echo.

REM Start MCP servers in separate windows
echo Starting MCP Servers...
start "MCP Servers" cmd /c "start-mcp-servers.bat"

REM Wait a moment for MCP servers to initialize
echo Waiting for MCP servers to initialize...
timeout /t 5 /nobreak > nul

REM Start Next.js development server
echo Starting Next.js development server...
start "Next.js Dev Server" cmd /c "npm run dev"

echo.
echo TradeForce AI Development Environment started!
echo.
echo - MCP Servers are running in a separate window
echo - Next.js Dev Server is running in a separate window
echo.
echo You can now access your application at: http://localhost:3008/tradeforce
echo.
