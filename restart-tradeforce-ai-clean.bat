@echo off
echo ===================================================
echo TradeForce AI Clean Restart Script
echo ===================================================
echo.
echo This script will:
echo 1. Kill any running Node.js processes
echo 2. Clear temporary files and caches
echo 3. Install/update dependencies
echo 4. Start TradeForce AI in development mode
echo.
echo ===================================================

REM Kill any running Node.js processes
echo Stopping any running Node.js processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

REM Clean npm cache
echo Clearing npm cache...
call npm cache clean --force

REM Clean next.js cache
echo Cleaning Next.js cache...
if exist ".next" (
  rmdir /S /Q .next
)

REM Clean node_modules cache
echo Cleaning node_modules cache...
if exist "node_modules\.cache" (
  rmdir /S /Q node_modules\.cache
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Start the servers
echo Starting backend servers...
start cmd /k "npm run start-server"
timeout /t 3 /nobreak >nul

REM Start the application in development mode
echo Starting TradeForce AI...
echo ===================================================
echo.
echo The application should now be starting...
echo Press Ctrl+C to stop the application.
echo.
echo If you encounter any errors, please check the console output.
echo ===================================================
echo.

call npm run tradeforce-ai
