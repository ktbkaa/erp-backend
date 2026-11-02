#Requires -Version 5.1
<#
.SYNOPSIS
  Panel gorevlerini / kisayollari kaldirir (klasoru silmez).
#>
[CmdletBinding()]
param(
  [string]$TaskName = "ERP-Local-Weekly-Sync"
)

$ErrorActionPreference = "Continue"

schtasks /Delete /TN $TaskName /F 2>$null | Out-Null
Write-Host "Gorev silindi (varsa): $TaskName"

$startup = Join-Path ([Environment]::GetFolderPath("Startup")) "ERP-Yerel-Panel.cmd"
if (Test-Path $startup) {
  Remove-Item $startup -Force
  Write-Host "Startup kaldirildi: $startup"
}

$desktop = Join-Path ([Environment]::GetFolderPath("Desktop")) "ERP Yerel Panel.lnk"
if (Test-Path $desktop) {
  Remove-Item $desktop -Force
  Write-Host "Kisayol kaldirildi: $desktop"
}

Write-Host "Panel klasorunu elle silebilirsiniz. node sureclerini Gorev Yoneticisi'nden kapatin."
