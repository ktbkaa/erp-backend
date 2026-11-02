#Requires -Version 5.1
<#
.SYNOPSIS
  Haftalik senkron (Task Scheduler tarafindan cagrilir).
  Panel kapali olsa bile CLI uzerinden sync calistirir.
#>
[CmdletBinding()]
param(
  [string]$PanelRoot = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if (-not $PanelRoot) {
  $PanelRoot = Split-Path -Parent $PSScriptRoot
}
$PanelRoot = [System.IO.Path]::GetFullPath($PanelRoot)

$logDir = Join-Path $PanelRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$runLog = Join-Path $logDir "weekly-$stamp.log"

function Log([string]$msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  Add-Content -Path $runLog -Value $line -Encoding UTF8
  Write-Host $line
}

Log "Haftalik senkron basladi - $PanelRoot"

Push-Location $PanelRoot
try {
  if (-not (Test-Path (Join-Path $PanelRoot "node_modules"))) {
    Log "npm install..."
    & npm.cmd install --omit=dev 2>&1 | Tee-Object -FilePath $runLog -Append
  }

  Log "node src/cli.js sync"
  & node "src\cli.js" sync 2>&1 | Tee-Object -FilePath $runLog -Append
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    Log "Senkron HATA (exit $code)"
    exit $code
  }
  Log "Senkron tamam"
  exit 0
} catch {
  Log "HATA: $_"
  exit 1
} finally {
  Pop-Location
}
