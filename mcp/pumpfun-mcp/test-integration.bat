@echo off
echo Running Pump.fun MCP Server Integration Example...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH. Please install Node.js and try again.
    exit /b 1
)

:: Check if server is running
set SERVER_PORT=3001
if defined PORT (
    set SERVER_PORT=%PORT%
)

:: Try to connect to the server
curl -s http://localhost:%SERVER_PORT%/health >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Pump.fun MCP Server is not running on port %SERVER_PORT%.
    echo Please start the server first using start-server.bat.
    exit /b 1
)

:: Run the integration example
echo Running integration example...
node integration-example.js

:: Check if integration example passed
if %ERRORLEVEL% neq 0 (
    echo Integration example failed. Please check the error messages above.
    exit /b 1
)

echo Integration example completed successfully!
pause
