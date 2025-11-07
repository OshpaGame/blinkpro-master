@echo off
setlocal EnableDelayedExpansion
title 🚀 BlinkPro Master - Auto Sync + Full Deploy (con /public)
color 0B
chcp 65001 >nul

echo ============================================
echo     🚀 BlinkPro Master - Auto Sync + Backup
echo ============================================
echo.

REM === Ir al directorio raíz del proyecto ===
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

REM === Limpiar bloqueos previos de Git ===
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

REM === Detectar rama actual ===
for /f "tokens=*" %%b in ('git branch --show-current') do set "BRANCH=%%b"
if "%BRANCH%"=="" set "BRANCH=main"
echo 🧭 Rama actual: %BRANCH%
echo.

REM === Crear/actualizar .gitignore ===
(
echo node_modules/
echo backups/
echo *.log
echo .env
)>".gitignore"

echo ✅ .gitignore actualizado (se incluirá la carpeta /public completa).
echo.

REM === Incluir carpeta /public en Git (por si estaba ignorada antes) ===
git add -f public >nul 2>&1
echo 📁 Forzando inclusión de /public en seguimiento.
echo.

REM === Preparar cambios para commit ===
echo 🔄 Preparando cambios para commit...
git add -A >nul 2>&1
git restore --staged node_modules >nul 2>&1
echo ✅ Archivos preparados.

git diff --cached --quiet
if errorlevel 1 (
    set "MSG=📦 Actualización BlinkPro Master (%DATE% %TIME%)"
    git commit -m "!MSG!" >nul 2>&1
    echo ✅ Commit creado: "!MSG!"
) else (
    echo ⚙️ No hay cambios nuevos que guardar.
)
echo.

REM === Actualizar desde GitHub ===
echo 📥 Actualizando rama %BRANCH% desde remoto...
git fetch origin %BRANCH% >nul 2>&1
git pull --rebase origin %BRANCH%
if errorlevel 1 (
    echo ⚠️ Conflicto detectado o error de rebase.
    echo Abriendo Visual Studio Code para resolverlo...
    code .
    pause
    exit /b
)
echo ✅ Rebase limpio completado.
echo.

REM === Subir cambios ===
echo 🚀 Subiendo cambios al repositorio remoto...
git push origin %BRANCH%
if errorlevel 1 (
    echo ❌ Error al subir los cambios.
    echo Verifica tus credenciales o conexión a GitHub.
    pause
    exit /b
)
echo ✅ Cambios subidos correctamente a GitHub.
echo.

REM === Limpiar respaldos antiguos (mantener 5 últimos) ===
echo 🧹 Limpiando respaldos antiguos...
for /f "skip=5 delims=" %%F in ('dir "%BACKUP_DIR%\blinkpro_backup_*.zip" /b /o-d') do del /q "%BACKUP_DIR%\%%F" >nul 2>&1
echo ✅ Limpieza completada.
echo.

REM === Render.com check ===
if exist "render.yaml" (
    echo 🧰 Archivo render.yaml detectado — Render redeployará automáticamente.
) else (
    echo ⚠️ No se encontró render.yaml — verifica el panel de Render.
)
echo.

REM === Confirmación final ===
echo ============================================
echo 🎉 ¡Actualización completada con éxito!
echo 🌐 Render redeployará los cambios automáticamente.
echo ============================================
echo.
echo 🔗 Panel web: https://blinkpro-master.onrender.com
echo 📦 Repo: https://github.com/OshpaGame/blinkpro-master
echo 💾 Backup generado: %BACKUP_FILE%
echo 📂 Carpeta incluida: /public (HTML, scripts y APKs)
echo.

pause
exit /b

