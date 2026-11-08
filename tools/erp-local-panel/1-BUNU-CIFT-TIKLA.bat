@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ERP Yerel Panel
echo.
echo  Kurulum / guncelleme basliyor...
echo  (Biraz bekleyin, pencereyi kapatmayin)
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  Node.js yok. Once https://nodejs.org adresinden LTS kurun,
  echo  bilgisayari yeniden baslatin, sonra bu dosyaya tekrar cift tiklayin.
  echo.
  pause
  exit /b 1
)

call npm.cmd install --omit=dev
if errorlevel 1 (
  echo.
  echo  Kurulum yarida kaldi. Internet baglantinizi kontrol edip tekrar deneyin.
  pause
  exit /b 1
)

echo.
echo  Tamam. Panel aciliyor...
start "" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-panel.ps1" -PanelRoot "%~dp0" -OpenBrowser
timeout /t 2 /nobreak >nul
echo.
echo  Tarayicide panel acildiysa "Tam senkron" dugmesine basin.
echo  Kirmizi yazi gorurseniz sorun degil — senkron yine tamamlanir.
echo.
pause
