@echo off
echo ===================================================
echo    TRADEFORCE AI DEPENDENCY CHECKER
echo ===================================================
echo.
echo This script will check and install required dependencies
echo for the TradeForce AI system.
echo.
echo ===================================================

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    exit /b 1
)

REM Run dependency checker
echo Running dependency checker...
node scripts\check-deps.js

if %errorlevel% neq 0 (
    echo Failed to check or install dependencies.
    exit /b 1
)

echo ===================================================
echo Dependencies have been successfully checked and installed!
echo ===================================================
