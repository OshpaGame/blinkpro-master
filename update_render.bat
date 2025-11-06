@echo off
setlocal EnableDelayedExpansion
title 🚀 BlinkPro Master - Auto Sync + Backup to Render
color 0B
chcp 65001 >nul

echo ============================================
echo     🚀 BlinkPro Master - Auto Sync + Backup
echo ============================================
echo.

REM === Cambiar al directorio del script ===
cd /d "%~dp0"

REM === Verificar conexión a Internet ===
echo 🌐 Verificando conexión a Internet...
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    echo ❌ No hay conexión a Internet. Verifica tu red.
    pause
    exit /b
)
echo ✅ Conexión establecida correctamente.
echo.

REM === Crear carpeta de backups ===
set "BACKUP_DIR=%~dp0backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM === Generar fecha/hora segura ===
for /f "delims=" %%A in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do (
    set "DATESTR=%%A"
)
if "!DATESTR!"=="" (
    echo ❌ Error al obtener la fecha desde PowerShell.
    pause
    exit /b
)

set "BACKUP_FILE=%BACKUP_DIR%\blinkpro_backup_!DATESTR!.zip"
echo 💾 Creando respaldo de seguridad...
powershell -NoProfile -Command ^
  "Compress-Archive -Path * -DestinationPath '%BACKUP_FILE%' -Force -CompressionLevel Optimal" >nul 2>&1

if exist "%BACKUP_FILE%" (
    echo ✅ Respaldo creado: "%BACKUP_FILE%"
) else (
    echo ⚠️ No se pudo crear el respaldo.
)
echo.

REM === Limpiar bloqueos previos ===
if exist ".git\index.lock" (
    del /f /q ".git\index.lock"
    echo 🧹 Eliminado archivo de bloqueo index.lock.
)
if exist ".git\rebase-merge" (
    git rebase --abort >nul 2>&1
    rmdir /s /q ".git\rebase-merge" >nul 2>&1
    echo ⚠️ Rebase pendiente cancelado.
)
echo.

REM === Preparar commit ===
echo 🔄 Preparando cambios para commit...
git add -A >nul 2>&1
git restore --staged node_modules >nul 2>&1
echo ✅ Archivos listos para commit.

git commit -m "Actualización automática completa del servidor BlinkPro Master" >nul 2>&1
if errorlevel 1 (
    echo ⚙️ No hay cambios nuevos para guardar.
) else (
    echo ✅ Cambios confirmados correctamente.
)
echo.

REM === Rebase y sincronización ===
echo 📥 Actualizando desde GitHub...
git fetch origin main >nul 2>&1
git pull --rebase origin main
if errorlevel 1 (
    echo ⚠️ Conflicto detectado o error de rebase.
    echo Abriendo Visual Studio Code...
    code .
    pause
    exit /b
)
echo ✅ Rebase limpio completado.
echo.

REM === Subir cambios ===
echo 🚀 Subiendo commits al repositorio remoto...
git push -f origin main
if errorlevel 1 (
    echo ❌ Error al subir los cambios.
    pause
    exit /b
)
echo ✅ Cambios subidos correctamente.
echo.

REM === Confirmación final ===
echo ============================================
echo 🎉 ¡Actualización completada con éxito!
echo 🌐 Render redeployará automáticamente.
echo ============================================
echo.
echo 🔗 Panel web: https://blinkpro-master.onrender.com
echo 📦 Repo: https://github.com/OshpaGame/blinkpro-master
echo 📂 Backup: %BACKUP_FILE%
echo.

pause
exit /b
