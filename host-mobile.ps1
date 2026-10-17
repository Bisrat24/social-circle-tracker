# Local Mobile Host for Orbit Social Circle Tracker
# Runs a lightweight HTTP server on port 5000 accessible from PC and Android phone on local Wi-Fi

$port = 5000
$baseDir = $PSScriptRoot

$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | 
       Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } | 
       Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $ip) {
    $ip = "127.0.0.1"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

if ($ip -and $ip -ne "localhost" -and $ip -ne "127.0.0.1") {
    try {
        $listener.Prefixes.Add("http://${ip}:$port/")
    } catch {
        # Non-admin; localhost and 127.0.0.1 remain active
    }
}

try {
    $listener.Start()
} catch {
    # If starting with IP failed, fallback to localhost only
    try {
        $listener.Close()
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:$port/")
        $listener.Prefixes.Add("http://127.0.0.1:$port/")
        $listener.Start()
    } catch {
        Write-Host "Server start error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Orbit Social Circle Tracker - Mobile and Local Server        " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PC Access:       http://localhost:$port/" -ForegroundColor Green
Write-Host "  Android Access:  http://${ip}:$port/" -ForegroundColor Green
Write-Host ""
Write-Host "  Listener IsListening: $($listener.IsListening)" -ForegroundColor Magenta
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host "================================================================" -ForegroundColor Cyan

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $rawPath = $req.Url.LocalPath
        Write-Host "[REQ] $($req.HttpMethod) $rawPath" -ForegroundColor Cyan
        if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "/index.html"
        }

        # CORS headers
        $res.Headers.Add("Access-Control-Allow-Origin", "*")
        $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        # Server Info Endpoint
        if ($rawPath -eq "/api/info") {
            $infoObj = @{
                status = "online"
                port = $port
                ip = $ip
                pcUrl = "http://localhost:$port/"
                mobileUrl = "http://${ip}:$port/"
            }
            $jsonStr = $infoObj | ConvertTo-Json -Compress
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
            $res.StatusCode = 200
            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $respBytes.Length
            $res.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $res.OutputStream.Flush()
            $res.Close()
            continue
        }

        # Real-time Cross-Device Sync API Endpoint
        if ($rawPath -eq "/api/sync") {
            $syncFile = [System.IO.Path]::Combine($baseDir, "data_sync.json")
            if ($req.HttpMethod -eq "POST") {
                $streamReader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                $body = $streamReader.ReadToEnd()
                $streamReader.Close()
                [System.IO.File]::WriteAllText($syncFile, $body, [System.Text.Encoding]::UTF8)
                
                $respBytes = [System.Text.Encoding]::UTF8.GetBytes("{`"status`":`"synced`"}")
                $res.StatusCode = 200
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $respBytes.Length
                $res.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $res.OutputStream.Flush()
            } else {
                if ([System.IO.File]::Exists($syncFile)) {
                    $bytes = [System.IO.File]::ReadAllBytes($syncFile)
                } else {
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes("{`"contacts`":[]}")
                }
                $res.StatusCode = 200
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.OutputStream.Flush()
            }
            $res.Close()
            continue
        }

        $localFilePath = [System.IO.Path]::Combine($baseDir, $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        $fullPath = [System.IO.Path]::GetFullPath($localFilePath)

        # Security check
        if (-not $fullPath.StartsWith([System.IO.Path]::GetFullPath($baseDir))) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }

        if ([System.IO.File]::Exists($fullPath)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            
            $res.StatusCode = 200
            $res.ContentType = $mime
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.OutputStream.Flush()
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $res.ContentLength64 = $msg.Length
            $res.OutputStream.Write($msg, 0, $msg.Length)
            $res.OutputStream.Flush()
        }
        $res.Close()
    } catch {
        Write-Host "[ERR] $($_.Exception.Message)" -ForegroundColor Red
        if ($res) { try { $res.Close() } catch {} }
    }
}
