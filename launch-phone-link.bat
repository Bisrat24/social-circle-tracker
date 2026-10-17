@echo off
title Orbit Phone Link
cd /d "%~dp0"
echo ========================================================
echo    Orbit - Instant Phone Link (Bypasses Firewall/Wi-Fi)
echo ========================================================
echo.

:: Ensure OrbitServer is running
tasklist /fi "imagename eq OrbitServer.exe" | findstr /i "OrbitServer.exe" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Orbit Local Server...
    start "Orbit Server" "%~dp0OrbitServer.exe"
    timeout /t 1 /nobreak >nul
)

echo Connecting secure HTTPS phone tunnel...
echo Open the HTTPS link shown below in Chrome on your Android phone:
echo ----------------------------------------------------------------

:tunnel_loop
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -R 80:localhost:5000 nokey@localhost.run
echo.
echo Tunnel connection reset. Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto tunnel_loop
