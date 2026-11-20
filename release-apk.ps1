# Build a fresh Orbit.apk from the root web files, verify it, and report where to install it.
$root = $PSScriptRoot

foreach ($dst in @(
    (Join-Path $root "android\app\src\main\assets"),
    (Join-Path $root "android_build\project\assets")
)) {
    if (Test-Path $dst) {
        foreach ($name in @("index.html", "styles.css", "app.js", "google-sync.js", "manifest.json", "service-worker.js")) {
            Copy-Item (Join-Path $root $name) (Join-Path $dst $name) -Force
        }
    }
}

Push-Location $root
try {
    node verify.js
    if ($LASTEXITCODE -ne 0) { throw "Static verification failed" }

    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "build-native-apk.ps1")
    if ($LASTEXITCODE -ne 0) { throw "APK build failed" }

    $apk = Join-Path $root "Orbit.apk"
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  Orbit v1.0.4 APK is ready:" -ForegroundColor Green
    Write-Host "  $apk" -ForegroundColor Yellow
    Write-Host "  Install it on your phone over the current app to see the new UI." -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Green
} finally {
    Pop-Location
}
