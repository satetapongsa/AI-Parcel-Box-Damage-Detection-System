@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SPDI - 1 SETUP

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js not found. Install it from https://nodejs.org then run this file again.
  pause
  exit /b 1
)

echo ==============================================
echo   Step 1/2: installing packages (1-3 minutes)
echo ==============================================
call npm run setup
if errorlevel 1 (
  echo [X] Install failed. Check your internet and run this file again.
  pause
  exit /b 1
)

echo.
echo ==============================================
echo   Step 2/2: settings
echo ==============================================
node tools\setup-env.js
echo.
pause
