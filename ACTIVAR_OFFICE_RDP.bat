@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ACTIVAR LICENCIAMIENTO COMPARTIDO DE OFFICE (RDP)

:: Auto-elevar a Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de Administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   CONFIGURANDO OFFICE SHARED LICENSING PARA RDP
echo ========================================================
echo.

echo [1/3] Habilitando SharedComputerLicensing en el Registro...
reg add "HKLM\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" /v SharedComputerLicensing /t REG_SZ /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Office\16.0\Common\Licensing" /v SharedComputerLicensing /t REG_DWORD /d 1 /f

echo.
echo [2/3] Ajustando permisos de lectura para usuarios en licencias...
icacls "C:\ProgramData\Microsoft\Office\Licensing" /grant Users:(OI)(CI)RX /T /Q

echo.
echo [3/3] Reiniciando servicio de Office ClickToRunSvc...
net stop ClickToRunSvc
timeout /t 2 /nobreak >nul
net start ClickToRunSvc

echo.
echo ========================================================
echo   CONFIGURACION COMPLETADA CON EXITO
echo ========================================================
pause
