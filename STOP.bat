@echo off
title EduSys - Stopping...
color 0C

echo.
echo  ========================================
echo    EduSys ^| Stopping All Services
echo  ========================================
echo.

:: ── Kill processes on port 5000 (backend) ─────────────────────
echo  [..] Stopping Backend (port 5000)...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    if not "%%p"=="" taskkill /PID %%p /F >nul 2>&1
)
echo  [OK] Backend stopped

:: ── Kill processes on port 3000 (frontend) ────────────────────
echo  [..] Stopping Frontend (port 3000)...
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    if not "%%p"=="" taskkill /PID %%p /F >nul 2>&1
)
echo  [OK] Frontend stopped

:: ── Close EduSys terminal windows ────────────────────────────
echo  [..] Closing EduSys windows...
taskkill /FI "WINDOWTITLE eq EduSys Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq EduSys Frontend*" /F >nul 2>&1
echo  [OK] Windows closed

:: ── Clean up remaining node processes ────────────────────────
taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq EduSys*" /F >nul 2>&1

echo.
echo  ========================================
echo.
echo   All EduSys services stopped.
echo   Run START.bat to launch again.
echo.
echo  ========================================
echo.
timeout /t 3 >nul
