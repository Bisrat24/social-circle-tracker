@echo off
title Orbit Launcher
cd /d "%~dp0"

:: Check if OrbitServer is already running
tasklist /fi "imagename eq OrbitServer.exe" | findstr /i "OrbitServer.exe" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Orbit Sync & Web Server...
    start "Orbit Sync Server" "%~dp0OrbitServer.exe" --open
) else (
    echo Orbit server is already running!
    start http://localhost:5000/
)
exit
