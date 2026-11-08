@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo  Kurulum basliyor. Pencereyi kapatmayin.
echo.

set "NODE_EXE="
where node >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%i in ('where node') do (
    if not defined NODE_EXE set "NODE_EXE=%%i"
  )
)
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\node\node.exe" set "NODE_EXE=%LocalAppData%\Programs\node\node.exe"

if not defined NODE_EXE (
  echo  Node.js yok. Simdi kuruluyor. Biraz surebilir.
  echo.
  where winget >nul 2>&1
  if errorlevel 1 (
    echo  Otomatik kurulum yapilamadi.
    echo  Acilan siteden LTS kurun, bilgisayari yeniden acin,
    echo  sonra bu dosyaya tekrar cift tiklayin.
    echo.
    start "" "https://nodejs.org/en/download"
    pause
    exit /b 1
  )
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
)

if not defined NODE_EXE (
  where node >nul 2>&1
  if not errorlevel 1 set "NODE_EXE=node"
)

if not defined NODE_EXE (
  echo  Node kuruldu ama henuz bulunamadi.
  echo  Bilgisayari kapatip acin, sonra bu dosyaya tekrar cift tiklayin.
  echo.
  pause
  exit /b 1
)

echo  Node bulundu.
echo  Paketler yukleniyor...
echo.

set "PATH=%ProgramFiles%\nodejs;%PATH%"
call npm.cmd install --omit=dev
if errorlevel 1 (
  echo.
  echo  Yukleme yarida kaldi. Interneti kontrol edip tekrar deneyin.
  pause
  exit /b 1
)

echo.
echo  Tamam. Panel aciliyor...

REM %~dp0 sonunda \ var; tirnak icinde \" bozulmasin diye . ekliyoruz
set "PANEL_ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-panel.ps1" -PanelRoot "%PANEL_ROOT%." -OpenBrowser
if errorlevel 1 (
  echo.
  echo  Panel acilamadi. Asagidaki adresi elle acmayi deneyin:
  echo  http://127.0.0.1:3920/
  start "" "http://127.0.0.1:3920/"
)

echo.
echo  Tarayicide Tam senkron dugmesine basin.
echo  Kirmizi yazi cikarsa sorun degil, senkron yine biter.
echo.
pause
endlocal
