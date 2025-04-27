@echo off
echo Setting up EmbassyTrade development environment...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python is not installed. Please install Python from https://www.python.org/downloads/
    exit /b 1
)

REM Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install Node.js dependencies.
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
cd backend
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo Failed to install Python dependencies.
    exit /b 1
)
cd ..

echo.
echo Setup completed successfully!
echo.
echo To start the application, run:
echo   .\start-servers.bat
echo.
echo This will start both the Flask server (port 5000) and the Next.js server (port 3008).
echo You can then access the application at http://localhost:3008/tradeform
echo.
