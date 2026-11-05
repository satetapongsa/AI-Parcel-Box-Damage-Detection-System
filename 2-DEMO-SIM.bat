@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SPDI - DEMO (simulator)

if not exist "bridge\.env" (
  echo [X] Run 1-SETUP.bat first.
  pause
  exit /b 1
)
findstr /c:"<cluster>" "bridge\.env" >nul
if not errorlevel 1 (
  echo [X] MongoDB connection string is not set yet. Run 1-SETUP.bat and paste it.
  pause
  exit /b 1
)
netstat -ano | findstr ":3000 " | findstr LISTENING >nul
if not errorlevel 1 (
  echo [X] Port 3000 is busy: the dashboard is already running in another window. Close that window first.
  pause
  exit /b 1
)

echo ==============================================
echo   SPDI demo with SIMULATOR (no CiRA needed)
echo   Dashboard opens at http://localhost:3000
echo   Close this window (or press Ctrl+C) to stop.
echo ==============================================
start "" /min cmd /c "timeout /t 15 >nul & start http://localhost:3000"
call npm run demo:sim:nobroker
pause
