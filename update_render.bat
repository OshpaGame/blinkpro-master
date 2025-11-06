@echo off
title 🚀 Actualizador BlinkPro Master (GitHub + Render)
color 0B

echo ============================================
echo   BlinkPro Master - Auto Sync to Render
echo ============================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Verificar conexión a Internet
ping -n 1 github.com >nul 2>&1
if errorlevel 1 (
    echo ❌ No hay conexión a Internet. Verifica tu red.
    pause
    exit /b
)

echo 🔍 Verificando cambios locales...
git status

echo.
echo 🔄 Guardando cambios locales...
git add .
git commit -m "Actualización automática del servidor BlinkPro Master" || echo (sin cambios)

echo.
echo 📥 Descargando cambios de GitHub (rebase)...
git pull --rebase origin main

if errorlevel 1 (
    echo ⚠️ Hubo conflictos de fusión. Revísalos en Visual Studio Code.
    code .
    pause
    exit /b
)

echo.
echo 🚀 Subiendo cambios a GitHub...
git push -f origin main

if errorlevel 1 (
    echo ❌ Error al subir los cambios. Verifica tu conexión o credenciales.
    pause
    exit /b
)

echo.
echo ✅ ¡Actualización completada con éxito!
echo 🌐 Render detectará el nuevo commit y redeployará automáticamente.
echo.
echo Abre tu panel en: https://blinkpro-master.onrender.com
echo.

pause
exit
