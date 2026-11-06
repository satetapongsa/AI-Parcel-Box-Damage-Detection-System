@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title SPDI - runall

if not exist "node_modules" (
  echo [!] First time? Installing everything with 1-SETUP.bat ...
  call "1-SETUP.bat"
)

rem optional: runall.bat <number> runs that menu item straight away
set "empties=0"
set "choice=%~1"
if not "%choice%"=="" goto dispatch

rem double-click: open the web Control Center and start EVERYTHING
cls
echo ==========================================================
echo   SPDI - opening the Control Center in your browser
echo     http://localhost:3100   (start / stop every part there)
echo   and starting everything: broker + bridge + simulator
echo                            + dashboard + ESP32 relay
echo ==========================================================
echo.
echo   [R] Control Center + start everything (auto in 6 s)
echo   [C] Control Center + everything with real CiRA CORE
echo   [W] Control Center only, start things yourself
echo   [M] old terminal menu
echo.
choice /c RCWM /t 6 /d R /n /m "Your choice [R/C/W/M]: "
if errorlevel 4 goto menu
if errorlevel 3 goto panel
if errorlevel 2 goto panel_cira
goto panel_all

:panel_all
call :need_env || goto menu
call :need_port || goto menu
title SPDI - Control Center
node tools\control\server.js --all
pause
exit /b 0

:panel_cira
call :need_env || goto menu
call :need_port || goto menu
title SPDI - Control Center
node tools\control\server.js --all-cira
pause
exit /b 0

:panel
title SPDI - Control Center
node tools\control\server.js
pause
exit /b 0

:menu
cls
echo ==========================================================
echo                SPDI  -  run everything from here
echo ==========================================================
echo.
echo   W  Web Control Center (browser)
echo.
echo   DEMO
echo    1  EVERYTHING: simulator + dashboard + ESP32 relay
echo    2  Demo with SIMULATOR only        (2-DEMO-SIM)
echo    3  Demo with real CiRA CORE        (3-DEMO-CIRA)
echo    4  EVERYTHING with real CiRA CORE
echo.
echo   ESP32 (Wokwi)
echo    5  ESP32 test: send fake PASS/FAIL every 3 s
echo    6  ESP32 relay: forward real results
echo.
echo   TOOLS
echo    7  Watch MQTT messages            (sniff)
echo    8  Reset database before a demo   (reset)
echo    9  Auto-label images for CiRA     (auto_label)
echo    10 Convert text .gt to CiRA format
echo    11 Mix damaged boxes into a video (make_video)
echo    12 Run unit tests
echo.
echo    S  Setup / reinstall               (1-SETUP)
echo    0  Exit
echo.
set "choice="
set /p "choice=Choose: "
if "%choice%"=="" goto empty
set "empties=0"

:dispatch
if "%choice%"=="1"  goto everything
if "%choice%"=="2"  goto sim
if "%choice%"=="3"  goto cira
if "%choice%"=="4"  goto everything_cira
if "%choice%"=="5"  goto relay_test
if "%choice%"=="6"  goto relay
if "%choice%"=="7"  goto sniff
if "%choice%"=="8"  goto reset
if "%choice%"=="9"  goto label
if "%choice%"=="10" goto convert
if "%choice%"=="11" goto video
if "%choice%"=="12" goto tests
if /i "%choice%"=="S" goto setup
if /i "%choice%"=="W" goto panel
if "%choice%"=="0"  exit /b 0
echo [X] Unknown choice: %choice%
pause
goto menu

rem stdin closed or Enter pressed: leave after 3 empty answers in a row
:empty
set /a empties+=1
if %empties% GEQ 3 exit /b 0
goto menu

rem ---------------------------------------------------------------- demos
:everything
call :need_env || goto menu
call :need_port || goto menu
call :open_browsers
title SPDI - EVERYTHING (simulator)
echo Starting broker, bridge, simulator, dashboard and ESP32 relay ...
echo Close this window or press Ctrl+C to stop everything.
echo.
call npm run all
pause
goto menu

:everything_cira
call :need_env || goto menu
call :need_port || goto menu
call :open_browsers
title SPDI - EVERYTHING (CiRA CORE)
echo Starting broker, bridge, dashboard and ESP32 relay ...
echo Now press Run in CiRA CORE. Close this window or press Ctrl+C to stop everything.
echo.
call npm run all:cira
pause
goto menu

:sim
call :need_env || goto menu
call :need_port || goto menu
start "SPDI demo (simulator)" cmd /c "2-DEMO-SIM.bat"
goto menu

:cira
call :need_env || goto menu
call :need_port || goto menu
start "SPDI demo (CiRA)" cmd /c "3-DEMO-CIRA.bat"
goto menu

rem ---------------------------------------------------------------- ESP32
:relay_test
start "SPDI ESP32 test relay" cmd /k "npm run relay:test"
call :wokwi_hint
goto menu

:relay
start "SPDI ESP32 relay" cmd /k "npm run relay"
call :wokwi_hint
goto menu

rem ---------------------------------------------------------------- tools
:sniff
start "SPDI MQTT sniff" cmd /k "npm run sniff"
goto menu

:reset
call :need_env || goto menu
echo.
echo This deletes ALL inspection records in MongoDB. It will ask y/N once more.
call npm run reset
pause
goto menu

:label
call :need_py || goto menu
echo.
echo Drag the image folder into this window, then press Enter.
echo (empty = box_good\dataset_frames)
set "folder="
set /p "folder=Folder: "
if "%folder%"=="" set "folder=box_good\dataset_frames"
set "folder=%folder:"=%"
if not exist "%folder%\" (
  echo [X] Folder not found: %folder%
  pause
  goto menu
)
set "extra="
set /p "extra=Extra options (Enter = --preview): "
if "%extra%"=="" set "extra=--preview"
py tools\auto_label\auto_label.py "%folder%" %extra%
pause
goto menu

:convert
call :need_py || goto menu
echo.
echo Drag the folder that has the text .gt files (from cira_labeler.py), then Enter.
echo (empty = box_good\dataset_frames)
set "folder="
set /p "folder=Folder: "
if "%folder%"=="" set "folder=box_good\dataset_frames"
set "folder=%folder:"=%"
if not exist "%folder%\" (
  echo [X] Folder not found: %folder%
  pause
  goto menu
)
py tools\auto_label\auto_label.py "%folder%" --convert-text
pause
goto menu

:video
call :need_py || goto menu
echo.
echo Drag the conveyor video (good boxes), then Enter.
set "vin="
set /p "vin=Video: "
if "%vin%"=="" goto menu
set "vin=%vin:"=%"
if not exist "%vin%" (
  echo [X] File not found: %vin%
  pause
  goto menu
)
echo Drag the folder with damaged-box images, then Enter.
set "imgs="
set /p "imgs=Images folder: "
if "%imgs%"=="" goto menu
set "imgs=%imgs:"=%"
if not exist "%imgs%\" (
  echo [X] Folder not found: %imgs%
  pause
  goto menu
)
set "vout=conveyor_mixed.mp4"
set /p "vout=Output file (Enter = conveyor_mixed.mp4): "
set "vout=%vout:"=%"
py tools\make_video.py --input "%vin%" --images "%imgs%" --output "%vout%"
pause
goto menu

:tests
call npm test
pause
goto menu

:setup
call "1-SETUP.bat"
goto menu

rem ---------------------------------------------------------------- helpers
:need_env
if not exist "bridge\.env" (
  echo [X] bridge\.env is missing. Choose S ^(setup^) first.
  pause
  exit /b 1
)
findstr /c:"<cluster>" "bridge\.env" >nul
if not errorlevel 1 (
  echo [X] MongoDB connection string is not set yet. Choose S ^(setup^) and paste it.
  pause
  exit /b 1
)
exit /b 0

:need_port
netstat -ano | findstr ":3000 " | findstr LISTENING >nul
if not errorlevel 1 (
  echo [X] Port 3000 is busy: a demo is already running. Close that window first.
  pause
  exit /b 1
)
exit /b 0

:need_py
where py >nul 2>nul
if errorlevel 1 (
  echo [X] Python launcher "py" not found. Install Python from https://www.python.org
  pause
  exit /b 1
)
exit /b 0

:open_browsers
rem the dashboard needs about 20 s to compile on the first start
start "" /min cmd /c "timeout /t 20 >nul & start http://localhost:3000 & start http://localhost:3000/live & start https://wokwi.com/projects/479947280939592705"
echo The browser opens in about 20 s. In Wokwi press the green Play button.
exit /b 0

:wokwi_hint
echo.
echo  Now open your Wokwi project and press Play:
echo    https://wokwi.com/projects/479947280939592705
echo  (TOPIC_BASE in the sketch must match RELAY_TOPIC in bridge\.env)
echo.
pause
exit /b 0
