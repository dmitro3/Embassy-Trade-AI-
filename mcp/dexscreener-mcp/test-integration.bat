@echo off
echo Testing DEXScreener MCP Server Integration...
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

REM Check if server is running
echo Checking if server is running...
curl -s http://localhost:3002/mcp-config >nul
if %ERRORLEVEL% neq 0 (
  echo Server is not running. Please start the server first with start-server.bat
  exit /b 1
)

REM Run the integration example
echo Running integration example...
node integration-example.js

REM If we get here, the integration example completed
echo.
echo DEXScreener MCP Server integration example completed.
