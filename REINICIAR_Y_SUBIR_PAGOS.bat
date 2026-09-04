@echo off
chcp 65001 >nul

:: Auto-elevación a Administrador si no se ejecutó como admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title REINICIAR CONTPAQI API Y SUBIR PAGOS (29/08 - 04/09)
echo ======================================================
echo    REINICIAR CONTPAQI API Y SUBIR PAGOS (29/08 - 04/09)
echo ======================================================
echo.

echo [1/3] Reiniciando servicio de Windows ContpaqiApi...
powershell -Command "Restart-Service ContpaqiApi -Force"
if %errorLevel% neq 0 (
    echo [!] Reintentando con sc stop / sc start...
    sc stop ContpaqiApi
    timeout /t 3 /nobreak >nul
    sc start ContpaqiApi
)

echo.
echo [2/3] Esperando 5 segundos a que la API responda...
timeout /t 5 /nobreak >nul

echo.
echo [3/3] Iniciando subida de 496 pagos a ContPAQi Comercial...
cd /d "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp"
node scratch/ejecutar-subir-pagos-contpaqi.js

echo.
echo ======================================================
echo    PROCESO COMPLETADO EXITOSAMENTE
echo ======================================================
pause
