#Requires -Version 5.1
<#
.SYNOPSIS
  ERP Yerel Panel'i arka planda başlatır (zaten açıksa yeniden başlatmaz).
#>
[CmdletBinding()]
param(
  [string]$PanelRoot = "",
  [switch]$OpenBrowser,
  [switch]$ForceRestart
)

$ErrorActionPreference = "Stop"

if (-not $PanelRoot) {
  $PanelRoot = Split-Path -Parent $PSScriptRoot
}
$PanelRoot = [System.IO.Path]::GetFullPath($PanelRoot)
$serverJs = Join-Path $PanelRoot "src\server.js"
if (-not (Test-Path $serverJs)) {
  Write-Error "server.js yok: $serverJs"
  exit 1
}

$port = 3920
$configPath = Join-Path $PanelRoot "config.json"
if (Test-Path $configPath) {
  try {
    $cfg = Get-Content $configPath -Raw | ConvertFrom-Json
    if ($cfg.port) { $port = [int]$cfg.port }
  } catch { }
}
$envFile = Join-Path $PanelRoot ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*PORT\s*=\s*(\d+)') { $port = [int]$Matches[1] }
  }
}

function Test-PanelUp {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/status" -UseBasicParsing -TimeoutSec 2
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Stop-PanelProcesses {
  Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.CommandLine -and (
        $_.CommandLine -like "*erp-local-panel*server.js*" -or
        $_.CommandLine -like "*$serverJs*"
      )
    } |
    ForEach-Object {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

if ($ForceRestart) {
  Stop-PanelProcesses
  Start-Sleep -Milliseconds 600
}

if (Test-PanelUp) {
  Write-Host "Panel zaten çalışıyor: http://127.0.0.1:$port/"
  if ($OpenBrowser) { Start-Process "http://127.0.0.1:$port/" }
  exit 0
}

$logDir = Join-Path $PanelRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$outLog = Join-Path $logDir "server.out.log"
$errLog = Join-Path $logDir "server.err.log"

Start-Process -FilePath "node" `
  -ArgumentList "`"$serverJs`"" `
  -WorkingDirectory $PanelRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog |
  Out-Null

$ok = $false
for ($i = 0; $i -lt 25; $i++) {
  Start-Sleep -Milliseconds 400
  if (Test-PanelUp) { $ok = $true; break }
}

if ($ok) {
  Write-Host "Panel açıldı: http://127.0.0.1:$port/"
  if ($OpenBrowser) { Start-Process "http://127.0.0.1:$port/" }
  exit 0
}

Write-Error "Panel başlamadı. logs\server.err.log dosyasına bakın."
exit 1
