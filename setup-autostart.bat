@echo off
echo ============================================
echo   F^&J Inventory - Auto-Start Setup
echo ============================================
echo.

cd /d "%~dp0"

echo [1/4] Building the app interface...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed. Make sure you ran "npm install" first.
    pause
    exit /b 1
)
echo Done.
echo.

echo [2/4] Checking PM2 is installed...
call pm2 --version >nul 2>&1
if errorlevel 1 (
    echo PM2 not found. Installing now...
    call npm install -g pm2
)
echo Done.
echo.

echo [3/4] Starting app with PM2...
call pm2 start ecosystem.config.js
echo Done.
echo.

echo [4/4] Saving process list for auto-restart...
call pm2 save
echo Done.
echo.

echo ============================================
echo   Setup complete!
echo   The app will now start automatically
echo   every time this PC turns on.
echo.
echo   Open your browser and go to:
echo   http://localhost:3000
echo ============================================
echo.
pause
