@echo off
echo === Embassy Trade Dev Server Clean Start ===
echo.

echo Checking for processes using port 3008...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3008') do (
    echo Terminating process %%a using port 3008
    taskkill /F /PID %%a
)

echo Checking for processes using port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Terminating process %%a using port 5000
    taskkill /F /PID %%a
)

echo Cleaning Next.js cache...
if exist .next rmdir /s /q .next

echo Starting MongoDB...
rem Uncomment the following line if MongoDB is installed as a service
rem net start MongoDB

echo Starting Node.js backend server...
start "Embassy Trade Backend Server" cmd /k "cd backend && node server.js"

echo Starting Flask backend server...
start "Embassy Trade Flask Server" cmd /k "cd backend && python flask_server.py"

echo Waiting for backend servers to initialize...
timeout /t 5 /nobreak

echo Starting frontend server...
start "Embassy Trade Frontend Server" cmd /k "npm run dev"

echo.
echo Development servers started successfully!
echo - Backend running on http://localhost:5000
echo - Frontend running on http://localhost:3008
echo.
echo Press any key to exit this script...
pause >nul