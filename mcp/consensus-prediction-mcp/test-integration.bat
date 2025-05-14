@echo off
echo Testing Consensus Prediction MCP Integration...

REM Check if .env file exists
if not exist .env (
  echo Error: .env file not found.
  echo Please create a .env file by copying .env.example and updating the values.
  echo Example command: copy .env.example .env
  exit /b 1
)

REM Check if integration-example.js exists
if not exist integration-example.js (
  echo Error: integration-example.js file not found.
  exit /b 1
)

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

REM Run the integration example
echo Running integration example...
node integration-example.js

REM If the script exits with an error, pause to see the error message
if %ERRORLEVEL% neq 0 (
  echo.
  echo Integration test exited with error code %ERRORLEVEL%
  pause
  exit /b %ERRORLEVEL%
)
