@echo off
REM Test Solana wallet connection for TradeForce AI

echo ===== TradeForce AI - Solana Wallet Connection Test =====
echo.
echo This script will test your Solana wallet connection and
echo transaction fetching capabilities for TradeForce AI.
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed or not in your PATH
  echo Please install Node.js before continuing.
  echo.
  pause
  exit /b 1
)

REM Check if script exists
if not exist "test-solana-wallet-connection.js" (
  echo ERROR: test-solana-wallet-connection.js not found
  echo Please make sure you're running this script from the project root.
  echo.
  pause
  exit /b 1
)

REM Run the test script
echo Running Solana wallet connection test...
echo.
node test-solana-wallet-connection.js

echo.
echo Test complete!
echo.
pause
