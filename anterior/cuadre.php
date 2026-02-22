<?php
$page_title = 'Cuadre de Cobranza';
require 'includes/header.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

// =================================================================================
// 1. LÓGICA DE NEGOCIO: ACTUALIZACIONES Y FILTROS
// =================================================================================

// *** AUTO-CORRECCIÓN: ACTUALIZAR BANCOS (SOLO AL FILTRAR) ***
if (isset($_GET['gestor']) || isset($_GET['fecha_inicio'])) {
    // Optimización: copia el banco del estado de cuenta a pagos si falta
    $sql_update_bancos = "UPDATE pagos p
                          JOIN ticket t ON p.ticket_id_origen = t.id
                          JOIN estado_de_cuenta ec ON t.id = ec.ticket_id
                          SET p.bank = ec.bank
                          WHERE p.ticket_id_origen IS NOT NULL
                              AND ec.bank IS NOT NULL
                              AND p.bank IS NULL";

    $stmt_update = $conn->prepare($sql_update_bancos);
    if ($stmt_update) {
        $stmt_update->execute();
        $stmt_update->close();
    }
}

// --- CÁLCULO DE FECHAS Y MANEJO DE FILTROS ---
$hoy = time();
$fecha_inicio_default = date('Y-m-d', strtotime('last Saturday', $hoy));
if (date('w', $hoy) == 6) {
    $fecha_inicio_default = date('Y-m-d', $hoy);
}
$fecha_fin_default = date('Y-m-d', strtotime('this Friday', $hoy));

$fecha_inicio = $_GET['fecha_inicio'] ?? $fecha_inicio_default;
$fecha_fin = $_GET['fecha_fin'] ?? $fecha_fin_default;
$gestor_seleccionado = $_GET['gestor'] ?? 'TODOS';

$fecha_inicio_full = $fecha_inicio . ' 00:00:00';
$fecha_fin_full = $fecha_fin . ' 23:59:59';

// Obtener lista de gestores para el select
$gestores = [];
$sql_gestores = "SELECT DISTINCT codigo_gestor FROM pagos WHERE fechahora BETWEEN ? AND ? AND codigo_gestor IS NOT NULL AND codigo_gestor != '' ORDER BY codigo_gestor";
$stmt_gestores = $conn->prepare($sql_gestores);
$stmt_gestores->bind_param("ss", $fecha_inicio_full, $fecha_fin_full);
$stmt_gestores->execute();
$stmt_gestores->store_result();
$stmt_gestores->bind_result($codigo_gestor_db);
while ($stmt_gestores->fetch()) {
    $gestores[] = ['codigo_gestor' => $codigo_gestor_db];
}
$stmt_gestores->close();

// --- Lógica para detectar duplicados ---
$duplicate_keys = [];
$sql_duplicados = "SELECT cod_cliente, fechahora FROM pagos
                    WHERE fechahora BETWEEN ? AND ?
                    GROUP BY cod_cliente, fechahora
                    HAVING COUNT(*) > 1";
$stmt_duplicados = $conn->prepare($sql_duplicados);
$stmt_duplicados->bind_param("ss", $fecha_inicio_full, $fecha_fin_full);
$stmt_duplicados->execute();
$stmt_duplicados->store_result();
$stmt_duplicados->bind_result($cod_cliente_dup, $fechahora_dup);
while ($stmt_duplicados->fetch()) {
    $key = $cod_cliente_dup . '|' . $fechahora_dup;
    $duplicate_keys[$key] = true;
}
$stmt_duplicados->close();

// =================================================================================
// 2. QUERIES PARA LOS RESÚMENES (Semanal)
// =================================================================================
$sql_semanal = "SELECT 
                    CASE WHEN ec.fecha_operacion >= ? THEN 'ACTUAL' ELSE 'ANTERIOR' END AS categoria, 
                    ec.bank AS nombre_banco,
                    LEFT(p.cod_cliente, 2) AS prefijo,
                    COUNT(p.idpag) AS ctas, 
                    SUM(p.montop) AS total_cobros 
                FROM pagos p 
                JOIN ticket t ON t.id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(p.ref_pago, 'TICKET ID: ', -1), ' ', 1) AS UNSIGNED) 
                JOIN estado_de_cuenta ec ON t.id = ec.ticket_id 
                WHERE p.fechahora BETWEEN ? AND ? 
                  AND ec.id IS NOT NULL 
                  AND p.tipocap = 'BANCARIO'";
if ($gestor_seleccionado !== 'TODOS') {
    $sql_semanal .= " AND p.codigo_gestor = ?";
}
$sql_semanal .= " GROUP BY categoria, nombre_banco, prefijo";

$prefijos_validos = ['DQ', 'DP'];
$resumen_por_prefijo = [];
foreach ($prefijos_validos as $pref) {
    $resumen_por_prefijo[$pref] = [
        'ACTUAL' => ['total_ctas' => 0, 'total_cobros' => 0, 'detalle' => []],
        'ANTERIOR' => ['total_ctas' => 0, 'total_cobros' => 0, 'detalle' => []]
    ];
}

$stmt_semanal = $conn->prepare($sql_semanal);
$fecha_inicio_sabado_str = date('Y-m-d', strtotime($fecha_inicio));
if ($gestor_seleccionado !== 'TODOS') {
    $stmt_semanal->bind_param("ssss", $fecha_inicio_sabado_str, $fecha_inicio_full, $fecha_fin_full, $gestor_seleccionado);
} else {
    $stmt_semanal->bind_param("sss", $fecha_inicio_sabado_str, $fecha_inicio_full, $fecha_fin_full);
}
$stmt_semanal->execute();
$stmt_semanal->store_result();
$stmt_semanal->bind_result($categoria, $nombre_banco, $prefijo, $ctas, $total_cobros);

while ($stmt_semanal->fetch()) {
    $prefijo = strtoupper($prefijo);
    if (!in_array($prefijo, $prefijos_validos))
        continue;

    $banco_key = empty($nombre_banco) ? 'NO IDENTIFICADO' : strtoupper(trim($nombre_banco));
    $resumen_por_prefijo[$prefijo][$categoria]['detalle'][$banco_key] = ['ctas' => $ctas, 'cobros' => $total_cobros];
    $resumen_por_prefijo[$prefijo][$categoria]['total_ctas'] += $ctas;
    $resumen_por_prefijo[$prefijo][$categoria]['total_cobros'] += $total_cobros;
}
$stmt_semanal->close();

// Discrepancias (Tickets sin banco agrupados por prefijo)
$discrepancias_por_prefijo = [];
foreach ($prefijos_validos as $pref) {
    $discrepancias_por_prefijo[$pref] = ['tickets_sin_banco' => ['ctas' => 0, 'total' => 0]];
}

$sql_disc1 = "SELECT LEFT(t.contrato, 2) AS prefijo, COUNT(t.id) as ctas, SUM(t.monto) as total 
              FROM ticket t 
              LEFT JOIN estado_de_cuenta ec ON t.id = ec.ticket_id 
              WHERE t.creado_en BETWEEN ? AND ? 
                AND ec.id IS NULL";
if ($gestor_seleccionado !== 'TODOS') {
    $sql_disc1 .= " AND t.codigo_gestor = ?";
}
$sql_disc1 .= " GROUP BY prefijo";

$stmt_disc1 = $conn->prepare($sql_disc1);
if ($gestor_seleccionado !== 'TODOS') {
    $stmt_disc1->bind_param("sss", $fecha_inicio_full, $fecha_fin_full, $gestor_seleccionado);
} else {
    $stmt_disc1->bind_param("ss", $fecha_inicio_full, $fecha_fin_full);
}
$stmt_disc1->execute();
$stmt_disc1->store_result();
$stmt_disc1->bind_result($pref_disc, $ctas1, $total1);
while ($stmt_disc1->fetch()) {
    $pref_disc = strtoupper($pref_disc);
    if (isset($discrepancias_por_prefijo[$pref_disc])) {
        $discrepancias_por_prefijo[$pref_disc]['tickets_sin_banco'] = ['ctas' => $ctas1 ?? 0, 'total' => $total1 ?? 0];
    }
}
$stmt_disc1->close();

$sql_disc2 = "SELECT COUNT(id) as ctas, SUM(abono) as total FROM estado_de_cuenta WHERE abono > 0 AND (ticket_id IS NULL OR ticket_id = 0) AND fecha_operacion BETWEEN ? AND ?";
$stmt_disc2 = $conn->prepare($sql_disc2);
$stmt_disc2->bind_param("ss", $fecha_inicio, $fecha_fin);
$stmt_disc2->execute();
$stmt_disc2->store_result();
$stmt_disc2->bind_result($ctas2, $total2);
$stmt_disc2->fetch();
$banco_sin_ticket_general = ['ctas' => $ctas2 ?? 0, 'total' => $total2 ?? 0];
$stmt_disc2->close();

// =================================================================================
// 3. CONSULTA PRINCIPAL PARA EL DETALLE
// =================================================================================
$reporte_por_gestor = [];
$sql_main = "SELECT p.idpag AS id_pago, p.fechahora AS fecha_pago, p.cod_cliente, p.montop AS monto_pago, CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(p.ref_pago, 'TICKET ID: ', -1), ' ', 1) AS UNSIGNED) AS ticket_id, p.tipocap, p.ticket_id_origen, p.codigo_gestor, p.bank AS nombre_banco, ec.id AS id_banco, ec.fecha_operacion AS f_banco, ec.fecha_identificado AS f_conci FROM pagos p LEFT JOIN ticket t ON t.id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(p.ref_pago, 'TICKET ID: ', -1), ' ', 1) AS UNSIGNED) LEFT JOIN estado_de_cuenta ec ON t.id = ec.ticket_id WHERE p.fechahora BETWEEN ? AND ?";

if ($gestor_seleccionado !== 'TODOS') {
    $sql_main .= " AND p.codigo_gestor = ?";
}
$sql_main .= " ORDER BY p.codigo_gestor, p.fechahora ASC";
$stmt_main = $conn->prepare($sql_main);
if ($gestor_seleccionado !== 'TODOS') {
    $stmt_main->bind_param("sss", $fecha_inicio_full, $fecha_fin_full, $gestor_seleccionado);
} else {
    $stmt_main->bind_param("ss", $fecha_inicio_full, $fecha_fin_full);
}
$stmt_main->execute();
$stmt_main->store_result();

$stmt_main->bind_result($id_pago, $fecha_pago, $cod_cliente, $monto_pago, $ticket_id, $tipocap, $ticket_id_origen, $codigo_gestor, $nombre_banco, $id_banco, $f_banco, $f_conci);

while ($stmt_main->fetch()) {
    $fila_completa = ['id_pago' => $id_pago, 'fecha_pago' => $fecha_pago, 'codigo_cliente' => $cod_cliente, 'monto_pago' => $monto_pago, 'ticket_id' => $ticket_id, 'tipocap' => $tipocap, 'ticket_id_origen' => $ticket_id_origen, 'codigo_gestor' => $codigo_gestor, 'nombre_banco' => $nombre_banco, 'id_banco' => $id_banco, 'f_banco' => $f_banco, 'f_conci' => $f_conci];

    if (empty($codigo_gestor))
        continue;

    $pref = strtoupper(substr($cod_cliente, 0, 2));
    if (!in_array($pref, ['DQ', 'DP']))
        $pref = 'OTROS';

    if (!isset($reporte_por_gestor[$codigo_gestor])) {
        $reporte_por_gestor[$codigo_gestor] = [];
    }
    if (!isset($reporte_por_gestor[$codigo_gestor][$pref])) {
        $reporte_por_gestor[$codigo_gestor][$pref] = ['COBRANZA GESTOR' => [], 'BANCOS GESTOR' => [], 'BANCOS BOT' => []];
    }

    if ($fila_completa['tipocap'] === 'GESTOR') {
        $reporte_por_gestor[$codigo_gestor][$pref]['COBRANZA GESTOR'][] = $fila_completa;
    } elseif ($fila_completa['tipocap'] === 'BANCARIO') {
        if ($fila_completa['ticket_id_origen'] === null) {
            $reporte_por_gestor[$codigo_gestor][$pref]['BANCOS GESTOR'][] = $fila_completa;
        } else {
            $reporte_por_gestor[$codigo_gestor][$pref]['BANCOS BOT'][] = $fila_completa;
        }
    }
}
$stmt_main->close();

// Totales Detallados por Prefijo
$detalle_totales_bancos = [];
foreach ($prefijos_validos as $pref) {
    $detalle_totales_bancos[$pref] = ['ctas' => 0, 'cobros' => 0];
}

foreach ($reporte_por_gestor as $gestor => $datos_por_pref) {
    foreach ($datos_por_pref as $pref_key => $datos) {
        foreach (['BANCOS BOT', 'BANCOS GESTOR'] as $t_pago) {
            foreach ($datos[$t_pago] as $pago) {
                $p_pref = strtoupper(substr($pago['codigo_cliente'], 0, 2));
                if (isset($detalle_totales_bancos[$p_pref])) {
                    $detalle_totales_bancos[$p_pref]['ctas']++;
                    $detalle_totales_bancos[$p_pref]['cobros'] += $pago['monto_pago'];
                }
            }
        }
    }
}
?>

<h2>Cuadre de Cobranza Semanal</h2>

<form method="get" action="cuadre.php">
    <label for="gestor">Gestor:</label>
    <select name="gestor">
        <option value="TODOS">-- Todos los Gestores --</option>
        <?php foreach ($gestores as $g): ?>
            <option value="<?php echo htmlspecialchars($g['codigo_gestor']); ?>" <?php echo $gestor_seleccionado === $g['codigo_gestor'] ? 'selected' : ''; ?>>
                <?php echo htmlspecialchars($g['codigo_gestor']); ?>
            </option>
        <?php endforeach; ?>
    </select>
    <label for="fecha_inicio">Fecha Inicio:</label>
    <input type="date" name="fecha_inicio" value="<?php echo htmlspecialchars($fecha_inicio); ?>" required>
    <label for="fecha_fin">Fecha Fin:</label>
    <input type="date" name="fecha_fin" value="<?php echo htmlspecialchars($fecha_fin); ?>" required>
    <button type="submit">Filtrar</button>
</form>

<div class="summary-container" style="display: flex; flex-wrap: wrap; gap: 20px;">
    <?php foreach ($prefijos_validos as $pref): ?>
        <?php
        $resumen_pref = $resumen_por_prefijo[$pref];
        $total_pref_ctas = ($resumen_pref['ACTUAL']['total_ctas'] ?? 0) + ($resumen_pref['ANTERIOR']['total_ctas'] ?? 0);
        $total_pref_cobros = ($resumen_pref['ACTUAL']['total_cobros'] ?? 0) + ($resumen_pref['ANTERIOR']['total_cobros'] ?? 0);

        $bancos_bot_pref_ctas = $detalle_totales_bancos[$pref]['ctas'] ?? 0;
        $bancos_bot_pref_cobros = $detalle_totales_bancos[$pref]['cobros'] ?? 0;

        $disc_pref_ctas = $bancos_bot_pref_ctas - $total_pref_ctas;
        $disc_pref_cobros = $bancos_bot_pref_cobros - $total_pref_cobros;
        ?>
        <div class="card" style="flex: 1; min-width: 300px;">
            <h4>Resumen Semanal
                <?php echo $pref; ?> (Solo Bancos)
            </h4>

            <div class="summary-line">
                <span class="label">ACTUAL:</span>
                <span class="value">
                    <span class="ctas">CTAS
                        <?php echo $resumen_pref['ACTUAL']['total_ctas']; ?>
                    </span>
                    <span class="text-success">$
                        <?php echo number_format($resumen_pref['ACTUAL']['total_cobros'], 0); ?>
                    </span>
                </span>
            </div>
            <?php ksort($resumen_pref['ACTUAL']['detalle']); ?>
            <?php foreach ($resumen_pref['ACTUAL']['detalle'] as $banco_nombre => $banco_datos): ?>
                <div class="summary-line" style="padding-left: 20px;">
                    <span class="label" style="color: #555;"> »
                        <?php echo htmlspecialchars($banco_nombre); ?>:
                    </span>
                    <span class="value" style="font-weight: normal;">
                        <span class="ctas">CTAS
                            <?php echo $banco_datos['ctas']; ?>
                        </span>
                        <span class="text-success">$
                            <?php echo number_format($banco_datos['cobros'], 0); ?>
                        </span>
                    </span>
                </div>
            <?php endforeach; ?>

            <div class="summary-line" style="margin-top: 10px;">
                <span class="label">ANTERIOR:</span>
                <span class="value">
                    <span class="ctas">CTAS
                        <?php echo $resumen_pref['ANTERIOR']['total_ctas']; ?>
                    </span>
                    <span class="text-success">$
                        <?php echo number_format($resumen_pref['ANTERIOR']['total_cobros'], 0); ?>
                    </span>
                </span>
            </div>
            <?php ksort($resumen_pref['ANTERIOR']['detalle']); ?>
            <?php foreach ($resumen_pref['ANTERIOR']['detalle'] as $banco_nombre => $banco_datos): ?>
                <div class="summary-line" style="padding-left: 20px;">
                    <span class="label" style="color: #555;"> »
                        <?php echo htmlspecialchars($banco_nombre); ?>:
                    </span>
                    <span class="value" style="font-weight: normal;">
                        <span class="ctas">CTAS
                            <?php echo $banco_datos['ctas']; ?>
                        </span>
                        <span class="text-success">$
                            <?php echo number_format($banco_datos['cobros'], 0); ?>
                        </span>
                    </span>
                </div>
            <?php endforeach; ?>

            <div class="summary-total"><span class="label">TOTAL
                    <?php echo $pref; ?>:
                </span> <span class="value"><span class="ctas">CTAS
                        <?php echo $total_pref_ctas; ?>
                    </span> $
                    <?php echo number_format($total_pref_cobros, 0); ?>
                </span></div>
            <div class="summary-line" style="margin-top: 10px; border-top: 2px solid #dee2e6; padding-top: 10px;"><span
                    class="label text-danger">Discrepancia:</span><span class="value text-danger"><span class="ctas">CTAS
                        <?php echo $disc_pref_ctas; ?>
                    </span> $
                    <?php echo number_format($disc_pref_cobros, 0); ?>
                </span></div>
            <div class="summary-line"><span class="label">Tickets sin conciliar:</span> <span class="value text-danger">
                    <?php echo $discrepancias_por_prefijo[$pref]['tickets_sin_banco']['ctas']; ?> (Suma: $
                    <?php echo number_format($discrepancias_por_prefijo[$pref]['tickets_sin_banco']['total'], 0); ?>)
                </span></div>
        </div>
    <?php endforeach; ?>

    <div class="card" style="flex: 1; min-width: 300px; height: fit-content;">
        <h4>Otras Discrepancias</h4>
        <div class="summary-line"><span class="label">Abonos sin asignar (Banco):</span> <span
                class="value text-warning">
                <?php echo $banco_sin_ticket_general['ctas']; ?> (Suma: $
                <?php echo number_format($banco_sin_ticket_general['total'], 0); ?>)
            </span></div>
        <p style="font-size: 0.85em; color: #666; margin-top: 10px; font-style: italic;">* Los abonos sin asignar
            corresponden a depósitos bancarios no vinculados a ningún ticket.</p>
    </div>
</div>
<hr>

<?php if (empty($reporte_por_gestor)): ?>
    <div class="alert alert-success">No se encontraron pagos con los filtros seleccionados.</div>
<?php else: ?>
    <?php foreach ($reporte_por_gestor as $gestor => $datos_por_prefijo): ?>

        <?php
        // =================================================================================
        // *** LOGICA DE CIERRE (ROLLOVER) DE VIERNES ***
        // =================================================================================
        $display_cierre = '';

        // 1. Consultar estado del gestor actual
        $sql_g_info = "SELECT horacierre, conciliado FROM gestores WHERE codigo_gestor = ?";
        $stmt_g = $conn->prepare($sql_g_info);
        $stmt_g->bind_param("s", $gestor);
        $stmt_g->execute();
        $stmt_g->bind_result($db_horacierre, $db_conciliado);
        $stmt_g->fetch();
        $stmt_g->close();

        // 2. Verificar condiciones: Conciliado=1 y existe fecha
        if ($db_conciliado == 1 && !empty($db_horacierre)) {
            $dt_cierre = DateTime::createFromFormat('d/m/Y h:i a', $db_horacierre);
            if ($dt_cierre) {
                $dia_semana = $dt_cierre->format('N');
                $hora_dia = (int) $dt_cierre->format('H');
                if ($dia_semana == 5 && $hora_dia <= 12) {
                    $fecha_sql = $dt_cierre->format('Y-m-d H:i:s');
                    $sql_rollover = "UPDATE pagos SET fechap = DATE_ADD(fechap, INTERVAL 1 DAY), fechahora = DATE_ADD(fechahora, INTERVAL 1 DAY) WHERE codigo_gestor = ? AND fechahora > ? AND DATE(fechahora) = DATE(?)";
                    $stmt_upd = $conn->prepare($sql_rollover);
                    if ($stmt_upd) {
                        $stmt_upd->bind_param("sss", $gestor, $fecha_sql, $fecha_sql);
                        $stmt_upd->execute();
                        $stmt_upd->close();
                    }
                    $display_cierre = " <span style='background-color: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; vertical-align: middle; margin-left: 10px;'>[CIERRE {$db_horacierre}]</span>";
                } else {
                    $display_cierre = " <span style='background-color: #6c757d; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; vertical-align: middle; margin-left: 10px;'>[CIERRE {$db_horacierre}]</span>";
                }
            }
        }
        ?>

        <h3 class="gestor-header">
            <?php echo htmlspecialchars($gestor); ?>
            <?php echo $display_cierre; ?>
        </h3>

        <?php
        // Ordenar prefijos: DQ, DP, OTROS
        uksort($datos_por_prefijo, function ($a, $b) {
            if ($a === 'DQ')
                return -1;
            if ($b === 'DQ')
                return 1;
            if ($a === 'DP')
                return -1;
            if ($b === 'DP')
                return 1;
            return strcmp($a, $b);
        });
        ?>

        <?php foreach ($datos_por_prefijo as $pref => $datos): ?>
            <div class="prefijo-section"
                style="margin-left: 10px; border-left: 4px solid <?php echo $pref === 'DQ' ? '#007bff' : ($pref === 'DP' ? '#28a745' : '#6c757d'); ?>; padding-left: 15px; margin-bottom: 40px;">
                <h4 style="margin-top: 0; color: #333;">SECCIÓN <?php echo $pref; ?></h4>

                <div class="card" style="margin-bottom: 20px; background-color: #f9f9f9;">
                    <?php
                    $resumen_gestor = [
                        'BANCOS BOT' => ['ctas' => 0, 'cobros' => 0],
                        'BANCOS GESTOR' => ['ctas' => 0, 'cobros' => 0],
                        'COBRANZA GESTOR' => ['ctas' => 0, 'cobros' => 0]
                    ];
                    $resumen_bancos_bot_detalle = [];
                    $total_ctas = 0;
                    $total_cobros = 0;

                    foreach ($datos as $tipo => $pagos_tipo) {
                        $count = count($pagos_tipo);
                        $sum = array_sum(array_column($pagos_tipo, 'monto_pago'));
                        $resumen_gestor[$tipo] = ['ctas' => $count, 'cobros' => $sum];
                        $total_ctas += $count;
                        $total_cobros += $sum;

                        if ($tipo === 'BANCOS BOT') {
                            foreach ($pagos_tipo as $pago) {
                                $banco_key = empty($pago['nombre_banco']) ? 'NO IDENTIFICADO' : strtoupper(trim($pago['nombre_banco']));
                                if (!isset($resumen_bancos_bot_detalle[$banco_key]))
                                    $resumen_bancos_bot_detalle[$banco_key] = ['ctas' => 0, 'cobros' => 0];
                                $resumen_bancos_bot_detalle[$banco_key]['ctas']++;
                                $resumen_bancos_bot_detalle[$banco_key]['cobros'] += $pago['monto_pago'];
                            }
                        }
                    }
                    ksort($resumen_bancos_bot_detalle);
                    ?>

                    <div class="summary-line"><span class="label">BANCOS BOT:</span><span class="value"><span class="ctas">CTAS
                                <?php echo $resumen_gestor['BANCOS BOT']['ctas']; ?></span>
                            $<?php echo number_format($resumen_gestor['BANCOS BOT']['cobros'], 0); ?></span></div>
                    <?php foreach ($resumen_bancos_bot_detalle as $banco_nombre => $banco_datos): ?>
                        <div class="summary-line" style="padding-left: 20px;">
                            <span class="label" style="color: #555;"> » BANCOS BOT
                                <?php echo htmlspecialchars($banco_nombre); ?>:</span>
                            <span class="value" style="font-weight: normal;"><span class="ctas">CTAS
                                    <?php echo $banco_datos['ctas']; ?></span>
                                $<?php echo number_format($banco_datos['cobros'], 0); ?></span>
                        </div>
                    <?php endforeach; ?>

                    <div class="summary-line"><span class="label">BANCOS GESTOR:</span><span class="value"><span class="ctas">CTAS
                                <?php echo $resumen_gestor['BANCOS GESTOR']['ctas']; ?></span>
                            $<?php echo number_format($resumen_gestor['BANCOS GESTOR']['cobros'], 0); ?></span></div>
                    <div class="summary-line"><span class="label">COBRANZA GESTOR:</span><span class="value"><span class="ctas">CTAS
                                <?php echo $resumen_gestor['COBRANZA GESTOR']['ctas']; ?></span>
                            $<?php echo number_format($resumen_gestor['COBRANZA GESTOR']['cobros'], 0); ?></span></div>
                    <div class="summary-total"><span class="label">TOTAL <?php echo $pref; ?>:</span><span class="value"><span
                                class="ctas">CTAS <?php echo $total_ctas; ?></span>
                            $<?php echo number_format($total_cobros, 0); ?></span></div>
                </div>

                <?php foreach ($datos as $tipo => $pagos): ?>
                    <h5 class="<?php echo get_title_class($tipo); ?>" style="margin-top: 20px;"><?php echo $tipo; ?>
                        (<?php echo $pref; ?>)</h5>
                    <?php if (empty($pagos)): ?>
                        <p style="font-size: 0.9em; color: #777;">Sin registros.</p>
                    <?php else: ?>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID PAGO</th>
                                    <th>FECHA</th>
                                    <th>CÓDIGO (CLIENTE)</th>
                                    <th>MONTO</th>
                                    <th>ID TICKET</th>
                                    <th>BANCO PAGO</th>
                                    <th>ID BANCO</th>
                                    <th>F. BANCO</th>
                                    <th>F. CONCI</th>
                                    <?php if ($tipo === 'BANCOS BOT'): ?>
                                        <th>ACCIÓN</th><?php endif; ?>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($pagos as $pago): ?>
                                    <?php
                                    $row_classes = [];
                                    if (!empty($pago['id_banco'])) {
                                        $row_classes[] = 'reconciled';
                                    } else {
                                        $row_classes[] = 'unreconciled';
                                    }
                                    $key_duplicado = $pago['codigo_cliente'] . '|' . $pago['fecha_pago'];
                                    if (isset($duplicate_keys[$key_duplicado])) {
                                        $row_classes[] = 'duplicate';
                                    }
                                    ?>
                                    <tr class="<?php echo implode(' ', $row_classes); ?>">
                                        <td class="td-id"><?php echo $pago['id_pago']; ?></td>
                                        <td class="td-date"><?php echo date('Y-m-d H:i', strtotime($pago['fecha_pago'])); ?></td>
                                        <td><?php echo htmlspecialchars($pago['codigo_cliente']); ?></td>
                                        <td class="td-amount">$<?php echo number_format($pago['monto_pago'], 0); ?></td>
                                        <td class="td-id"><?php echo $pago['ticket_id'] > 0 ? $pago['ticket_id'] : '-'; ?></td>
                                        <td><?php echo htmlspecialchars($pago['nombre_banco'] ?? '-'); ?></td>
                                        <td class="td-id"><?php echo $pago['id_banco'] ?? '-'; ?></td>
                                        <td class="td-date"><?php echo $pago['f_banco'] ? date('Y-m-d', strtotime($pago['f_banco'])) : '-'; ?>
                                        </td>
                                        <td class="td-date"><?php echo $pago['f_conci'] ? date('Y-m-d', strtotime($pago['f_conci'])) : '-'; ?>
                                        </td>
                                        <?php if ($tipo === 'BANCOS BOT'): ?>
                                            <td style="text-align: center;">
                                                <form action="desconciliar.php" method="POST" style="margin:0;"
                                                    onsubmit="return confirm('¿Estás seguro de DESHACER la conciliación?');">
                                                    <input type="hidden" name="id_pago" value="<?php echo $pago['id_pago']; ?>">
                                                    <input type="hidden" name="id_ticket" value="<?php echo $pago['ticket_id']; ?>">
                                                    <input type="hidden" name="id_banco" value="<?php echo $pago['id_banco']; ?>">
                                                    <button type="submit"
                                                        style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-size: 0.9em;">Deshacer</button>
                                                </form>
                                            </td>
                                        <?php endif; ?>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                            <tfoot>
                                <tr style="font-weight: bold;">
                                    <td colspan="2" style="text-align:right;">TOTAL CATEGORÍA</td>
                                    <td>(<?php echo $resumen_gestor[$tipo]['ctas']; ?> Cuentas)</td>
                                    <td class="td-amount">$<?php echo number_format($resumen_gestor[$tipo]['cobros'], 0); ?></td>
                                    <td colspan="<?php echo $tipo === 'BANCOS BOT' ? '6' : '5'; ?>"></td>
                                </tr>
                            </tfoot>
                        </table>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        <?php endforeach; ?>
        <hr style="border: 2px solid #333; margin: 50px 0;">
    <?php endforeach; ?>
<?php endif; ?>

<?php
function get_title_class($tipo)
{
    switch ($tipo) {
        case 'BANCOS BOT':
            return 'title-bancos-bot';
        case 'BANCOS GESTOR':
            return 'title-bancos-gestor';
        case 'COBRANZA GESTOR':
            return 'title-cobranza-gestor';
        default:
            return '';
    }
}
require 'includes/footer.php';
?>