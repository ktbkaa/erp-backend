#Requires -Version 5.1
<#
.SYNOPSIS
  Panel görevlerini / kısayolları kaldırır (klasörü silmez).
#>
[CmdletBinding()]
param(
  [string]$TaskName = "ERP-Local-Weekly-Sync"
)

$ErrorActionPreference = "Continue"

schtasks /Delete /TN $TaskName /F 2>$null | Out-Null
Write-Host "Görev silindi (varsa): $TaskName"

$startup = Join-Path ([Environment]::GetFolderPath("Startup")) "ERP-Yerel-Panel.cmd"
if (Test-Path $startup) {
  Remove-Item $startup -Force
  Write-Host "Startup kaldırıldı: $startup"
}

$desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "ERP Yerel Panel.lnk"
if (Test-Path $desktop) {
  Remove-Item $desktop -Force
  Write-Host "Kısayol kaldırıldı: $desktop"
}

Write-Host "Panel klasörünü elle silebilirsiniz. node süreçlerini Görev Yöneticisi'nden kapatın."
