@echo off
echo Starting TradeForce AI Backtesting System...

cd /d %~dp0
echo Current directory: %CD%

echo Installing any missing dependencies...
call npm install --no-fund --no-audit

echo Starting the development server...
start http://localhost:3000/backtesting
call npm run dev

echo Backtesting system started successfully!
echo Navigate to http://localhost:3000/backtesting in your browser if it doesn't open automatically.
pause
