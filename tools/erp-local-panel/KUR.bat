@echo off
chcp 65001 >nul
title ERP Yerel Panel Kurulum
cd /d "%~dp0"
echo.
echo  ERP Yerel Panel kuruluyor...
echo  Bu pencereyi kapatmayin.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
set ERR=%ERRORLEVEL%
echo.
if %ERR% NEQ 0 (
  echo Kurulum hata ile bitti. Kod: %ERR%
) else (
  echo Kurulum tamam.
)
pause
