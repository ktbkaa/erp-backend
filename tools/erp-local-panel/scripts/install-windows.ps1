#Requires -Version 5.1
<#
.SYNOPSIS
  ERP Yerel Panel — Windows kurulumu (tek tık).

.DESCRIPTION
  - Node.js yoksa winget ile kurmayı dener
  - Panel klasörüne npm install
  - ERP klasörünü bulur / sorar → config.json + .env yazar
  - Haftalık Görev Zamanlayıcı kaydı (Pazar 17:00)
  - Oturum açılışında paneli başlatır
  - Tarayıcıda paneli açar

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -ErpRoot "C:\Users\ktbkt\OneDrive\Masaüstü\erp-backend"
#>
[CmdletBinding()]
param(
  [string]$ErpRoot = "",
  [string]$InstallDir = "",
  [int]$Port = 3920,
  [switch]$SkipTask,
  [switch]$SkipStartup,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Step([string]$msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "  XX  $msg" -ForegroundColor Red }

$PanelRoot = if ($InstallDir) {
  [System.IO.Path]::GetFullPath($InstallDir)
} else {
  # scripts\ → panel kökü
  Split-Path -Parent $PSScriptRoot
}

Write-Host "ERP Yerel Panel kurulumu" -ForegroundColor White
Write-Host "Panel: $PanelRoot"

if (-not (Test-Path (Join-Path $PanelRoot "package.json"))) {
  Write-Fail "package.json bulunamadı. Bu scripti panel klasöründen çalıştırın."
  exit 1
}

# --- Node.js ---
Write-Step "Node.js kontrol"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Warn "Node.js yok. winget ile kuruluyor..."
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    Write-Fail "winget yok. https://nodejs.org adresinden LTS kurun, sonra bu scripti tekrar çalıştırın."
    exit 1
  }
  & winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [System.Environment]::GetEnvironmentVariable("Path", "User")
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Fail "Node kuruldu ama PATH henüz güncel değil. PowerShell'i kapatıp açın, scripti tekrar çalıştırın."
    exit 1
  }
}
$nodeVer = (& node -v)
Write-Ok "Node $nodeVer"

# --- npm install (panel) ---
Write-Step "Panel bağımlılıkları (npm install)"
Push-Location $PanelRoot
try {
  & npm.cmd install --omit=dev
  if ($LASTEXITCODE -ne 0) { throw "npm install exit $LASTEXITCODE" }
  Write-Ok "npm install tamam"
} finally {
  Pop-Location
}

# --- ERP kökü bul ---
Write-Step "ERP klasörü"
function Test-ErpRoot([string]$path) {
  if (-not $path) { return $false }
  $pkg = Join-Path $path "package.json"
  if (-not (Test-Path $pkg)) { return $false }
  try {
    $j = Get-Content $pkg -Raw | ConvertFrom-Json
    return ($null -ne $j.scripts.migrate)
  } catch { return $false }
}

$candidates = @()
if ($ErpRoot) { $candidates += $ErpRoot }
$candidates += @(
  (Join-Path $env:USERPROFILE "OneDrive\Masaüstü\erp-backend"),
  (Join-Path $env:USERPROFILE "Desktop\erp-backend"),
  (Join-Path $env:USERPROFILE "OneDrive\Desktop\erp-backend"),
  (Join-Path $env:USERPROFILE "Documents\erp-backend"),
  "C:\erp-backend",
  (Join-Path (Split-Path $PanelRoot -Parent) "erp-backend")
)

$found = $null
foreach ($c in $candidates) {
  if ($c -and (Test-ErpRoot $c)) {
    $found = [System.IO.Path]::GetFullPath($c)
    break
  }
}

if (-not $found) {
  Write-Warn "ERP klasörü otomatik bulunamadı (migrate script'li package.json aranıyor)."
  Write-Host "Örnek: C:\Users\$env:USERNAME\OneDrive\Masaüstü\erp-backend"
  $manual = Read-Host "ERP klasörünün tam yolu"
  if (-not (Test-ErpRoot $manual)) {
    Write-Fail "Geçersiz ERP klasörü veya migrate script yok. Doğru branch'i klonladığınızdan emin olun."
    exit 1
  }
  $found = [System.IO.Path]::GetFullPath($manual)
}
Write-Ok "ERP: $found"

# --- config.json + .env ---
Write-Step "config.json ve .env yazılıyor"
$config = @{
  port = $Port
  erpRoot = $found
  schedule = @{
    enabled = $true
    cron = "0 17 * * 0"
    timezone = "Europe/Istanbul"
  }
  steps = @{
    gitPull = $true
    npmInstall = $true
    migrate = $true
    backup = $true
  }
  pgDumpPath = ""
  backupDir = (Join-Path $found "backups")
}
$configPath = Join-Path $PanelRoot "config.json"
$config | ConvertTo-Json -Depth 6 | Set-Content -Path $configPath -Encoding UTF8
Write-Ok "config.json"

$envLines = @(
  "PORT=$Port",
  "ERP_ROOT=$found"
)
# pg_dump otomatik yol
$pgCandidates = @(
  "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
)
$pgFound = $null
foreach ($p in $pgCandidates) {
  if (Test-Path $p) { $pgFound = $p; break }
}
if (-not $pgFound) {
  $pgRoots = @("C:\Program Files\PostgreSQL", "C:\Program Files (x86)\PostgreSQL")
  foreach ($root in $pgRoots) {
    if (-not (Test-Path $root)) { continue }
    Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $c = Join-Path $_.FullName "bin\pg_dump.exe"
      if ((-not $pgFound) -and (Test-Path $c)) { $pgFound = $c }
    }
  }
}
if ($pgFound) {
  $envLines += "PG_DUMP_PATH=$pgFound"
  Write-Ok "pg_dump: $pgFound"
} else {
  Write-Warn "pg_dump bulunamadı — yedek için pgAdmin Backup veya PostgreSQL Command Line Tools gerekir."
}

$envPath = Join-Path $PanelRoot ".env"
$envLines -join "`r`n" | Set-Content -Path $envPath -Encoding UTF8
Write-Ok ".env"

# --- Haftalık görev ---
if (-not $SkipTask) {
  Write-Step "Haftalık Görev Zamanlayıcı (Pazar 17:00)"
  $reg = Join-Path $PSScriptRoot "register-weekly-task.ps1"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $reg -PanelRoot $PanelRoot
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "Görev kaydı başarısız olabilir (yönetici gerekebilir). Manuel: scripts\register-weekly-task.ps1"
  } else {
    Write-Ok "Görev: ERP-Local-Weekly-Sync"
  }
}

# --- Startup ---
if (-not $SkipStartup) {
  Write-Step "Oturum açılışında panel"
  $startup = [Environment]::GetFolderPath("Startup")
  $cmdPath = Join-Path $startup "ERP-Yerel-Panel.cmd"
  $startPs1 = Join-Path $PSScriptRoot "start-panel.ps1"
  $cmd = "@echo off`r`npowershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startPs1`" -PanelRoot `"$PanelRoot`"`r`n"
  Set-Content -Path $cmdPath -Value $cmd -Encoding ASCII
  Write-Ok "Startup: $cmdPath"
}

# --- Masaüstü kısayolu ---
Write-Step "Masaüstü kısayolu"
try {
  $desktop = [Environment]::GetFolderPath("Desktop")
  $lnkPath = Join-Path $desktop "ERP Yerel Panel.lnk"
  $wsh = New-Object -ComObject WScript.Shell
  $lnk = $wsh.CreateShortcut($lnkPath)
  $lnk.TargetPath = "powershell.exe"
  $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'start-panel.ps1')`" -PanelRoot `"$PanelRoot`" -OpenBrowser"
  $lnk.WorkingDirectory = $PanelRoot
  $lnk.Description = "ERP Yerel Senkron Paneli"
  $lnk.Save()
  Write-Ok $lnkPath
} catch {
  Write-Warn "Kısayol oluşturulamadı: $_"
}

# --- Paneli başlat ---
Write-Step "Panel başlatılıyor"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "start-panel.ps1") -PanelRoot $PanelRoot
Start-Sleep -Seconds 2

if (-not $NoBrowser) {
  Start-Process "http://127.0.0.1:$Port/"
}

Write-Host ""
Write-Host "Kurulum bitti." -ForegroundColor Green
Write-Host "Panel: http://127.0.0.1:$Port/"
Write-Host "Tam senkron butonu veya Pazar 17:00 otomatik çalışır."
Write-Host ""
