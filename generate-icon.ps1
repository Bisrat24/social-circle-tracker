Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$size = 1024

function Draw-Heart([System.Drawing.Graphics]$g, [System.Drawing.Brush]$brush, [double]$cx, [double]$cy, [double]$s) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p.AddBezier(
        [System.Drawing.PointF]::new([single]$cx, [single]($cy + 0.48 * $s)),
        [System.Drawing.PointF]::new([single]($cx - 1.25 * $s), [single]($cy - 0.25 * $s)),
        [System.Drawing.PointF]::new([single]($cx - 0.62 * $s), [single]($cy - 1.02 * $s)),
        [System.Drawing.PointF]::new([single]$cx, [single]($cy - 0.42 * $s)))
    $p.AddBezier(
        [System.Drawing.PointF]::new([single]$cx, [single]($cy - 0.42 * $s)),
        [System.Drawing.PointF]::new([single]($cx + 0.62 * $s), [single]($cy - 1.02 * $s)),
        [System.Drawing.PointF]::new([single]($cx + 1.25 * $s), [single]($cy - 0.25 * $s)),
        [System.Drawing.PointF]::new([single]$cx, [single]($cy + 0.48 * $s)))
    $g.FillPath($brush, $p)
    $p.Dispose()
}

$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Background gradient
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point($size, $size)),
    [System.Drawing.Color]::FromArgb(255, 67, 56, 202),
    [System.Drawing.Color]::FromArgb(255, 124, 58, 237))
$g.FillRectangle($bg, 0, 0, $size, $size)

$cx = $size / 2
$cy = $size / 2
$scale = $size / 1024.0

# Orbit rings
foreach ($angle in @(-24, 24)) {
    $state = $g.Save()
    $g.TranslateTransform([single]$cx, [single]$cy)
    $g.RotateTransform([single]$angle)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, 255, 255, 255), [single](16 * $scale))
    $g.DrawEllipse($pen, [single](-340 * $scale), [single](-150 * $scale), [single](680 * $scale), [single](300 * $scale))
    $pen.Dispose()
    $g.Restore($state)
}

# Connection dots on the rings
$dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
foreach ($pt in @(@(278, -78), @(-282, 82), @(172, 104), @(-170, -104))) {
    $r = 17 * $scale
    $g.FillEllipse($dotBrush, [single]($cx + $pt[0] * $scale - $r), [single]($cy + $pt[1] * $scale - $r), [single]($r * 2), [single]($r * 2))
}

# Heart with soft glow
$glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 255, 255, 255))
Draw-Heart $g $glow $cx ($cy + 6 * $scale) (150 * $scale)
$heart = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
Draw-Heart $g $heart $cx ($cy + 6 * $scale) (118 * $scale)

$g.Dispose()
$bg.Dispose()
$dotBrush.Dispose()
$glow.Dispose()
$heart.Dispose()

$master = Join-Path $root "icon-master.png"
$bmp.Save($master, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$targets = @(
    @{ Path = (Join-Path $root "icons\icon-96.png"); Size = 96 },
    @{ Path = (Join-Path $root "icons\icon-192.png"); Size = 192 },
    @{ Path = (Join-Path $root "icons\icon-512.png"); Size = 512 },
    @{ Path = (Join-Path $root "android_build\project\res\mipmap-hdpi\ic_launcher.png"); Size = 96 },
    @{ Path = (Join-Path $root "android_build\project\res\mipmap-xhdpi\ic_launcher.png"); Size = 192 },
    @{ Path = (Join-Path $root "android_build\project\res\mipmap-xxhdpi\ic_launcher.png"); Size = 512 },
    @{ Path = (Join-Path $root "android_build\project\res\mipmap-xxxhdpi\ic_launcher.png"); Size = 256 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"); Size = 96 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"); Size = 192 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"); Size = 512 },
    @{ Path = (Join-Path $root "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"); Size = 256 }
)

# Monochrome status-bar icon for the persistent notification.
$statSize = 96
$stat = New-Object System.Drawing.Bitmap($statSize, $statSize)
$sg = [System.Drawing.Graphics]::FromImage($stat)
$sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$sg.Clear([System.Drawing.Color]::Transparent)
$sc = $statSize / 1024.0
$scx = $statSize / 2
$scy = $statSize / 2
foreach ($angle in @(-24, 24)) {
    $state = $sg.Save()
    $sg.TranslateTransform([single]$scx, [single]$scy)
    $sg.RotateTransform([single]$angle)
    $spen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [single](30 * $sc))
    $sg.DrawEllipse($spen, [single](-340 * $sc), [single](-150 * $sc), [single](680 * $sc), [single](300 * $sc))
    $spen.Dispose()
    $sg.Restore($state)
}
$swhite = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
Draw-Heart $sg $swhite $scx ($scy + 6 * $sc) (150 * $sc)
$sg.Dispose()
$swhite.Dispose()
foreach ($dir in @("android\app\src\main\res\drawable", "android_build\project\res\drawable")) {
    $full = Join-Path $root $dir
    if (-not (Test-Path $full)) { New-Item -ItemType Directory -Path $full -Force | Out-Null }
    $stat.Save((Join-Path $full "ic_stat_orbit.png"), [System.Drawing.Imaging.ImageFormat]::Png)
}
$stat.Dispose()

$src = [System.Drawing.Image]::FromFile($master)
foreach ($t in $targets) {
    $dir = Split-Path $t.Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $out = New-Object System.Drawing.Bitmap($t.Size, $t.Size)
    $og = [System.Drawing.Graphics]::FromImage($out)
    $og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $og.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $og.DrawImage($src, 0, 0, $t.Size, $t.Size)
    $og.Dispose()
    $out.Save($t.Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    Write-Host "wrote $($t.Path) ($($t.Size)px)"
}
$src.Dispose()
Write-Host "Icon generated."
