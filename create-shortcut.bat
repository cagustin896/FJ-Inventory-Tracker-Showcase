@echo off
echo Creating desktop shortcuts...
echo.

set "PROJECT_DIR=%~dp0"
set "APP_PORT=3000"
if exist "%PROJECT_DIR%.env" (
  for /f "tokens=1,* delims==" %%A in (%PROJECT_DIR%.env) do (
    if /i "%%A"=="PORT" set "APP_PORT=%%B"
  )
)

:: Shortcut 1 - Open App in Browser
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\F&J Inventory.lnk'); $s.TargetPath = 'http://localhost:%APP_PORT%/dashboard'; $s.Description = 'Open F&J Gadgets Inventory System'; $s.Save()"

:: Shortcut 2 - Restart server via hidden VBScript (no CMD window to close)
powershell -NoProfile -Command "$project = $env:PROJECT_DIR.TrimEnd('\'); $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\Restart FJ Inventory.lnk'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"' + (Join-Path $project 'restart-server.vbs') + '\"'; $s.WorkingDirectory = $project; $s.Description = 'Restart F&J Inventory Server'; $s.Save()"

echo.
echo ============================================
echo  Shortcuts created on your Desktop!
echo.
echo  "F^&J Inventory"         - opens the app
echo  "Restart FJ Inventory"  - restarts the server
echo ============================================
echo.
pause
