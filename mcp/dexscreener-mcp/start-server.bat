@echo off
echo Starting DEXScreener MCP Server...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

REM Check if npm packages are installed
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% neq 0 (
    echo Error: Failed to install dependencies.
    exit /b 1
  )
)

REM Start the server
echo Starting server on port 3002...
node index.js

REM If we get here, the server exited
echo.
echo DEXScreener MCP Server stopped.
