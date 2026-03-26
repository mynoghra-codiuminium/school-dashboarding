@echo off
title EduSys Production - Reset All Data
color 0C

echo.
echo  ========================================
echo    EduSys PRODUCTION - Full Data Reset
echo  ========================================
echo.
echo  WARNING: This will DELETE ALL data and
echo  restore only the 3 default admin accounts.
echo.
echo  Use this only if you want to start fresh.
echo  All students, teachers, fees, records will
echo  be permanently deleted.
echo.
echo  ========================================
echo.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if not exist "%ROOT%\backend\seed.js" (
    color 0C
    echo  [ERROR] Cannot find backend\seed.js
    pause & exit /b 1
)

set /p CONFIRM= Type RESET to confirm full wipe: 
if /i not "%CONFIRM%"=="RESET" (
    echo.
    echo  [CANCELLED] No changes made.
    timeout /t 2 >nul & exit /b 0
)

echo.
echo  [..] Stopping services...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    if not "%%p"=="" taskkill /PID %%p /F >nul 2>&1
)
echo  [OK] Services stopped
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C & echo  [ERROR] Node.js not found. & pause & exit /b 1
)

if not exist "%ROOT%\backend\node_modules" (
    echo  [..] Installing backend dependencies...
    cd /d "%ROOT%\backend" & call npm install
)

echo  [..] Checking MongoDB...
netstat -an 2>nul | findstr "27017" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 ( echo  [OK] MongoDB running & goto :wipe )

:: Auto-start MongoDB
set MONGOD=
if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" set "MONGOD=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set "MONGOD=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set "MONGOD=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
if not defined MONGOD for /d %%v in ("C:\Program Files\MongoDB\Server\*") do if exist "%%v\bin\mongod.exe" set "MONGOD=%%v\bin\mongod.exe"

if defined MONGOD (
    if not exist "C:\data\db" mkdir "C:\data\db"
    start /min "MongoDB" "%MONGOD%" --dbpath "C:\data\db" --quiet
    echo  [..] Waiting for MongoDB...
    timeout /t 8 >nul
)

:wipe
echo  [..] Wiping all data and recreating admin accounts...
echo.
cd /d "%ROOT%\backend"

:: Drop the entire database then re-seed
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  await mongoose.connection.dropDatabase();
  console.log('  Database wiped.');
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
"

node seed.js
set SEED_RESULT=%errorlevel%
echo.

if %SEED_RESULT% equ 0 (
    color 0A
    echo  ========================================
    echo.
    echo   [SUCCESS] Production reset complete!
    echo.
    echo   Default Accounts:
    echo     admin@school.edu   / Admin@123
    echo     teacher@school.edu / Teacher@123
    echo     staff@school.edu   / Staff@123
    echo.
    echo   Run START.bat to launch EduSys.
    echo  ========================================
) else (
    color 0C
    echo  [ERROR] Reset failed. Check MongoDB is running.
)
echo.
pause
