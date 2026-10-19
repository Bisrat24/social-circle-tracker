param(
    [string]$SiteName = "orbit-tracker"
)

$baseDir = $PSScriptRoot
$zipPath = Join-Path $baseDir "orbit-site.zip"
$tempDir = Join-Path $baseDir "temp_site"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Deploying Orbit to Free Cloud Hosting  " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Read and attempt to remove previous deployment
$historyFile = Join-Path $baseDir "hosted_info.json"
$prevUrl = ""
if (Test-Path $historyFile) {
    try {
        $prevInfo = Get-Content $historyFile | ConvertFrom-Json
        if ($prevInfo.slug) {
            Write-Host "Attempting removal of previous deployment: $($prevInfo.slug)..." -ForegroundColor Gray
            if ($prevInfo.claim_token) {
                curl.exe -s -X DELETE "https://ship.page/drops/$($prevInfo.slug)" -H "Authorization: Bearer $($prevInfo.claim_token)" | Out-Null
            } else {
                curl.exe -s -X DELETE "https://ship.page/drops/$($prevInfo.slug)" | Out-Null
            }
        }
    } catch {}
}

# Also clean up old zip and staging artifacts
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
if (Test-Path (Join-Path $baseDir "apk_output")) { Remove-Item (Join-Path $baseDir "apk_output") -Recurse -Force }
if (Test-Path (Join-Path $baseDir "Orbit_staging.apk")) { Remove-Item (Join-Path $baseDir "Orbit_staging.apk") -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Copy-Item (Join-Path $baseDir "index.html") $tempDir
Copy-Item (Join-Path $baseDir "styles.css") $tempDir
Copy-Item (Join-Path $baseDir "app.js") $tempDir
Copy-Item (Join-Path $baseDir "google-sync.js") $tempDir
Copy-Item (Join-Path $baseDir "manifest.json") $tempDir
Copy-Item (Join-Path $baseDir "service-worker.js") $tempDir
Copy-Item (Join-Path $baseDir "icons") $tempDir -Recurse

# Also copy Orbit.apk into the site so mobile users can download it directly!
Copy-Item (Join-Path $baseDir "Orbit.apk") $tempDir

# 2. Compress to zip
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)
Remove-Item $tempDir -Recurse -Force

Write-Host "Bundle created: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Gray

# 3. Deploy to ship.page
Write-Host "Uploading to ship.page CDN..." -ForegroundColor Cyan
$deployUrl = "https://ship.page/deploy"
$resp = curl.exe -s -X POST $deployUrl -H "Content-Type: application/zip" --data-binary "@$zipPath"

Write-Host "Deploy response: $resp" -ForegroundColor Gray

try {
    $json = $resp | ConvertFrom-Json
    if ($json.url) {
        Write-Host ""
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  🎉 SUCCESS! Orbit is live on permanent HTTPS cloud hosting" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host "  Live URL: $($json.url)" -ForegroundColor Yellow
        Write-Host "  Expires : $($json.expires_at)" -ForegroundColor Gray
        Write-Host "============================================================" -ForegroundColor Green
        
        $json.url | Out-File (Join-Path $baseDir "hosted_url.txt") -Encoding utf8
        
        # Save info for next update removal
        $deployRecord = @{
            url = $json.url
            slug = $json.slug
            claim_token = $json.claim_token
            expires_at = $json.expires_at
            deployed_at = (Get-Date).ToString("o")
        }
        $deployRecord | ConvertTo-Json | Out-File $historyFile -Encoding utf8
    }
} catch {
    Write-Host "Raw response: $resp"
}
finally {
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
}
