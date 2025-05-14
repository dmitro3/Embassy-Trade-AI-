@echo off
echo Starting TradeForce AI Trading System...
echo.
echo This will start the TradeForce AI trading system on http://localhost:3000/tradeforce-ai
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: npm is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

REM Check if dependencies are installed
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
  )
)

REM Start the TradeForce AI system
echo Starting TradeForce AI...
echo.
echo The system will automatically open in your browser when ready.
echo If it doesn't open automatically, navigate to:
echo http://localhost:3000/tradeforce-ai
echo.
echo Press Ctrl+C to stop the server.
echo.

call npm run tradeforce-ai

REM If the server exits, pause to show any errors
pause
