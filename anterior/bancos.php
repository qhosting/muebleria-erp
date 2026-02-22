<?php
include('menudaso.php');
// Incluir la configuración de la base de datos
require("datos.php");
$connect = mysqli_connect($host, $user, $pass, $db_name);

// --- Lógica de Actualización (Conciliación) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_id'])) {
    $update_id = mysqli_real_escape_string($connect, $_POST['update_id']);
    $ticket_id = mysqli_real_escape_string($connect, $_POST['ticket_id']);

    // 1. Obtener el 'contrato' (cod_cliente) desde la tabla ticket
    $ticket_info_query = "SELECT contrato FROM ticket WHERE id = '$ticket_id' LIMIT 1";
    $ticket_info_result = mysqli_query($connect, $ticket_info_query);
    $ticket_info = mysqli_fetch_assoc($ticket_info_result);
    $cod_cliente = $ticket_info ? $ticket_info['contrato'] : '';

    if ($cod_cliente) {
        // 2. Obtener el codigo_gestor desde cat_clientes
        $gestor_query = "SELECT codigo_gestor FROM cat_clientes WHERE cod_cliente = '$cod_cliente' LIMIT 1";
        $gestor_result = mysqli_query($connect, $gestor_query);
        $gestor_row = mysqli_fetch_assoc($gestor_result);
        $gestor = $gestor_row ? $gestor_row['codigo_gestor'] : '';

        // 3. Actualizar estado_de_cuenta
        $update_estado_cuenta_query = "UPDATE estado_de_cuenta SET ticket_id = '$ticket_id', cod_cliente = '$cod_cliente', gestor = '$gestor', fecha_identificado = NOW() WHERE id = '$update_id'";
        mysqli_query($connect, $update_estado_cuenta_query);

        // 4. Actualizar el ticket
        $update_ticket_query = "UPDATE ticket SET conciliado = 1, idbancos = '$update_id' WHERE id = '$ticket_id'";
        mysqli_query($connect, $update_ticket_query);
    }

    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// --- Lógica de Filtrado y Visualización ---
$start_date = date('Y-m-01');
$end_date = date('Y-m-t');
$search_term = $_POST['search_term'] ?? '';
$status_filter = $_GET['status'] ?? 'no_conciliado';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['start_date'])) {
    $start_date = $_POST['start_date'];
    $end_date = $_POST['end_date'];
}

// --- Query para el Detalle de Movimientos ---
$data_query = "SELECT * FROM estado_de_cuenta WHERE fecha_operacion BETWEEN '$start_date' AND '$end_date'";
if ($status_filter == 'conciliado') $data_query .= " AND ticket_id IS NOT NULL";
elseif ($status_filter == 'no_conciliado') $data_query .= " AND ticket_id IS NULL";
if (!empty($search_term)) {
    $escaped_term = mysqli_real_escape_string($connect, $search_term);
    $data_query .= " AND (descripcion_general LIKE '%$escaped_term%' OR referencia LIKE '%$escaped_term%' OR concepto LIKE '%$escaped_term%' OR cod_cliente LIKE '%$escaped_term%')";
}
$data_query .= " ORDER BY id DESC";
$data_result = mysqli_query($connect, $data_query);
$data = [];
while ($row = mysqli_fetch_assoc($data_result)) {
    $data[] = $row;
}

// --- Query para el Resumen por Gestor ---
$resumen_query = "
    SELECT 
        p.codigo_gestor AS GESTOR,
        SUM(CASE WHEN p.tipocap = 'BANCARIO' THEN 1 ELSE 0 END) AS CTAS_BANCOS,
        SUM(CASE WHEN p.tipocap = 'GESTOR' THEN 1 ELSE 0 END) AS CTAS_GESTOR,
        SUM(CASE WHEN p.tipocap = 'BANCARIO' THEN p.montop ELSE 0 END) AS MONTO_BANCOS,
        SUM(CASE WHEN p.tipocap = 'GESTOR' THEN p.montop ELSE 0 END) AS MONTO_GESTOR,
        COUNT(p.idpag) AS TCUENTAS,
        SUM(p.montop) AS TOTAL_MONTO
    FROM pagos p
    WHERE p.fechap BETWEEN '$start_date' AND '$end_date'
    GROUP BY p.codigo_gestor
    ORDER BY p.codigo_gestor;
";
$resumen_result = mysqli_query($connect, $resumen_query);
$resumen_data = [];
while ($row = mysqli_fetch_assoc($resumen_result)) {
    $resumen_data[] = $row;
}

// *** NUEVO QUERY PARA EXPORTAR TICKETS ***
$tickets_export_query = "
    SELECT id, contrato, codigo_gestor, monto, referencia, folio, fecha, hr, 
           creado_en, claverastreo, remitente, conciliado, idbancos, idpago 
    FROM ticket 
    WHERE fecha BETWEEN '$start_date' AND '$end_date'";
$tickets_export_result = mysqli_query($connect, $tickets_export_query);
$tickets_for_export = [];
while ($row = mysqli_fetch_assoc($tickets_export_result)) {
    $tickets_for_export[] = $row;
}

// Obtener tickets no conciliados para el dropdown
$tickets_query = "SELECT id, contrato, monto FROM ticket WHERE conciliado = 0 ORDER BY id DESC";
$tickets_result = mysqli_query($connect, $tickets_query);
$tickets_no_conciliados = [];
while ($row = mysqli_fetch_assoc($tickets_result)) {
    $tickets_no_conciliados[] = $row;
}
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Conciliación Manual y Reportes</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.16.9/xlsx.full.min.js"></script>
</head>
<body>
  <div class="container-fluid mt-4">
    
    <div class="card mb-4">
      <div class="card-header">Filtros de Búsqueda</div>
      <div class="card-body">
        <form method="POST" class="form-inline mb-3">
          <label for="start_date" class="mr-2">Fecha Inicio:</label>
          <input type="text" class="form-control datepicker mr-3" name="start_date" value="<?= htmlspecialchars($start_date) ?>">
          <label for="end_date" class="mr-2">Fecha Fin:</label>
          <input type="text" class="form-control datepicker mr-3" name="end_date" value="<?= htmlspecialchars($end_date) ?>">
          <label for="search_term" class="mr-2">Buscar:</label>
          <input type="text" class="form-control mr-3" name="search_term" placeholder="Descripción, referencia, etc." value="<?= htmlspecialchars($search_term) ?>">
          <button type="submit" class="btn btn-primary">Buscar</button>
        </form>
        <div class="btn-group">
            <a href="?status=no_conciliado" class="btn btn-warning">No Conciliado</a>
            <a href="?status=conciliado" class="btn btn-success">Conciliado</a>
            <a href="?status=todos" class="btn btn-info">Todos</a>
        </div>
        
        <button class="btn btn-secondary" type="button" data-toggle="collapse" data-target="#resumenCollapse">
            Mostrar/Ocultar Resumen
        </button>
        <button id="btnExport" class="btn btn-success float-right">Exportar a Excel</button>
      </div>
    </div>

    <div class="collapse" id="resumenCollapse">
        <div class="card card-body mb-4">
            <h5 class="card-title">Resumen por Gestor</h5>
            <div class="table-responsive">
                <table class="table table-sm table-bordered" id="tablaResumen">
                    <thead class="thead-light">
                        <tr>
                            <th>GESTOR</th><th>CTAS BANCOS</th><th>CTAS GESTOR</th><th>$ BANCOS</th><th>$ GESTOR</th><th>T. CUENTAS</th><th>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                            $total_ctas_bancos = 0; $total_ctas_gestor = 0; $total_monto_bancos = 0;
                            $total_monto_gestor = 0; $total_cuentas = 0; $total_monto = 0;
                        ?>
                        <?php foreach ($resumen_data as $res) : ?>
                        <tr>
                            <td><?= htmlspecialchars($res['GESTOR']) ?></td>
                            <td><?= $res['CTAS_BANCOS']; $total_ctas_bancos += $res['CTAS_BANCOS']; ?></td>
                            <td><?= $res['CTAS_GESTOR']; $total_ctas_gestor += $res['CTAS_GESTOR']; ?></td>
                            <td>$<?= number_format($res['MONTO_BANCOS'], 2); $total_monto_bancos += $res['MONTO_BANCOS']; ?></td>
                            <td>$<?= number_format($res['MONTO_GESTOR'], 2); $total_monto_gestor += $res['MONTO_GESTOR']; ?></td>
                            <td><?= $res['TCUENTAS']; $total_cuentas += $res['TCUENTAS']; ?></td>
                            <td>$<?= number_format($res['TOTAL_MONTO'], 2); $total_monto += $res['TOTAL_MONTO']; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                    <tfoot class="font-weight-bold">
                        <tr>
                            <td>TOTAL</td>
                            <td><?= $total_ctas_bancos ?></td>
                            <td><?= $total_ctas_gestor ?></td>
                            <td>$<?= number_format($total_monto_bancos, 2) ?></td>
                            <td>$<?= number_format($total_monto_gestor, 2) ?></td>
                            <td><?= $total_cuentas ?></td>
                            <td>$<?= number_format($total_monto, 2) ?></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>

    <div class="card">
      <div class="card-header">
        Detalle de Movimientos (Mostrando: <?= htmlspecialchars(ucfirst(str_replace('_', ' ', $status_filter))) ?>)
      </div>
      <div class="card-body table-responsive">
        <table class="table table-bordered table-striped table-hover table-sm" id="tablaDetalle">
            <thead class="thead-dark">
                <tr>
                    <th>ID</th><th>Fecha Op.</th><th>Hora Op.</th><th>Descripción</th><th>Abono</th><th>Referencia</th><th>Concepto</th><th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($data as $row) : ?>
                <tr>
                    <td><?= $row['id'] ?></td>
                    <td><?= $row['fecha_operacion'] ?></td>
                    <td><?= $row['hora_operacion'] ?></td>
                    <td><?= $row['descripcion_general'] ?></td>
                    <td>$<?= number_format($row['abono'], 2) ?></td>
                    <td><?= $row['referencia'] ?></td>
                    <td><?= $row['concepto'] ?></td>
                    <td>
                    <?php if (empty($row['ticket_id'])) : ?>
                        <form method="POST" class="form-inline">
                            <input type="hidden" name="update_id" value="<?= $row['id'] ?>">
                            <select name="ticket_id" class="form-control form-control-sm mr-2" required>
                                <option value="">Seleccionar Ticket...</option>
                                <?php foreach ($tickets_no_conciliados as $ticket) : ?>
                                <option value="<?= $ticket['id'] ?>"><?= $ticket['id'] ?> - <?= $ticket['contrato'] ?> ($<?= $ticket['monto'] ?>)</option>
                                <?php endforeach; ?>
                            </select>
                            <button type="submit" class="btn btn-success btn-sm">Conciliar</button>
                        </form>
                    <?php else : ?>
                        <span class="badge badge-info p-2">
                        Conciliado con Ticket ID: <?= $row['ticket_id'] ?><br>
                        Cliente: <?= $row['cod_cliente'] ?><br>
                        Gestor: <?= $row['gestor'] ?><br>
                        Fecha: <?= $row['fecha_identificado'] ?>
                        </span>
                    <?php endif; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
      </div>
    </div>
  </div>

  <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
  <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/locales/bootstrap-datepicker.es.min.js"></script>
  
  <script>
    // Script para el datepicker
    $('.datepicker').datepicker({ format: "yyyy-mm-dd", autoclose: true, todayBtn: 'linked', language: 'es' });
    
    // *** SCRIPT DE EXPORTACIÓN ACTUALIZADO ***
    const ticketsForExport = <?= json_encode($tickets_for_export); ?>;

    document.getElementById('btnExport').addEventListener('click', function() {
      // 1. Crear un nuevo libro de trabajo
      const wb = XLSX.utils.book_new();

      // 2. Convertir la tabla de detalle a una hoja de cálculo
      const ws_detalle = XLSX.utils.table_to_sheet(document.getElementById('tablaDetalle'));
      XLSX.utils.book_append_sheet(wb, ws_detalle, "Detalle Movimientos");

      // 3. Convertir la tabla de resumen a una segunda hoja
      const ws_resumen = XLSX.utils.table_to_sheet(document.getElementById('tablaResumen'));
      XLSX.utils.book_append_sheet(wb, ws_resumen, "Resumen por Gestor");

      // 4. Convertir los datos de tickets a una tercera hoja
      const ws_tickets = XLSX.utils.json_to_sheet(ticketsForExport);
      XLSX.utils.book_append_sheet(wb, ws_tickets, "Reporte Tickets");

      // 5. Generar y descargar el archivo Excel
      const fecha = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Reporte_Conciliacion_${fecha}.xlsx`);
    });
  </script>
</body>
</html>