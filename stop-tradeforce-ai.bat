@echo off
echo ===================================================
echo    TRADEFORCE AI SHUTDOWN SCRIPT
echo ===================================================
echo.
echo This script will stop all services for TradeForce AI
echo in the correct order.
echo.
echo Stopping services in the following order:
echo 1. TradeForce AI Development Server
echo 2. MCP Servers
echo 3. Redis
echo 4. MongoDB
echo.
echo ===================================================

REM Find and kill the Node.js development server
echo Stopping TradeForce AI development server...
for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq TradeForce AI" /fo list ^| find "PID:"') do (
    echo Terminating process %%a...
    taskkill /PID %%a /F > nul 2>&1
)

REM Find and kill any other Node.js processes related to TradeForce
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo list ^| find "PID:"') do (
    wmic process where "ProcessID=%%a" get CommandLine | findstr "tradeforce" > nul
    if not errorlevel 1 (
        echo Terminating Node.js process %%a...
        taskkill /PID %%a /F > nul 2>&1
    )
)

REM Stop MCP servers
echo Stopping MCP servers...
for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq MCP*" /fo list ^| find "PID:"') do (
    echo Terminating MCP process %%a...
    taskkill /PID %%a /F > nul 2>&1
)

REM Stop Redis server
echo Stopping Redis server...
for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq Redis" /fo list ^| find "PID:"') do (
    echo Terminating Redis process %%a...
    taskkill /PID %%a /F > nul 2>&1
)
taskkill /F /IM redis-server.exe > nul 2>&1

REM Stop MongoDB server
echo Stopping MongoDB server...
for /f "tokens=2" %%a in ('tasklist /fi "windowtitle eq MongoDB" /fo list ^| find "PID:"') do (
    echo Terminating MongoDB process %%a...
    taskkill /PID %%a /F > nul 2>&1
)
taskkill /F /IM mongod.exe > nul 2>&1

REM Check if any browser windows are open to the TradeForce AI dashboard
echo Checking for browser windows...
tasklist /FI "IMAGENAME eq chrome.exe" > nul 2>&1
if %errorlevel% equ 0 (
    echo Please close any browser windows that may be open to the TradeForce AI dashboard.
)
tasklist /FI "IMAGENAME eq msedge.exe" > nul 2>&1
if %errorlevel% equ 0 (
    echo Please close any browser windows that may be open to the TradeForce AI dashboard.
)
tasklist /FI "IMAGENAME eq firefox.exe" > nul 2>&1
if %errorlevel% equ 0 (
    echo Please close any browser windows that may be open to the TradeForce AI dashboard.
)

echo ===================================================
echo TradeForce AI has been successfully shut down!
echo.
echo All services have been stopped. You can restart the system
echo by running:
echo   launch-tradeforce-ai.bat
echo ===================================================
