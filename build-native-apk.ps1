Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = $PSScriptRoot
$buildDir = Join-Path $baseDir "android_build"
$projDir = Join-Path $buildDir "project"
$aapt2 = Join-Path $buildDir "aapt2.exe"
$androidJar = Join-Path $buildDir "android.jar"
$ecj = Join-Path $buildDir "ecj.jar"
$r8 = Join-Path $buildDir "r8-java8.jar"
$signerJar = Join-Path $baseDir "uber-apk-signer.jar"
$finalApk = Join-Path $baseDir "Orbit.apk"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Compiling Pure Native Orbit.apk        " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. AAPT2 Compile Resources
Write-Host "1/5 Compiling Android resources..." -ForegroundColor Gray
$resZip = Join-Path $projDir "compiled_res.zip"
if (Test-Path $resZip) { Remove-Item $resZip -Force }
& $aapt2 compile --dir (Join-Path $projDir "res") -o $resZip
if ($LASTEXITCODE -ne 0) { throw "AAPT2 compile failed!" }

# 2. AAPT2 Link Resources
Write-Host "2/5 Linking resources & manifest..." -ForegroundColor Gray
$baseApk = Join-Path $projDir "base.apk"
if (Test-Path $baseApk) { Remove-Item $baseApk -Force }
& $aapt2 link -I $androidJar --manifest (Join-Path $projDir "AndroidManifest.xml") $resZip -o $baseApk --java (Join-Path $projDir "src") --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "AAPT2 link failed!" }

# 3. Compile Java Code
Write-Host "3/5 Compiling native Java Activity..." -ForegroundColor Gray
$binDir = Join-Path $projDir "bin"
if (Test-Path $binDir) { Remove-Item $binDir -Recurse -Force }
New-Item -ItemType Directory -Path $binDir -Force | Out-Null

$mainJava = Join-Path $projDir "src\com\bisrat\orbit\MainActivity.java"
$rJava = Join-Path $projDir "src\com\bisrat\orbit\R.java"
& java -jar $ecj -7 -cp $androidJar -d $binDir $mainJava $rJava
if ($LASTEXITCODE -ne 0) { throw "ECJ compilation failed!" }

# 4. D8 Compile DEX
Write-Host "4/5 Compiling DEX bytecode (D8)..." -ForegroundColor Gray
$classFiles = (Get-ChildItem -Path $binDir -Filter "*.class" -Recurse).FullName
& java -cp $r8 com.android.tools.r8.D8 --min-api 21 --lib $androidJar --output $projDir $classFiles
if ($LASTEXITCODE -ne 0) { throw "D8 compilation failed!" }

# 5. Inject classes.dex and web assets with forward slashes into staging APK
Write-Host "5/6 Packaging assets with forward-slash paths..." -ForegroundColor Gray
$stagingApk = Join-Path $projDir "Orbit_unsigned.apk"
if (Test-Path $stagingApk) { Remove-Item $stagingApk -Force }
Copy-Item $baseApk $stagingApk -Force

$zip = [System.IO.Compression.ZipFile]::Open($stagingApk, [System.IO.Compression.ZipArchiveMode]::Update)

# Add classes.dex
$dexBytes = [System.IO.File]::ReadAllBytes((Join-Path $projDir "classes.dex"))
$dexEntry = $zip.CreateEntry("classes.dex", [System.IO.Compression.CompressionLevel]::Optimal)
$s = $dexEntry.Open()
$s.Write($dexBytes, 0, $dexBytes.Length)
$s.Close()

# Add all web assets
$webAssets = @(
    @{ Name = "assets/index.html"; Path = (Join-Path $baseDir "index.html") },
    @{ Name = "assets/styles.css"; Path = (Join-Path $baseDir "styles.css") },
    @{ Name = "assets/app.js"; Path = (Join-Path $baseDir "app.js") },
    @{ Name = "assets/google-sync.js"; Path = (Join-Path $baseDir "google-sync.js") },
    @{ Name = "assets/manifest.json"; Path = (Join-Path $baseDir "manifest.json") },
    @{ Name = "assets/service-worker.js"; Path = (Join-Path $baseDir "service-worker.js") },
    @{ Name = "assets/icons/icon-96.png"; Path = (Join-Path $baseDir "icons\icon-96.png") },
    @{ Name = "assets/icons/icon-192.png"; Path = (Join-Path $baseDir "icons\icon-192.png") },
    @{ Name = "assets/icons/icon-512.png"; Path = (Join-Path $baseDir "icons\icon-512.png") }
)

foreach ($item in $webAssets) {
    $bytes = [System.IO.File]::ReadAllBytes($item.Path)
    $entry = $zip.CreateEntry($item.Name, [System.IO.Compression.CompressionLevel]::Optimal)
    $es = $entry.Open()
    $es.Write($bytes, 0, $bytes.Length)
    $es.Close()
}

$zip.Dispose()

# 6. Sign and ZipAlign
Write-Host "6/6 Signing and aligning APK with v1/v2/v3 signatures..." -ForegroundColor Gray
$outDir = Join-Path $projDir "signed_output"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

& java -jar $signerJar --apks $stagingApk -o $outDir --allowResign
$signedApk = Get-ChildItem -Path $outDir -Filter "*.apk" | Select-Object -First 1

if ($signedApk) {
    Copy-Item $signedApk.FullName $finalApk -Force
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "   NATIVE APK READY: Orbit.apk                          " -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  File Path: $finalApk" -ForegroundColor Yellow
    Write-Host "  File Size: $([Math]::Round((Get-Item $finalApk).Length / 1MB, 2)) MB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Verifying Signatures..." -ForegroundColor Cyan
    & java -jar $signerJar -y -a $finalApk
} else {
    throw "Signing failed!"
}
