@echo off
echo === Embassy Trade Deep Clean and Rebuild ===
echo.

echo Stopping all running processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3008') do (
    echo Terminating process %%a using port 3008
    taskkill /F /PID %%a
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Terminating process %%a using port 5000
    taskkill /F /PID %%a
)

echo Clearing Next.js cache...
if exist .next rmdir /s /q .next

echo Clearing node_modules cache...
if exist node_modules\\.cache rmdir /s /q node_modules\\.cache

echo Rebuilding dependencies...
npm run build

echo Starting MongoDB...
rem Uncomment the following line if MongoDB is installed as a service
rem net start MongoDB

echo Starting Node.js backend server...
start "Embassy Trade Backend Server" cmd /k "cd backend && node server.js"

echo Starting Flask backend server...
start "Embassy Trade Flask Server" cmd /k "cd backend && python flask_server.py"

echo Waiting for backend servers to initialize...
timeout /t 5 /nobreak

echo Starting frontend server in development mode...
start "Embassy Trade Frontend Server" cmd /k "npm run dev"

echo.
echo Development servers started successfully with clean environment!
echo - Backend running on http://localhost:5000
echo - Frontend running on http://localhost:3008
echo.
echo Press any key to exit this script...
pause >nul
