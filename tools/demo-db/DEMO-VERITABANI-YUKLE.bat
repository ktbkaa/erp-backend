@echo off
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo.
echo  KTB ERP - demo veritabani yukleme
echo  ---------------------------------
echo  Demo dump (ktb_erp_demo*.sql.gz) yeni "ktb_erp" veritabanina yuklenir.
echo  Mevcut veritabaniniz silinmez; .env yedeklenip DB_NAME=ktb_erp yapilir.
echo  Varsayilan dosya: tools\demo-db\ktb_erp_demo.sql.gz (depoyla gelir).
echo.

set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js bulunamadi. Once Node.js kurun.
  pause
  exit /b 1
)

if not exist node_modules\pg (
  echo  Paketler kuruluyor...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

node scripts\db-restore-demo.js %*
if errorlevel 2 (
  echo.
  choice /M " ktb_erp zaten var. Silip yeniden yuklensin mi"
  if errorlevel 2 goto :end
  node scripts\db-restore-demo.js %* --force
)
if errorlevel 1 goto :fail

echo.
echo  Migration kontrolu...
call npm.cmd run migrate
if errorlevel 1 goto :fail

echo.
echo  TAMAM. Sunucuyu yeniden baslatin: npm start
goto :end

:fail
echo.
echo  Hata oldu. Yukaridaki yaziyi okuyun.
pause
exit /b 1

:end
echo.
pause
endlocal
