<?php
// 1. CARGA DE DATOS Y CONEXIÓN (ANTES DE CUALQUIER HTML)
require("datos.php");     

$connect = mysqli_connect($host, $user, $pass, $db_name);
if (!$connect) { die("Error de conexión: " . mysqli_connect_error()); }
mysqli_set_charset($connect, "utf8");

// =========================================================================
// 2. BLOQUE AJAX: RESPUESTA LIMPIA
// =========================================================================
if (isset($_GET['ajax_count_pendientes'])) {
    // Consulta estricta solicitada: enviopago es NULL y conciliado es 1
    $sql_ajax = "SELECT COUNT(*) as total 
                 FROM ticket 
                 WHERE enviopago IS NULL 
                 AND conciliado = 1";
                 
    $qry_ajax = mysqli_query($connect, $sql_ajax);
    $total = 0;
    
    if ($qry_ajax) {
        $row = mysqli_fetch_assoc($qry_ajax);
        $total = $row['total'];
    }
    
    // IMPORTANTE: Imprimimos SOLO el número y cortamos la ejecución (exit)
    // Esto evita que se imprima el menú o cualquier otro HTML en la respuesta AJAX
    echo $total;
    exit; 
}
// =========================================================================

// 3. AHORA SÍ CARGAMOS EL MENÚ VISUAL (Solo si no es una petición AJAX)
include('menudaso.php'); 

$feedback_message = '';

// --- 4. ACCIONES (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Conciliar Ticket
    if (isset($_POST['conciliar']) && !empty($_POST['movimiento_id'])) {
        $ticket_id = mysqli_real_escape_string($connect, $_POST['ticket_id']);
        $movimiento_id = mysqli_real_escape_string($connect, $_POST['movimiento_id']);
        
        $ticket_info_query = "SELECT contrato FROM ticket WHERE id = '$ticket_id'";
        $ticket_info_result = mysqli_query($connect, $ticket_info_query);
        $cod_cliente = mysqli_fetch_assoc($ticket_info_result)['contrato'];

        $gestor_query = "SELECT codigo_gestor FROM cat_clientes WHERE cod_cliente = '$cod_cliente' LIMIT 1";
        $gestor_result = mysqli_query($connect, $gestor_query);
        $gestor = $gestor_result ? mysqli_fetch_assoc($gestor_result)['codigo_gestor'] : '';

        $banco_info = mysqli_fetch_assoc(mysqli_query($connect, "SELECT bank FROM estado_de_cuenta WHERE id = '$movimiento_id'"));
        $nombre_banco = $banco_info['bank'] ?? '';

        mysqli_begin_transaction($connect);
        try {
            // Actualizar Ticket
            mysqli_query($connect, "UPDATE ticket SET conciliado = 1, idbancos = $movimiento_id WHERE id = $ticket_id");
            
            // Actualizar Estado de Cuenta
            mysqli_query($connect, "UPDATE estado_de_cuenta SET ticket_id = $ticket_id, cod_cliente = '$cod_cliente', gestor = '$gestor', fecha_identificado = NOW() WHERE id = $movimiento_id");
            
            // Actualizar Cliente
            mysqli_query($connect, "UPDATE cat_clientes SET bancos = 'CONCILIADO' WHERE cod_cliente = '$cod_cliente'");
            
            mysqli_commit($connect);
            $feedback_message = "<p class='msg-success'>¡Éxito! Ticket ID $ticket_id conciliado con $nombre_banco.</p>";
        } catch (mysqli_sql_exception $exception) {
            mysqli_rollback($connect);
            $feedback_message = "<p class='msg-error'>Error: " . $exception->getMessage() . "</p>";
        }
    }

    // Eliminar Ticket
    if (isset($_POST['eliminar'])) {
        $ticket_id_to_delete = mysqli_real_escape_string($connect, $_POST['ticket_id']);
        $delete_query = "DELETE FROM ticket WHERE id = $ticket_id_to_delete";
        if (mysqli_query($connect, $delete_query)) {
            $feedback_message = "<p class='msg-success'>Ticket eliminado.</p>";
        } else {
            $feedback_message = "<p class='msg-error'>Error al eliminar: " . mysqli_error($connect) . "</p>";
        }
    }
}

// --- 5. CONSULTAS VISUALES ---
// Tickets pendientes
$tickets_query = "SELECT t.id, t.contrato, t.monto, t.fecha, t.hr, t.referencia, t.folio, t.claverastreo, t.remitente, t.creado_en, 
                         cc.nombre_ccliente AS nombre_cliente, cc.codigo_gestor
                  FROM ticket t
                  LEFT JOIN cat_clientes cc ON t.contrato = cc.cod_cliente
                  WHERE t.conciliado = 0 
                  ORDER BY t.fecha ASC, t.id ASC";
$tickets_result = mysqli_query($connect, $tickets_query);

// Bancos disponibles (Exclusión Mutua: Sin ticket_id y Sin id_pago)
$banco_movimientos_query = "SELECT id, fecha_operacion, hora_operacion, abono, descripcion_detallada, descripcion_general, concepto, banco_origen 
                            FROM estado_de_cuenta 
                            WHERE ticket_id IS NULL 
                              AND (id_pago IS NULL OR id_pago = 0) 
                            ORDER BY fecha_operacion DESC, id DESC";
$banco_movimientos_result = mysqli_query($connect, $banco_movimientos_query);
$banco_movimientos = [];
while ($row = mysqli_fetch_assoc($banco_movimientos_result)) {
    $banco_movimientos[] = $row;
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Conciliador BANCOS BOT</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; background-color: #f8f9fa; color: #343a40; }
        .header-controls { text-align: center; margin-bottom: 25px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        h1 { text-align: center; color: #e60000; margin-bottom: 5px; } 
        .ticket-card { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 25px; padding: 25px; border-left: 5px solid #e60000; }
        .ticket-header { padding-bottom: 10px; margin-bottom: 20px; border-bottom: 1px solid #dee2e6; }
        .header-top { display: flex; justify-content: space-between; align-items: center; }
        .ticket-header h2 { margin: 0; font-size: 1.5em; }
        .client-name { margin: 5px 0 0 0; font-size: 1.1em; color: #6c757d; font-weight: normal; text-transform: uppercase; }
        .ticket-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .detail { background: #f8f9fa; padding: 10px; border-radius: 5px; border: 1px solid #e9ecef; word-break: break-word; }
        .detail strong { display: block; color: #495057; font-size: 0.8em; margin-bottom: 4px; text-transform: uppercase; }
        .conciliation-area { margin-top: 20px; padding-top: 20px; border-top: 1px dashed #ced4da; }
        input[type="number"], select, button { padding: 10px 15px; border-radius: 5px; border: 1px solid #ced4da; font-size: 14px; width: 100%; margin-top: 10px; box-sizing: border-box; }
        select { background-color: white; }
        button { cursor: pointer; border: none; color: white; font-weight: bold; }
        .btn-conciliar { background-color: #28a745; } .btn-conciliar:hover { background-color: #218838; }
        .btn-eliminar { background-color: #dc3545; } .btn-eliminar:hover { background-color: #c82333; }
        .btn-export { background-color: #007bff; padding: 12px 20px; } .btn-export:hover { background-color: #0069d9; }
        .msg-success { background-color: #d4edda; color: #155724; padding: 15px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
        .msg-error { background-color: #f8d7da; color: #721c24; padding: 15px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
        .detalle-completo { background-color: #e9ecef; border: 1px solid #ced4da; padding: 12px; border-radius: 5px; margin-top: 8px; display: none; word-wrap: break-word; }
        
        .success-container { text-align:center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .loading-envios { color: #d35400; font-size: 18px; margin-top: 20px; font-weight: 500; min-height: 30px; }
        
        #top-counter { text-align: center; font-size: 16px; min-height: 24px; margin-bottom: 20px; font-weight: 500; }
    </style>
</head>
<body>

<h1>Conciliador Bancos BOT</h1>
<div id="top-counter"></div>

<div class="header-controls"><button id="btnExport" class="btn-export">Exportar a Excel</button></div>
<?php if ($feedback_message) echo $feedback_message; ?>

<div id="tickets-container">
<?php
$tickets_for_export = [];
if (mysqli_num_rows($tickets_result) > 0) {
    while ($ticket = mysqli_fetch_assoc($tickets_result)) {
        $tickets_for_export[] = $ticket; 

        echo "<div class='ticket-card'>";
        echo "<div class='ticket-header'><div class='header-top'><h2>Contrato: " . htmlspecialchars($ticket['contrato']) . "</h2>";
        echo "<form method='post' onsubmit='return confirm(\"¿Eliminar ticket?\");'><input type='hidden' name='ticket_id' value='{$ticket['id']}'><button type='submit' name='eliminar' class='btn-eliminar'>Eliminar</button></form></div>";
        echo "<h3 class='client-name'>" . htmlspecialchars($ticket['nombre_cliente'] ?: 'CLIENTE NO IDENTIFICADO') . "</h3></div>";

        echo "<div class='ticket-details'>";
        echo "<div class='detail'><strong>Ticket ID:</strong> {$ticket['id']}</div>";
        echo "<div class='detail'><strong>Monto:</strong> $" . number_format($ticket['monto'], 2) . "</div>";
        echo "<div class='detail'><strong>Fecha:</strong> {$ticket['fecha']} {$ticket['hr']}</div>";
        echo "<div class='detail'><strong>Folio:</strong> " . htmlspecialchars($ticket['folio']) . "</div>";
        echo "<div class='detail'><strong>Gestor:</strong> " . htmlspecialchars($ticket['codigo_gestor'] ?? 'N/A') . "</div>";
        echo "<div class='detail'><strong>Ref:</strong> " . htmlspecialchars($ticket['referencia']) . "</div>";
        echo "<div class='detail'><strong>Rastreo:</strong> " . htmlspecialchars($ticket['claverastreo']) . "</div>";
        echo "<div class='detail'><strong>Remitente:</strong> " . htmlspecialchars($ticket['remitente'] ?: 'N/A') . "</div>";
        echo "</div>";

        echo "<div class='conciliation-area'><form method='post'>";
        echo "<input type='hidden' name='ticket_id' value='{$ticket['id']}'>";
        
        // --- SUGERENCIAS ---
        $monto = $ticket['monto'];
        $fecha = $ticket['fecha'];
        $contrato = $ticket['contrato'];
        $folio = $ticket['folio'];
        $nombre_cliente = $ticket['nombre_cliente'];

        // Corrección de caracteres
        $nombre_cliente_corregido = str_replace('?', '_', $nombre_cliente);
        $nombre_cliente_safe = mysqli_real_escape_string($connect, $nombre_cliente_corregido);
        $nombre_busqueda = substr($nombre_cliente_safe, 0, 25); 

        // Query Sugerencias
        $sugerencias_query = "
            SELECT id, abono, fecha_operacion, hora_operacion, descripcion_general, concepto, descripcion_detallada, banco_origen,
                CASE
                    WHEN concepto LIKE '%$contrato%' OR descripcion_detallada LIKE '%$contrato%' THEN 1
                    WHEN concepto LIKE '%$folio%' OR descripcion_detallada LIKE '%$folio%' THEN 2
                    WHEN '$nombre_busqueda' != '' AND (concepto LIKE '%$nombre_busqueda%' OR descripcion_detallada LIKE '%$nombre_busqueda%') THEN 3
                    WHEN TIME_TO_SEC(TIMEDIFF(hora_operacion, '{$ticket['hr']}')) BETWEEN -300 AND 300 THEN 4
                    ELSE 5
                END AS prioridad
            FROM estado_de_cuenta 
            WHERE abono = $monto AND fecha_operacion = '$fecha' 
              AND ticket_id IS NULL 
              AND (id_pago IS NULL OR id_pago = 0)
            ORDER BY prioridad ASC, hora_operacion ASC
        ";
        $sug_result = mysqli_query($connect, $sugerencias_query);

        echo "<label for='filtro-{$ticket['id']}'><strong>Filtrar por monto:</strong></label>";
        echo "<input type='number' id='filtro-{$ticket['id']}' value='".number_format($ticket['monto'], 2, '.', '')."' onkeyup='filtrarMovimientos({$ticket['id']})' step='0.01'>";
        
        echo "<label style='margin-top: 10px; display: block;'><strong>Sugerencias / Selección Manual:</strong></label>";
        echo "<select name='movimiento_id' id='select-{$ticket['id']}' required onchange='mostrarDetalle(this)'><option value=''>-- Seleccionar --</option>";
        
        if (mysqli_num_rows($sug_result) > 0) {
            echo "<optgroup label='Sugerencias Automáticas'>";
            while ($sug = mysqli_fetch_assoc($sug_result)) {
                $texto_prioridad = ['1' => '🟢 Contrato', '2' => '🔵 Folio/Afil', '3' => '🟣 Nombre', '4' => '🟠 Hora', '5' => '🔴 Monto'];
                $desc_full = "Desc: " . ($sug['descripcion_detallada'] ?: 'N/A') . " | Gral: " . ($sug['descripcion_general'] ?: 'N/A') . " | Concepto: " . ($sug['concepto'] ?: 'N/A');
                $texto_safe = htmlspecialchars("ID: {$sug['id']} | Fecha: {$sug['fecha_operacion']} | Hora: {$sug['hora_operacion']} | Monto: $" . number_format($sug['abono'], 2) . " | " . $desc_full, ENT_QUOTES);
                $desc_corta = mb_substr($desc_full, 0, 60);
                
                // Muestra Fecha y Hora
                $texto_vis = "ID: {$sug['id']} | " . $sug['fecha_operacion'] . " " . $sug['hora_operacion'] . " | $" . number_format($sug['abono'], 2) . " | " . htmlspecialchars($desc_corta) . "... (" . ($texto_prioridad[$sug['prioridad']] ?? 'Coincidencia') . ")";
                
                echo "<option value='{$sug['id']}' data-monto='{$sug['abono']}' data-texto-completo='$texto_safe'>$texto_vis</option>";
            }
            echo "</optgroup>";
        }

        echo "<optgroup label='Manual (Resto)'>";
        foreach ($banco_movimientos as $mov) {
            $desc_full = "Desc: " . ($mov['descripcion_detallada'] ?: 'N/A') . " | Gral: " . ($mov['descripcion_general'] ?: 'N/A') . " | Concepto: " . ($mov['concepto'] ?: 'N/A');
            $texto_safe = htmlspecialchars("ID: {$mov['id']} | Fecha: {$mov['fecha_operacion']} | Hora: {$mov['hora_operacion']} | Monto: $" . number_format($mov['abono'], 2) . " | " . $desc_full, ENT_QUOTES);
            
            // Muestra Fecha y Hora
            $texto_vis = "ID: {$mov['id']} | " . $mov['fecha_operacion'] . " " . $mov['hora_operacion'] . " | $" . number_format($mov['abono'], 2) . " | " . htmlspecialchars(substr($desc_full, 0, 60)) . "...";
            
            echo "<option value='{$mov['id']}' data-monto='{$mov['abono']}' data-texto-completo='$texto_safe'>$texto_vis</option>";
        }
        echo "</optgroup></select>";
        echo "<div class='detalle-completo'></div>";
        echo "<div style='margin-top:10px;'><button type='submit' name='conciliar' class='btn-conciliar'>Conciliar Ticket</button></div></form></div></div>";
    }
} else { 
    // =========================================================================
    // BLOQUE FINAL (MOTIVACIÓN + AJAX)
    // =========================================================================
    $frases = [
        "¡Eres una máquina! 🚀 Has dejado las cuentas impecables.",
        "¡Misión Cumplida! ☕ Tómate un café, te lo has ganado hoy.",
        "✨ ¡Qué paz! Bandeja vacía, mente tranquila. Todo conciliado.",
        "¡Excelente trabajo! 📈 Hoy has sido super productivo/a.",
        "¡Lo lograste! 🎉 No ha quedado ni un solo centavo sin asignar.",
        "¡Boom! 💥 Conciliación terminada. Eres el/la mejor."
    ];
    $frase_del_dia = $frases[array_rand($frases)];
    
    echo "<div class='success-container'>";
    echo "<h2 style='color:green; margin-bottom:10px;'>$frase_del_dia</h2>";
    echo "<p style='color:#666;'>No hay más tickets pendientes de conciliación.</p>";
    echo "<div id='contenedor-envios' class='loading-envios'><i class='fa fa-spinner fa-spin'></i> Verificando cola de envíos...</div>";
    echo "</div>";

    // Script AJAX
    echo "
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        function actualizarPendientes() {
            let urlActual = window.location.href.split('?')[0]; 
            // Añadimos timestamp para evitar caché del navegador
            fetch(urlActual + '?ajax_count_pendientes=1&t=' + new Date().getTime())
            .then(response => response.text())
            .then(data => {
                // Parseamos, asegurándonos de que sea un número
                const cantidad = parseInt(data.trim());
                
                // 1. ACTUALIZAR CONTADOR SUPERIOR
                const topDiv = document.getElementById('top-counter');
                if (topDiv) {
                    if (!isNaN(cantidad) && cantidad > 0) {
                        topDiv.innerHTML = '<span style=\"color:#d35400; font-weight:bold;\"><i class=\"fa fa-refresh fa-spin\"></i> Procesando envíos: ' + cantidad + ' pendientes</span>';
                    } else {
                        topDiv.innerHTML = ''; 
                    }
                }

                // 2. ACTUALIZAR CONTADOR INFERIOR
                const bottomDiv = document.getElementById('contenedor-envios');
                if (bottomDiv) {
                    if (!isNaN(cantidad) && cantidad > 0) {
                        bottomDiv.innerHTML = '<i class=\'fa fa-refresh fa-spin\'></i> Enviando <strong>' + cantidad + '</strong> Comprobantes...';
                        bottomDiv.style.color = '#d35400';
                    } else {
                        bottomDiv.innerHTML = '<i class=\'fa fa-check-circle\'></i> No hay nada por enviar.';
                        bottomDiv.style.color = '#7f8c8d'; 
                    }
                }
            })
            .catch(error => console.error('Error AJAX:', error));
        }
        // Ejecutar inmediatamente y luego cada 3 seg
        actualizarPendientes();
        setInterval(actualizarPendientes, 3000);
    });
    </script>
    ";
}
?>
</div>
<script>
function filtrarMovimientos(id) {
    let filtro = document.getElementById('filtro-' + id).value;
    let selector = document.getElementById('select-' + id);
    let optgroups = selector.getElementsByTagName('optgroup');

    for (let i = 0; i < optgroups.length; i++) {
        let optgroup = optgroups[i];
        let options = optgroup.getElementsByTagName('option');
        let visibleOptions = 0;

        for (let j = 0; j < options.length; j++) {
            let option = options[j];
            let monto = option.getAttribute('data-monto');
            
            if (filtro === '' || (monto && Math.abs(parseFloat(monto) - parseFloat(filtro)) < 0.01)) {
                option.style.display = 'block';
                visibleOptions++;
            } else {
                option.style.display = 'none';
            }
        }
        optgroup.style.display = (visibleOptions > 0) ? 'block' : 'none';
    }
}

function mostrarDetalle(el) {
    let div = el.parentNode.querySelector('.detalle-completo');
    let texto = el.options[el.selectedIndex].getAttribute('data-texto-completo');
    div.style.display = el.value ? 'block' : 'none';
    div.innerText = texto || '';
}

document.getElementById('btnExport').addEventListener('click', function() {
    XLSX.writeFile(XLSX.utils.json_to_sheet(<?= json_encode($tickets_for_export); ?>), "Tickets_Pendientes.xlsx");
});
</script>
</body>
</html>
<?php mysqli_close($connect); ?>