@echo off
setlocal EnableExtensions EnableDelayedExpansion
title REPARAR EXCEL PARA CONTPAQI

:: 1. Auto-elevar a Administrador si no se ejecuto como tal
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo   Solicitando permisos de Administrador...
    echo ========================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   REPARANDO EXCEL PARA REPORTEADOR CONTPAQI
echo ========================================================
echo.

echo [1/3] Creando carpetas Desktop del sistema...
if not exist "C:\Windows\System32\config\systemprofile\Desktop" (
    mkdir "C:\Windows\System32\config\systemprofile\Desktop"
    echo   + Creada: C:\Windows\System32\config\systemprofile\Desktop
) else (
    echo   - Ya existe en System32
)

if not exist "C:\Windows\SysWOW64\config\systemprofile\Desktop" (
    mkdir "C:\Windows\SysWOW64\config\systemprofile\Desktop"
    echo   + Creada: C:\Windows\SysWOW64\config\systemprofile\Desktop
) else (
    echo   - Ya existe en SysWOW64
)

echo.
echo [2/3] Asignando permisos a las carpetas Desktop...
icacls "C:\Windows\System32\config\systemprofile\Desktop" /grant "Todos":(OI)(CI)F /grant "Users":(OI)(CI)F /grant "Usuarios":(OI)(CI)F /T /Q >nul 2>&1
icacls "C:\Windows\SysWOW64\config\systemprofile\Desktop" /grant "Todos":(OI)(CI)F /grant "Users":(OI)(CI)F /grant "Usuarios":(OI)(CI)F /T /Q >nul 2>&1
echo   + Permisos asignados correctamente.

echo.
echo [3/3] Cerrando procesos colgados de Excel...
taskkill /F /IM EXCEL.EXE /T >nul 2>&1
echo   + Instancias previas de Excel limpiadas.

echo.
echo ========================================================
echo   REPARACION COMPLETADA CON EXITO
echo ========================================================
echo.
echo Ya puedes abrir ContPAQi y generar tu reporte en Excel.
echo.
pause
