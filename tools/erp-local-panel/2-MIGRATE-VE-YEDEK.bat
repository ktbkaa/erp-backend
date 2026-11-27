@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  Migrate ve yedek calisiyor. Pencereyi kapatmayin.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$panel='%~dp0';" ^
  "$erp='';" ^
  "$cfg=Join-Path $panel 'config.json';" ^
  "if (Test-Path $cfg) { try { $j=Get-Content $cfg -Raw -Encoding UTF8 | ConvertFrom-Json; $erp=[string]$j.erpRoot } catch {} };" ^
  "if (-not $erp -or -not (Test-Path (Join-Path $erp 'package.json'))) {" ^
  "  $cands=@(" ^
  "    (Join-Path $env:USERPROFILE 'OneDrive\Masaüstü\erp-backend')," ^
  "    (Join-Path $env:USERPROFILE 'Desktop\erp-backend')," ^
  "    (Join-Path $env:USERPROFILE 'OneDrive\Desktop\erp-backend')" ^
  "  ); foreach($c in $cands){ if(Test-Path (Join-Path $c 'package.json')){ $erp=$c; break } }" ^
  "};" ^
  "if (-not $erp -or -not (Test-Path (Join-Path $erp 'package.json'))) { Write-Host 'ERP klasoru bulunamadi'; exit 1 };" ^
  "Write-Host ('ERP: ' + $erp);" ^
  "Set-Location $erp;" ^
  "$env:Path = $env:ProgramFiles + '\nodejs;' + $env:Path;" ^
  "Write-Host '1/2 migrate...';" ^
  "& npm.cmd run migrate; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };" ^
  "Write-Host '2/2 yedek...';" ^
  "& npm.cmd run db:backup; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE };" ^
  "Write-Host 'TAMAM. Migrate ve yedek bitti.';"

if errorlevel 1 (
  echo.
  echo  Hata oldu. Yukaridaki yaziyi okuyun.
  pause
  exit /b 1
)

echo.
pause
endlocal
