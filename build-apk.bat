@echo off
title Build Orbit APK
echo Building and Signing Orbit.apk...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-orbit-apk.ps1"
echo.
pause
