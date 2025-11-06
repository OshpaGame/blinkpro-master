@echo off
title 🚀 BlinkPro Master - Auto Sync to Render
color 0B

echo ============================================
echo   BlinkPro Master - Auto Sync to Render
echo ============================================
echo.

REM --- Cambiar al directorio del proyecto ---
cd /d "%~dp0"

REM --- Verificar conexión a Internet ---
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    echo ❌ No hay conexión a Internet. Verifica tu red.
    pause
    exit /b
)

echo 🔍 Verificando si hay rebase pendiente...
if exist ".git\rebase-merge" (
    echo ⚠️ Se detectó un rebase pendiente, abortando...
    git rebase --abort >nul 2>&1
    rmdir /s /q ".git\rebase-merge" >nul 2>&1
    echo ✅ Rebase anterior cancelado correctamente.
)
echo.

echo 🔄 Guardando cambios locales...
git add .
git commit -m "Actualización automática del servidor BlinkPro Master" >nul 2>&1 || echo (sin cambios locales)

echo.
echo 📥 Descargando cambios desde GitHub (rebase limpio)...
git fetch origin main >nul 2>&1
git pull --rebase origin main

if errorlevel 1 (
    echo ⚠️ Hubo conflictos de fusión o archivos modificados manualmente.
    echo Abriendo proyecto en Visual Studio Code para revisión...
    code .
    pause
    exit /b
)

echo.
echo 🚀 Subiendo cambios a GitHub (forzando sincronización)...
git push -f origin main

if errorlevel 1 (
    echo ❌ Error al subir cambios. Verifica tus credenciales o conexión.
    pause
    exit /b
)

echo.
echo ✅ ¡Actualización completada con éxito!
echo 🌐 Render detectará el nuevo commit y redeployará automáticamente.
echo.
echo Abre tu panel aquí:
echo 🔗 https://blinkpro-master.onrender.com
echo.

pause
exit
