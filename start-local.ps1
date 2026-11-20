# One-click local launch for Orbit. No install, no cloud, no Node dependency.
# This script compiles the tiny local server if needed, then runs it in this window.
$root = $PSScriptRoot
$exe = Join-Path $root "OrbitServer.exe"
$src = Join-Path $root "Server.cs"

if (-not (Test-Path $exe)) {
    $csc = "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    if (-not (Test-Path $csc)) {
        Write-Host "No local server binary and no C# compiler found." -ForegroundColor Red
        exit 1
    }
    Write-Host "Compiling local server from Server.cs..." -ForegroundColor Gray
    & $csc /nologo /target:exe /out:$exe $src
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exe)) {
        Write-Host "Could not compile the local server." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting Orbit... the browser will open automatically." -ForegroundColor Green
Write-Host "Keep this window open. Close it to stop the local server." -ForegroundColor DarkGray
& $exe --open
