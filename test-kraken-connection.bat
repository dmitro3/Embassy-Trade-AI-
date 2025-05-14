@echo off
REM Test Kraken API Connection for TradeForce AI
echo Running Kraken API Connection Test...
echo.

cd /d %~dp0
node scripts/test-kraken-connection.js

echo.
echo Test complete.
pause
