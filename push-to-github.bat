@echo off
echo "Embassy Trade Desktop App - Build and Deploy Script"

REM Get version from package.json (using findstr to extract version line)
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set VERSION=%%a
    goto :continue
)
:continue
set VERSION=%VERSION:"=%
echo Current version: v%VERSION%

REM Check if user wants to bump version
set /p BUMP_VERSION="Do you want to bump the version? (y/n): "

if /i "%BUMP_VERSION%"=="y" (
    set /p NEW_VERSION="Enter new version (current is %VERSION%): "
    echo Updating version to %NEW_VERSION%...
    
    REM This is a simple find and replace. In production, you might want a more robust solution
    powershell -Command "(Get-Content package.json) -replace '\"version\": \"%VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"
    set VERSION=%NEW_VERSION%
)

REM Build for all platforms
echo Building Electron apps for all platforms...
call npm run electron:build

echo "Adding files to Git..."
git add .

set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG="Update to v%VERSION% - Embassy AI Trading Platform"
)

echo "Committing changes with message: %COMMIT_MSG%"
git commit -m %COMMIT_MSG%

echo "Pushing to GitHub repository..."
git push origin main

REM Create GitHub release with electron-builder
echo "Creating GitHub release v%VERSION% and uploading installers..."
set GH_TOKEN_INPUT=
set /p GH_TOKEN_INPUT="Enter GitHub token for creating release (or press Enter to skip release): "

if not "%GH_TOKEN_INPUT%"=="" (
    set GH_TOKEN=%GH_TOKEN_INPUT%
    call npm run electron:publish
    echo "Release v%VERSION% published successfully!"
) else (
    echo "Skipping GitHub release. Build artifacts are available in the dist folder."
)

echo "Done!"
pause