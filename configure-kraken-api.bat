@echo off
REM Configure Kraken API Keys for TradeForce AI
echo Running Kraken API Key Configuration Tool...
echo.

cd /d %~dp0
node scripts/configure-kraken-api.js

echo.
echo Configuration complete.
pause
