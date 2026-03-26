@echo off
title EduSys - First Time Setup
color 0B

echo.
echo  ========================================
echo    EduSys ^| First Time Setup
echo  ========================================
echo.
echo  Installs all dependencies and seeds the
echo  database with demo data.
echo.
echo  Run this ONCE before using START.bat.
echo.
echo  ========================================
echo.

:: ── Resolve root dir ──────────────────────────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo  [..] Script location: %ROOT%
echo.

:: ── Verify structure ──────────────────────────────────────────
if not exist "%ROOT%\backend\package.json" (
    color 0C
    echo  [ERROR] Cannot find backend\package.json
    echo.
    echo  Make sure INSTALL.bat is inside EduSys-Final\
    echo  alongside the backend\ and frontend\ folders.
    pause
    exit /b 1
)
echo  [OK] Folder structure verified

:: ── Check Node.js ─────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not installed.
    echo  Download from: https://nodejs.org/en/download
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

where npm >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm not found. Reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo  [OK] npm v%NPM_VER%
echo.

:: ══════════════════════════════════════════════════════════════
:: Check port 27017 first before trying to start MongoDB
:: ══════════════════════════════════════════════════════════════
echo  [..] Checking MongoDB...
netstat -an 2>nul | findstr "27017" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] MongoDB already running on port 27017
    echo.
    goto :install_deps
)

echo  [..] MongoDB not detected. Trying to start it...

:: Try Windows service
sc query MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    sc start MongoDB >nul 2>&1
    echo  [..] MongoDB service starting...
    goto :wait_mongo
)

:: Try mongod in PATH
where mongod >nul 2>&1
if %errorlevel% equ 0 (
    if not exist "C:\data\db" mkdir "C:\data\db"
    start /min "MongoDB" mongod --dbpath "C:\data\db" --quiet
    echo  [..] mongod started from PATH...
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
    echo  [..] mongod started from %MONGOD%...
    goto :wait_mongo
)

color 0E
echo  [WARN] Could not auto-start MongoDB.
echo.
echo  Please start MongoDB manually in a NEW CMD window:
echo    mongod --dbpath C:\data\db
echo.
echo  Once it is running, press any key here to continue...
pause >nul
color 0B

:wait_mongo
set MONGO_TRIES=0
:mongo_poll
set /a MONGO_TRIES+=1
netstat -an 2>nul | findstr "27017" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :mongo_ok
if %MONGO_TRIES% geq 15 (
    color 0C
    echo.
    echo  [ERROR] MongoDB not responding after 30 seconds.
    echo  Start it manually then re-run INSTALL.bat.
    pause
    exit /b 1
)
timeout /t 2 >nul
echo  [..] Waiting for MongoDB... (%MONGO_TRIES%/15)
goto :mongo_poll

:mongo_ok
echo  [OK] MongoDB confirmed on port 27017
echo.

:: ── Install dependencies ───────────────────────────────────────
:install_deps
echo  [1/3] Installing backend dependencies...
cd /d "%ROOT%\backend"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Backend install failed.
    pause
    exit /b 1
)
echo  [OK] Backend ready
echo.

echo  [2/3] Installing frontend dependencies (1-3 minutes)...
cd /d "%ROOT%\frontend"
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Frontend install failed.
    pause
    exit /b 1
)
echo  [OK] Frontend ready
echo.

:: ── Seed database ─────────────────────────────────────────────
echo  [3/3] Seeding demo database...
cd /d "%ROOT%\backend"
node seed.js
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Database seed failed.
    echo  Make sure MongoDB is running, then run RESET_DATA.bat
    echo.
) else (
    echo  [OK] Demo data loaded
)
echo.

:: ── Done — open browser ───────────────────────────────────────
color 0A
echo  ========================================
echo.
echo   Setup Complete!
echo.
echo   Now run START.bat to launch EduSys.
echo   The browser will open automatically.
echo.
echo   Login Credentials:
echo     Admin   :  admin@school.edu    /  admin123
echo     Teacher :  teacher@school.edu  /  teacher123
echo     Staff   :  staff@school.edu    /  staff123
echo.
echo  ========================================
echo.
pause
