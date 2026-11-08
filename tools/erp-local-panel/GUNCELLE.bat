@echo off
REM Panel kaynaklarini yenile (bu klasorde npm install + paneli yeniden baslat)
cd /d "%~dp0"
echo ERP Yerel Panel guncelleniyor...
call npm.cmd install --omit=dev
if errorlevel 1 (
  echo npm install basarisiz.
  pause
  exit /b 1
)
echo Tamam. Paneli kapatip Masaustu kisayolundan yeniden acin, sonra "Tam senkron" basin.
pause
