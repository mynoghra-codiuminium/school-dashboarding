@echo off
title EduSys - Starting...
color 0A

echo.
echo  ========================================
echo    EduSys ^| School Management System
echo  ========================================
echo.

:: ── Resolve root dir ──────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: ── Verify structure ──────────────────────────────────────────
if not exist "%ROOT%\backend\package.json" (
    color 0C
    echo  [ERROR] Cannot find backend\package.json
    echo  Run INSTALL.bat first.
    pause
    exit /b 1
)

if not exist "%ROOT%\backend\node_modules" (
    color 0E
    echo  [WARN] Dependencies not installed. Running INSTALL.bat first...
    call "%ROOT%\INSTALL.bat"
    if %errorlevel% neq 0 exit /b 1
    color 0A
)

:: ── Check Node.js ─────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ══════════════════════════════════════════════════════════════
:: CHECK port 27017 first — user may already have MongoDB open
:: ══════════════════════════════════════════════════════════════
echo  [..] Checking MongoDB...
netstat -an 2>nul | findstr "27017" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] MongoDB already running on port 27017
    echo.
    goto :start_servers
)

:: Try Windows service
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    sc start MongoDB >nul 2>&1
    goto :wait_mongo
)

:: Try mongod in PATH
where mongod >nul 2>&1
if %errorlevel% equ 0 (
    if not exist "C:\data\db" mkdir "C:\data\db"
    start /min "MongoDB" mongod --dbpath "C:\data\db" --quiet
    goto :wait_mongo
)

:: Try common install paths
set MONGOD=
:: Check all common MongoDB versions including 8.x sub-versions
for %%V in (8.0 8.2 8.1 7.0 6.0 5.0 4.4) do (
    if exist "C:\Program Files\MongoDB\Server\%%V\bin\mongod.exe" (
        set "MONGOD=C:\Program Files\MongoDB\Server\%%V\bin\mongod.exe"
    )
)
:: Also scan any version folder automatically
if not defined MONGOD (
    for /d %%D in ("C:\Program Files\MongoDB\Server\*") do (
        if exist "%%D\bin\mongod.exe" set "MONGOD=%%D\bin\mongod.exe"
    )
)

:: Universal fallback — scan all installed versions automatically
if not defined MONGOD (
    for /d %%v in ("C:\Program Files\MongoDB\Server\*") do (
        if exist "%%v\bin\mongod.exe" set "MONGOD=%%v\bin\mongod.exe"
    )
)

if defined MONGOD (
    if not exist "C:\data\db" mkdir "C:\data\db"
    echo  [..] Starting MongoDB from: %MONGOD%
    start /min "MongoDB" "%MONGOD%" --dbpath "C:\data\db" --quiet
    goto :wait_mongo
)

color 0C
echo.
echo  [ERROR] MongoDB is not running and could not be started.
echo.
echo  Start MongoDB manually in a separate CMD window:
echo    mongod --dbpath C:\data\db
echo  Then run START.bat again.
echo.
pause
exit /b 1

:wait_mongo
echo  [..] Waiting for MongoDB to be ready...
set MONGO_TRIES=0
:poll
set /a MONGO_TRIES+=1
netstat -an 2>nul | findstr "27017" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :mongo_ok
if %MONGO_TRIES% geq 15 (
    color 0C
    echo  [ERROR] MongoDB did not start. Run mongod manually and retry.
    pause
    exit /b 1
)
timeout /t 2 >nul
goto :poll

:mongo_ok
echo  [OK] MongoDB confirmed on port 27017
echo.

:: ── Start servers ─────────────────────────────────────────────
:start_servers
echo  [..] Starting Backend  ^(port 5000^)...
start "EduSys Backend" cmd /k "color 0B && title EduSys Backend ^| Port 5000 && echo. && echo  Backend starting... && echo. && cd /d ""%ROOT%\backend"" && npm run dev"
echo  [OK] Backend window opened

echo  [..] Starting Frontend ^(port 3000^)...
start "EduSys Frontend" cmd /k "color 0D && title EduSys Frontend ^| Port 3000 && echo. && echo  Frontend starting... && echo. && cd /d ""%ROOT%\frontend"" && npm start"
echo  [OK] Frontend window opened
echo.

echo  ========================================
echo.
echo   EduSys is starting up...
echo.
echo   Waiting for frontend to be ready,
echo   then opening browser automatically.
echo.
echo  ========================================
echo.

:: ── Wait for port 3000 to be ready, then open browser ONCE ───
set FRONT_TRIES=0
:wait_frontend
set /a FRONT_TRIES+=1
netstat -an 2>nul | findstr ":3000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :open_browser
if %FRONT_TRIES% geq 45 goto :open_browser
timeout /t 2 >nul
if %FRONT_TRIES%==5  echo  [..] Still compiling frontend... (may take 1-2 min on first run)
if %FRONT_TRIES%==15 echo  [..] Almost ready...
if %FRONT_TRIES%==25 echo  [..] Taking a bit longer, hang tight...
goto :wait_frontend

:open_browser
:: Small extra delay so the page actually loads (not just port open)
timeout /t 2 >nul
echo  [OK] Opening http://localhost:3000 ...
start "" "http://localhost:3000"
echo.
echo  ========================================
echo.
echo   EduSys is running!
echo.
echo   URL     :  http://localhost:3000
echo   Login   :  admin@school.edu  /  admin123
echo.
echo   Keep this window and the two server
echo   windows open while using EduSys.
echo   Run STOP.bat to shut everything down.
echo.
echo  ========================================
echo.
pause
