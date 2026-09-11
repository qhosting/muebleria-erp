@echo off
chcp 65001 >nul
title ACTIVAR LICENCIAMIENTO COMPARTIDO DE OFFICE (RDP)

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
echo   CONFIGURACIÓN COMPLETADA CON ÉXITO
echo ========================================================
pause
