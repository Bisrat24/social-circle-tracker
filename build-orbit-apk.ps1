Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = $PSScriptRoot
$templateApk = Join-Path $baseDir "template.apk"
$stagingApk = Join-Path $baseDir "Orbit_staging.apk"
$finalApk = Join-Path $baseDir "Orbit.apk"
$outDir = Join-Path $baseDir "apk_output"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Building & Signing Orbit.apk           " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Ensure pristine template.apk exists
if (-not (Test-Path $templateApk)) {
    Write-Host "Downloading pristine template APK..." -ForegroundColor Cyan
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri 'https://github.com/mikespub-archive/android-webview/releases/download/v1.28/app-release.apk' -OutFile $templateApk
}

# Clean previous builds
if (Test-Path $stagingApk) { Remove-Item $stagingApk -Force }
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# 2. Copy template to staging
Copy-Item $templateApk $stagingApk -Force

# 3. Open ZIP in Update mode
Write-Host "Injecting Orbit web app assets directly into APK archive..." -ForegroundColor Gray
$zip = [System.IO.Compression.ZipFile]::Open($stagingApk, [System.IO.Compression.ZipArchiveMode]::Update)

# Helper function to remove entry if exists
function Remove-ZipEntry($zipArchive, $entryName) {
    $existing = $zipArchive.GetEntry($entryName)
    if ($existing) { $existing.Delete() }
}

# Helper function to add/replace entry from file
function Add-ZipEntryFromFile($zipArchive, $entryName, $sourceFile) {
    Remove-ZipEntry $zipArchive $entryName
    $newEntry = $zipArchive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $newEntry.Open()
    $fileBytes = [System.IO.File]::ReadAllBytes($sourceFile)
    $entryStream.Write($fileBytes, 0, $fileBytes.Length)
    $entryStream.Close()
}

# Helper function to add/replace entry from text
function Add-ZipEntryFromText($zipArchive, $entryName, $text) {
    Remove-ZipEntry $zipArchive $entryName
    $newEntry = $zipArchive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entryStream = $newEntry.Open()
    $writer = New-Object System.IO.StreamWriter($entryStream, [System.Text.Encoding]::UTF8)
    $writer.Write($text)
    $writer.Flush()
    $writer.Close()
    $entryStream.Close()
}

# Remove old signature files
$entriesToDelete = @()
foreach ($e in $zip.Entries) {
    if ($e.FullName -like "META-INF/*.RSA" -or $e.FullName -like "META-INF/*.DSA" -or $e.FullName -like "META-INF/*.SF" -or $e.FullName -like "META-INF/*.EC") {
        $entriesToDelete += $e
    }
}
foreach ($e in $entriesToDelete) {
    $e.Delete()
}

# Web files to inject
$webFiles = @(
    @{ Name = "index.html"; Path = (Join-Path $baseDir "index.html") },
    @{ Name = "styles.css"; Path = (Join-Path $baseDir "styles.css") },
    @{ Name = "app.js"; Path = (Join-Path $baseDir "app.js") },
    @{ Name = "google-sync.js"; Path = (Join-Path $baseDir "google-sync.js") },
    @{ Name = "manifest.json"; Path = (Join-Path $baseDir "manifest.json") }
)

$iconFiles = @(
    @{ Name = "icons/icon-96.png"; Path = (Join-Path $baseDir "icons\icon-96.png") },
    @{ Name = "icons/icon-192.png"; Path = (Join-Path $baseDir "icons\icon-192.png") },
    @{ Name = "icons/icon-512.png"; Path = (Join-Path $baseDir "icons\icon-512.png") }
)

# Inject into assets/, assets/demo/, assets/web/, and assets/local/
foreach ($folder in @("assets/", "assets/demo/", "assets/web/", "assets/local/")) {
    foreach ($wf in $webFiles) {
        Add-ZipEntryFromFile $zip ($folder + $wf.Name) $wf.Path
    }
    foreach ($ic in $iconFiles) {
        Add-ZipEntryFromFile $zip ($folder + $ic.Name) $ic.Path
    }
}

# Inject valid assets/settings.json (must contain sites[0] to prevent crash!)
$settingsJson = @'
{
  "sites": [
    {
      "url": "https://appassets.androidplatform.net/sites/demo/index.html",
      "title": "Orbit - Social Circle Tracker"
    }
  ],
  "other": "https://appassets.androidplatform.net/sites/demo/index.html",
  "match": [
    ["host", "equals", "appassets.androidplatform.net"],
    ["host", "equals", "localhost"],
    ["host", "startsWith", "192.168."],
    ["host", "startsWith", "10."],
    ["host", "endsWith", "google.com"],
    ["host", "endsWith", "googleapis.com"]
  ],
  "skip": [
    ["path", "endsWith", ".epub"]
  ],
  "remote_debug": false,
  "console_log": true,
  "js_interface": false,
  "context_menu": false,
  "not_matching": false,
  "local_sites": true,
  "update_zip": "",
  "web_settings": {
    "JavaScriptEnabled": true,
    "DomStorageEnabled": true,
    "DatabaseEnabled": true
  },
  "source": "assets",
  "timestamp": "2026-10-17T11:00:00Z"
}
'@
Add-ZipEntryFromText $zip "assets/settings.json" $settingsJson

# Inject valid assets/local/config.json
$localConfigJson = @'
{
  "sites": {
    "demo/index.html": "Orbit - Social Circle Tracker",
    "web/index.html": "Orbit - Social Circle Tracker"
  },
  "bundles": [],
  "prefix": "https://appassets.androidplatform.net/sites/"
}
'@
Add-ZipEntryFromText $zip "assets/local/config.json" $localConfigJson

$zip.Dispose()
Write-Host "Asset injection complete!" -ForegroundColor Green

# 4. Sign and ZipAlign using uber-apk-signer
Write-Host "Signing and aligning APK with v1/v2/v3 signatures..." -ForegroundColor Gray
$signerJar = Join-Path $baseDir "uber-apk-signer.jar"

& java -jar $signerJar --apks $stagingApk -o $outDir --allowResign

# Locate signed output
$signedApk = Get-ChildItem -Path $outDir -Filter "*.apk" | Select-Object -First 1

if ($signedApk) {
    Copy-Item $signedApk.FullName $finalApk -Force
    Remove-Item $stagingApk -Force -ErrorAction SilentlyContinue
    Remove-Item $outDir -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "   READY TO INSTALL: Orbit.apk                          " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  File Path: $finalApk" -ForegroundColor Yellow
    Write-Host "  File Size: $([Math]::Round((Get-Item $finalApk).Length / 1MB, 2)) MB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Verifying Signature..." -ForegroundColor Cyan
    & java -jar $signerJar -y -a $finalApk
} else {
    Write-Host "Failed to locate signed APK." -ForegroundColor Red
}
