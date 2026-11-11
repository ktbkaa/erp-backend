@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

echo.
echo  ERP yerel onarim (migrate + heal). Veri SILINMEZ.
echo  Klasor: %CD%
echo.

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm bulunamadi. Node.js kurulu mu?
  pause
  exit /b 1
)

echo [1/4] npm install...
call npm.cmd install
if errorlevel 1 goto :fail

echo [2/4] migrate...
call npm.cmd run migrate
if errorlevel 1 goto :fail

echo [3/4] local:heal --seed-ornek...
call npm.cmd run local:heal -- --seed-ornek
if errorlevel 1 goto :fail

echo [4/4] Tamam.
echo.
echo  Simdi: npm start
echo  Tarayici: Ctrl+F5
echo  Firma profilinde GIDA secili olmali.
echo.
pause
exit /b 0

:fail
echo.
echo  Hata. Yukaridaki satirlari buraya yapistirin.
pause
exit /b 1
