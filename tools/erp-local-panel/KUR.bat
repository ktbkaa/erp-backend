@echo off
chcp 65001 >nul
title ERP Yerel Panel Kurulum
cd /d "%~dp0"
echo.
echo  ERP Yerel Panel kuruluyor...
echo  Bu pencereyi kapatmayin.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows.ps1"
echo.
pause
