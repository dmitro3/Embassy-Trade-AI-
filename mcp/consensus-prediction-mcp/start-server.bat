@echo off
echo Starting Consensus Prediction MCP Server...

REM Check if .env file exists
if not exist .env (
  echo Error: .env file not found.
  echo Please create a .env file by copying .env.example and updating the values.
  echo Example command: copy .env.example .env
  exit /b 1
)

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

REM Run the server
echo Starting server...
node index.js

REM If the server exits with an error, pause to see the error message
if %ERRORLEVEL% neq 0 (
  echo.
  echo Server exited with error code %ERRORLEVEL%
  pause
  exit /b %ERRORLEVEL%
)
