param(
    [string]$Empresa = "DP"
)

$db = if ($Empresa -eq "DP") { "adDASOPLUS16" } else { "adGMD" }
$cs = "Server=.\VORTEXDB22;Database=$db;Integrated Security=True;TrustServerCertificate=True;Encrypt=False;"
$conn = New-Object System.Data.SqlClient.SqlConnection($cs)
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandTimeout = 180
$cmd.CommandText = @"
SELECT 
    c.CIDCLIENTEPROVEEDOR AS id,
    c.CCODIGOCLIENTE AS codigo,
    c.CRAZONSOCIAL AS nombre,
    ISNULL(NULLIF(RTRIM(vStatus.CVALORCLASIFICACION), ''), 'ACTIVO') AS estatus,
    ISNULL(NULLIF(RTRIM(vTipo.CVALORCLASIFICACION), ''), '(Ninguna)') AS tipo,
    d.CNOMBRECALLE AS calle,
    d.CNUMEROEXTERIOR AS noExterior,
    d.CNUMEROINTERIOR AS noInterior,
    d.CCOLONIA AS colonia,
    d.CMUNICIPIO AS municipio,
    d.CESTADO AS estado,
    d.CTELEFONO1 AS telefono1,
    d.CTELEFONO2 AS telefono2,
    d.CTEXTOEXTRA AS aval,
    ISNULL(s.saldoPendiente, 0) AS saldoActual,
    prod.CNOMBREPRODUCTO AS producto1
FROM admClientes c
LEFT JOIN admClasificacionesValores vStatus ON vStatus.CIDVALORCLASIFICACION = c.CIDVALORCLASIFCLIENTE2
LEFT JOIN admClasificacionesValores vTipo ON vTipo.CIDVALORCLASIFICACION = c.CIDVALORCLASIFCLIENTE3
LEFT JOIN admDomicilios d ON d.CIDCATALOGO = c.CIDCLIENTEPROVEEDOR AND d.CTIPOCATALOGO = 1
LEFT JOIN (
    SELECT CIDCLIENTEPROVEEDOR, SUM(CPENDIENTE) AS saldoPendiente
    FROM admDocumentos
    WHERE CCANCELADO = 0 AND CPENDIENTE > 0
    GROUP BY CIDCLIENTEPROVEEDOR
) s ON s.CIDCLIENTEPROVEEDOR = c.CIDCLIENTEPROVEEDOR
LEFT JOIN (
    SELECT d.CIDCLIENTEPROVEEDOR, p.CNOMBREPRODUCTO,
           ROW_NUMBER() OVER(PARTITION BY d.CIDCLIENTEPROVEEDOR ORDER BY d.CFECHA DESC, d.CIDDOCUMENTO DESC) AS rn
    FROM admDocumentos d
    INNER JOIN admMovimientos m ON m.CIDDOCUMENTO = d.CIDDOCUMENTO
    INNER JOIN admProductos p ON p.CIDPRODUCTO = m.CIDPRODUCTO
    WHERE d.CCANCELADO = 0 AND p.CNOMBREPRODUCTO NOT LIKE '%(Ninguno)%'
) prod ON prod.CIDCLIENTEPROVEEDOR = c.CIDCLIENTEPROVEEDOR AND prod.rn = 1
WHERE c.CCODIGOCLIENTE NOT LIKE '%(Ninguno)%'
ORDER BY c.CCODIGOCLIENTE
"@

$r = $cmd.ExecuteReader()
$items = New-Object System.Collections.Generic.List[Object]

while ($r.Read()) {
    $items.Add([PSCustomObject]@{
        codigo = if ($r.IsDBNull(1)) { "" } else { $r.GetString(1).Trim() }
        nombre = if ($r.IsDBNull(2)) { "" } else { $r.GetString(2).Trim() }
        estatus = if ($r.IsDBNull(3)) { "ACTIVO" } else { $r.GetString(3).Trim() }
        tipo = if ($r.IsDBNull(4)) { "(Ninguna)" } else { $r.GetString(4).Trim() }
        calle = if ($r.IsDBNull(5)) { $null } else { $r.GetString(5).Trim() }
        noExterior = if ($r.IsDBNull(6)) { $null } else { $r.GetString(6).Trim() }
        noInterior = if ($r.IsDBNull(7)) { $null } else { $r.GetString(7).Trim() }
        colonia = if ($r.IsDBNull(8)) { $null } else { $r.GetString(8).Trim() }
        municipio = if ($r.IsDBNull(9)) { $null } else { $r.GetString(9).Trim() }
        estado = if ($r.IsDBNull(10)) { $null } else { $r.GetString(10).Trim() }
        telefono1 = if ($r.IsDBNull(11)) { $null } else { $r.GetString(11).Trim() }
        telefono2 = if ($r.IsDBNull(12)) { $null } else { $r.GetString(12).Trim() }
        aval = if ($r.IsDBNull(13)) { $null } else { $r.GetString(13).Trim() }
        saldoActual = if ($r.IsDBNull(14)) { 0 } else { [double]$r.GetValue(14) }
        producto1 = if ($r.IsDBNull(15)) { $null } else { $r.GetString(15).Trim() }
        empresa = $Empresa
    })
}
$conn.Close()

$outPath = "c:\Users\AurumArch\Documents\PROYECTOS\muebleria-erp\scratch\clientes_$($Empresa.ToLower()).json"
$items | ConvertTo-Json -Depth 2 | Set-Content -Path $outPath -Encoding UTF8
Write-Host "Exportados $($items.Count) clientes de $Empresa a $outPath"
