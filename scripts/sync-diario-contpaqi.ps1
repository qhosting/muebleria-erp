# Script de sincronización diaria ContPAQi -> muebleria-erp (clientes_consulta_bot)
param(
    [switch]$Silencioso
)

$ErrorActionPreference = "Stop"
$LogPath = "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp\scripts\sync_diario.log"
$WahaUrl = "https://noweb.qhosting.net/api/sendText"
$WahaKey = "key_PDzXooo4V0WG0veQTUe3OGVWR31JnwgP"
$WahaSession = "GMD8706"
$AdminPhone = "5214425060999@c.us"

function Write-Log([string]$msg) {
    $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $entry = "[$time] $msg"
    Write-Host $entry
    Add-Content -Path $LogPath -Value $entry
}

function Send-WahaAlert([string]$errorDetail) {
    try {
        $body = @{
            session = $WahaSession
            chatId = $AdminPhone
            text = "🚨 *ALERTA SISTEMA MUEBLERÍA DASO*`n`nFallo en la sincronización diaria de clientes ContPAQi.`n`n❌ *Error:* $errorDetail`n⏰ *Hora:* $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`nFavor de verificar el servidor local."
        } | ConvertTo-Json -Compress

        Invoke-RestMethod -Uri $WahaUrl -Method Post -Headers @{ "X-Api-Key" = $WahaKey; "Content-Type" = "application/json" } -Body $body | Out-Null
        Write-Log "🔔 Alerta de error enviada al administrador ($AdminPhone) vía WAHA."
    } catch {
        Write-Log "⚠️ No se pudo enviar alerta WAHA: $_"
    }
}

Write-Log "=========================================================="
Write-Log "Iniciando proceso de sincronización diaria ContPAQi..."

try {
    # 1. Exportar DP
    Write-Log "Exportando DP (adDASOPLUS16)..."
    & powershell.exe -ExecutionPolicy Bypass -File "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp\scripts\export_clientes_json.ps1" -Empresa DP
    if ($LASTEXITCODE -ne 0) { throw "Error al exportar clientes DP de SQL Server" }

    # 2. Exportar DQ
    Write-Log "Exportando DQ (adGMD)..."
    & powershell.exe -ExecutionPolicy Bypass -File "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp\scripts\export_clientes_json.ps1" -Empresa DQ
    if ($LASTEXITCODE -ne 0) { throw "Error al exportar clientes DQ de SQL Server" }

    # 3. Insertar / Actualizar en Postgres (Prisma)
    Write-Log "Insertando / actualizando registros en PostgreSQL..."
    Set-Location "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp\app"
    & npx.cmd tsx scripts/sync-clientes-consulta.ts
    if ($LASTEXITCODE -ne 0) { throw "Error en la sincronización con PostgreSQL" }

    Write-Log "✅ Sincronización diaria ContPAQi finalizada con éxito."
} catch {
    $err = $_.Exception.Message
    Write-Log "❌ ERROR: $err"
    Send-WahaAlert $err
    exit 1
}
