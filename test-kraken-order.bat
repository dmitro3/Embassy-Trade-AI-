@echo off
echo Testing Kraken Order Functionality...

cd /d "%~dp0"
echo Loading environment...

REM Make sure Next.js dev server is running
set PORT=3000
set IS_SERVER_RUNNING=0

netstat -ano | findstr ":%PORT%" > nul
if %ERRORLEVEL% EQU 0 (
  echo Next.js server already running on port %PORT%
  set IS_SERVER_RUNNING=1
) else (
  echo Starting Next.js server...
  start /b npm run dev
  echo Waiting for server to start...
  timeout /t 10 /nobreak > nul
)

REM Open browser to test page
echo Opening test page...
start http://localhost:3000/api/testing/kraken-order

echo.
echo Test initiated. Check the browser window for results.
echo Results will also be logged in the console and application logs.
echo.

if %IS_SERVER_RUNNING% EQU 0 (
  echo Press any key to stop the Next.js server...
  pause > nul
  echo Stopping server...
  taskkill /f /im node.exe > nul 2>&1
) else (
  echo Press any key to exit...
  pause > nul
)
