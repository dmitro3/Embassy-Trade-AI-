@echo off
echo TradeForce AI Trading Agent - Extension Packager
echo ================================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: PowerShell is not available on this system.
    echo Please install PowerShell or use the npm script directly.
    exit /b 1
)

echo Packaging extension for Chrome and Firefox...
echo.

REM Run the PowerShell script with execution policy bypass
powershell -ExecutionPolicy Bypass -File .\package-extension.ps1

echo.
echo Done!
echo.
echo You can find the packaged extensions in the dist directory.
echo.
pause
