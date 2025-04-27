@echo off
echo Starting EmbassyTrade servers...

REM Create a new terminal window for the Flask server
start cmd /k "cd backend && python flask_server.py"

REM Wait a moment for the Flask server to start
timeout /t 2 > nul

REM Start the Node.js server in this terminal
echo Starting Node.js server...
call .\start-dev.bat

echo Both servers are now running.
