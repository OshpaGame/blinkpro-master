@echo off
title 🚀 BlinkPro Master - Auto Sync to Render
color 0B
chcp 65001 >nul

echo ============================================
echo    🚀 BlinkPro Master - Auto Sync to Render
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

REM === Cancelar rebase previo si existe ===
if exist ".git\rebase-merge" (
    echo ⚠️ Se detectó un rebase pendiente. Abortando...
    git rebase --abort >nul 2>&1
    rmdir /s /q ".git\rebase-merge" >nul 2>&1
    echo ✅ Rebase cancelado y limpiado.
    echo.
)

REM === Limpiar locks que bloquean git ===
if exist ".git\index.lock" (
    del /f /q ".git\index.lock"
    echo 🧹 Eliminado index.lock bloqueado.
)

REM === Guardar cambios locales ===
echo 💾 Guardando cambios locales...
git add . >nul 2>&1
git commit -m "Actualización automática del servidor BlinkPro Master" >nul 2>&1
if errorlevel 1 (
    echo ⚙️ Sin cambios locales para confirmar.
) else (
    echo ✅ Cambios guardados correctamente.
)
echo.

REM === Actualizar desde GitHub ===
echo 📥 Descargando y fusionando cambios desde GitHub...
git fetch origin main >nul 2>&1
git pull --rebase origin main
if errorlevel 1 (
    echo ⚠️ Se detectaron conflictos o errores de fusión.
    echo Abriendo proyecto en Visual Studio Code para revisión manual...
    code .
    pause
    exit /b
)
echo ✅ Rebase limpio completado.
echo.

REM === Subir cambios a GitHub ===
echo 🚀 Subiendo commits al repositorio remoto...
git push -f origin main
if errorlevel 1 (
    echo ❌ Error al subir cambios. Verifica tus credenciales o conexión.
    pause
    exit /b
)
echo ✅ Cambios subidos correctamente.
echo.

REM === Confirmación final ===
echo ============================================
echo 🎉 ¡Actualización completada con éxito!
echo 🌐 Render detectará el nuevo commit y redeployará automáticamente.
echo ============================================
echo.
echo 🔗 Panel web: https://blinkpro-master.onrender.com
echo 📦 Repositorio: https://github.com/OshpaGame/blinkpro-master
echo.

REM === Abrir Render automáticamente ===
start https://blinkpro-master.onrender.com

pause
exit /b
