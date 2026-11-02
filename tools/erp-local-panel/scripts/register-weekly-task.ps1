#Requires -Version 5.1
<#
.SYNOPSIS
  Windows Görev Zamanlayıcı'ya haftalık senkron kaydı (Pazar 17:00 Europe/Istanbul duvar saati).
#>
[CmdletBinding()]
param(
  [string]$PanelRoot = "",
  [string]$TaskName = "ERP-Local-Weekly-Sync",
  [string]$Time = "17:00"
)

$ErrorActionPreference = "Stop"

if (-not $PanelRoot) {
  $PanelRoot = Split-Path -Parent $PSScriptRoot
}
$PanelRoot = [System.IO.Path]::GetFullPath($PanelRoot)
$runScript = Join-Path $PanelRoot "scripts\run-weekly.ps1"
if (-not (Test-Path $runScript)) {
  Write-Error "run-weekly.ps1 yok: $runScript"
  exit 1
}

# Eski görev varsa kaldır
schtasks /Delete /TN $TaskName /F 2>$null | Out-Null

$psArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$runScript`" -PanelRoot `"$PanelRoot`""
# /SC WEEKLY /D SUN /ST 17:00 — yerel saat (Windows saat dilimi Europe/Istanbul olmalı)
$create = schtasks /Create /TN $TaskName /TR "powershell.exe $psArgs" /SC WEEKLY /D SUN /ST $Time /RL LIMITED /F
if ($LASTEXITCODE -ne 0) {
  Write-Error "schtasks başarısız (exit $LASTEXITCODE). Yönetici PowerShell deneyin.`n$create"
  exit 1
}

Write-Host "Görev kaydedildi: $TaskName"
Write-Host "  Zaman: her Pazar $Time (Windows yerel saati)"
Write-Host "  Komut: powershell.exe $psArgs"
Write-Host "  Test:  schtasks /Run /TN $TaskName"
exit 0
