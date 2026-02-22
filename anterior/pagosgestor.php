<?php
require("datos.php");
$connect = mysqli_connect($host, $user, $pass, $db_name);

// ---------------------------------------------------------
// 1. LÓGICA AJAX: ACTUALIZAR EL CIERRE DEL GESTOR
// ---------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'cerrar_caja') {
  header('Content-Type: application/json');

  if (!$connect) {
    echo json_encode(['status' => 'error', 'message' => 'Error de conexión']);
    exit;
  }

  $codigo_gestor = mysqli_real_escape_string($connect, $_POST['codigo_gestor']);

  // Formato de fecha solicitado para guardar en BD
  $fecha_actual = date('d/m/Y h:i a');

  // Actualizamos: conciliado = 1 y fecha de cierre
  $query_update = "UPDATE gestores 
                     SET horacierre = '$fecha_actual', conciliado = 1 
                     WHERE codigo_gestor = '$codigo_gestor'";

  if (mysqli_query($connect, $query_update)) {
    echo json_encode(['status' => 'success', 'fecha' => $fecha_actual]);
  } else {
    echo json_encode(['status' => 'error', 'message' => mysqli_error($connect)]);
  }
  exit; // Detenemos la ejecución para no cargar HTML
}
// ---------------------------------------------------------

// Configuración de fechas iniciales
$start_date = date('Y-m-d', strtotime('last Saturday'));
$end_date = date('Y-m-d', strtotime('next Friday'));
$gestor = '';

// Procesar formulario de filtros
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if ($connect) {
    $start_date = mysqli_real_escape_string($connect, $_POST['start_date'] ?? $start_date);
    $end_date = mysqli_real_escape_string($connect, $_POST['end_date'] ?? $end_date);
    $gestor = mysqli_real_escape_string($connect, $_POST['gestor'] ?? '');
  }
}

$data = [];
$totales_por_gestor = [];
$estado_conciliacion = [];
$total_monto = 0;
$total_mora = 0;
$gestores = [];

if ($connect) {
  // A. Consulta de PAGOS (DQ)
  $query = "SELECT * FROM pagos WHERE fechap BETWEEN '$start_date' AND '$end_date' AND cod_cliente LIKE 'DQ%'";
  if (!empty($gestor)) {
    $query .= " AND codigo_gestor = '$gestor'";
  }
  $query .= " ORDER BY idpag DESC";

  $result = mysqli_query($connect, $query);

  if ($result) {
    while ($row = mysqli_fetch_assoc($result)) {
      $data[] = $row;
      $g = $row["codigo_gestor"];
      $montop = floatval($row["montop"]);
      $mora = floatval($row["mora"]);
      $tipocap = $row["tipocap"];

      $total_monto += $montop;
      $total_mora += $mora;

      if (!isset($totales_por_gestor[$g])) {
        $totales_por_gestor[$g] = [
          "cuentas" => 0,
          "montop" => 0,
          "mora" => 0,
          "bancario" => 0,
          "gestor" => 0
        ];
      }
      $totales_por_gestor[$g]["cuentas"]++;
      $totales_por_gestor[$g]["montop"] += $montop;
      $totales_por_gestor[$g]["mora"] += $mora;

      if ($tipocap === 'BANCARIO') {
        $totales_por_gestor[$g]["bancario"] += $montop;
      } elseif ($tipocap === 'GESTOR') {
        $totales_por_gestor[$g]["gestor"] += $montop;
      }
    }
  }

  // B. Consulta de ESTADO DE GESTORES (Para saber botones rojos/verdes)
  $query_status = "SELECT codigo_gestor, conciliado FROM gestores";
  $result_status = mysqli_query($connect, $query_status);
  if ($result_status) {
    while ($row_status = mysqli_fetch_assoc($result_status)) {
      $estado_conciliacion[$row_status['codigo_gestor']] = $row_status['conciliado'];
    }
  }

  // C. Lista de gestores para el select
  $gestores_result = mysqli_query($connect, "SELECT DISTINCT codigo_gestor FROM pagos ORDER BY codigo_gestor");
  if ($gestores_result) {
    while ($g_row = mysqli_fetch_assoc($gestores_result)) {
      $gestores[] = $g_row['codigo_gestor'];
    }
  }
} else {
  die("Error de conexión a la base de datos.");
}
?>

<!DOCTYPE html>
<html lang="es">

<head>
  <title>Reporte de Pagos (DQ)</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="shortcut icon" href="images/dasologo.ico" />

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.10.0/css/bootstrap-datepicker.min.css" />
  <link rel="stylesheet" href="stylos.css">

  <style>
    body {
      background-color: #f8f9fa;
      padding-top: 20px;
    }

    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      border: none;
    }

    .card-header {
      background-color: #2c3e50;
      color: white;
      font-weight: bold;
    }

    .table thead {
      background-color: #34495e;
      color: white;
    }

    .table-hover tbody tr:hover {
      background-color: #e9ecef;
    }

    .resumen-footer {
      background-color: #34495e;
      color: white;
      font-weight: bold;
    }

    @media print {
      .no-print {
        display: none !important;
      }

      .card {
        box-shadow: none;
        border: 1px solid #ddd;
      }
    }

    /* Clase auxiliar para identificar columnas que NO queremos en Excel (Botones) */
    .no-export {}
  </style>
</head>

<body>
  <?php include('menudaso.php'); ?>

  <div class="container-fluid">

    <div class="card no-print">
      <div class="card-header">Resumen por Agente de Cobro (DQ)</div>
      <div class="card-body">
        <div class="table-responsive">
          <table id="resumenGestores" class="table table-bordered table-sm table-hover text-center align-middle">
            <thead class="table-dark">
              <tr>
                <th>Agente</th>
                <th>Cuentas</th>
                <th>Total Monto</th>
                <th>Total Moratorio</th>
                <th>Montop BANCARIO</th>
                <th>Montop GESTOR</th>
                <th class="no-export">Cierre</th>
              </tr>
            </thead>
            <tbody>
              <?php
              $cuentas_total = 0;
              $montop_total = 0;
              $mora_total = 0;
              $bancario_total = 0;
              $gestor_total = 0;
              foreach ($totales_por_gestor as $gestor_key => $valores):
                $cuentas_total += $valores["cuentas"];
                $montop_total += $valores["montop"];
                $mora_total += $valores["mora"];
                $bancario_total += $valores["bancario"];
                $gestor_total += $valores["gestor"];

                // Verificamos estado (1 = Cerrado, 0/Null = Abierto)
                $esta_conciliado = isset($estado_conciliacion[$gestor_key]) && $estado_conciliacion[$gestor_key] == 1;
                ?>
                <tr>
                  <td class="fw-bold"><?= htmlspecialchars($gestor_key) ?></td>
                  <td><?= $valores["cuentas"] ?></td>
                  <td>$<?= number_format($valores["montop"], 2) ?></td>
                  <td>$<?= number_format($valores["mora"], 2) ?></td>
                  <td>$<?= number_format($valores["bancario"], 2) ?></td>
                  <td>$<?= number_format($valores["gestor"], 2) ?></td>

                  <td class="no-export">
                    <?php if ($esta_conciliado): ?>
                      <button type="button" class="btn btn-danger btn-sm" disabled>
                        <?= htmlspecialchars($gestor_key) ?> (Cerrado)
                      </button>
                    <?php else: ?>
                      <button type="button" class="btn btn-success btn-sm" id="btn-<?= $gestor_key ?>"
                        onclick="cerrarCajaGestor('<?= $gestor_key ?>')">
                        <?= htmlspecialchars($gestor_key) ?>
                      </button>
                    <?php endif; ?>
                  </td>

                </tr>
              <?php endforeach; ?>
            </tbody>
            <tfoot>
              <tr class="resumen-footer">
                <td>Total General</td>
                <td><?= $cuentas_total ?></td>
                <td>$<?= number_format($montop_total, 2) ?></td>
                <td>$<?= number_format($mora_total, 2) ?></td>
                <td>$<?= number_format($bancario_total, 2) ?></td>
                <td>$<?= number_format($gestor_total, 2) ?></td>
                <td class="no-export"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>Reporte de Pagos (DQ)</span>
      </div>
      <div class="card-body">
        <form method="POST" class="row g-3 align-items-end no-print mb-4">
          <div class="col-auto">
            <label for="start_date" class="form-label fw-bold">Desde:</label>
            <input type="text" name="start_date" id="start_date" value="<?= $start_date ?>"
              class="form-control datepicker" autocomplete="off">
          </div>
          <div class="col-auto">
            <label for="end_date" class="form-label fw-bold">Hasta:</label>
            <input type="text" name="end_date" id="end_date" value="<?= $end_date ?>" class="form-control datepicker"
              autocomplete="off">
          </div>
          <div class="col-auto">
            <label for="gestor" class="form-label fw-bold">Agente de Cobro:</label>
            <select name="gestor" id="gestor" class="form-select">
              <option value="">Todos</option>
              <?php foreach ($gestores as $g): ?>
                <option value="<?= htmlspecialchars($g) ?>" <?= ($g === $gestor) ? 'selected' : '' ?>>
                  <?= htmlspecialchars($g) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-info text-white">Buscar</button>
            <button type="button" id="btnExport" class="btn btn-success">Exportar a Excel</button>
            <button type="button" onclick="window.print()" class="btn btn-primary">Imprimir</button>
          </div>
        </form>

        <div class="table-responsive">
          <table id="tablaPagos" class="table table-striped table-bordered table-sm align-middle">
            <thead class="table-dark">
              <tr>
                <th>ID</th>
                <th>Fecha de pago</th>
                <th>Fecha y Hora</th>
                <th>Código Cliente</th>
                <th>Nombre Cliente</th>
                <th>Referencia de pago</th>
                <th>Monto</th>
                <th>Agente</th>
                <th>Concepto</th>
                <th>Periodicidad</th>
                <th>Día Cobro</th>
                <th>Teléfono</th>
                <th>Moratorio</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($data as $row):
                // Limpieza de fecha para visualización (y Excel base)
                $fecha_pago_limpia = !empty($row["fechap"]) ? date("d/m/Y", strtotime($row["fechap"])) : '';
                ?>
                <tr>
                  <td><?= $row["idpag"] ?></td>
                  <td><?= $fecha_pago_limpia ?></td>
                  <td><?= $row["fechahora"] ?></td>
                  <td><?= $row["cod_cliente"] ?></td>
                  <td><?= $row["nombre_ccliente"] ?></td>
                  <td><?= $row["ref_pago"] ?></td>
                  <td>$<?= number_format($row["montop"], 2) ?></td>
                  <td><?= $row["codigo_gestor"] ?></td>
                  <td><?= $row["sucursal"] ?></td>
                  <td><?= $row["periodicidad_cliente"] ?></td>
                  <td><?= $row["dia_cobro"] ?></td>
                  <td><?= $row["tel1_cliente"] ?></td>
                  <td>$<?= number_format($row["mora"], 2) ?></td>
                  <td><?= $row["tipocap"] ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
            <tfoot>
              <tr class="fw-bold bg-light">
                <td colspan="6" class="text-end">Totales:</td>
                <td>$<?= number_format($total_monto, 2) ?></td>
                <td colspan="5"></td>
                <td>$<?= number_format($total_mora, 2) ?></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.10.0/js/bootstrap-datepicker.min.js"></script>
  <script
    src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.10.0/locales/bootstrap-datepicker.es.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>

  <script>
    // 1. Configuración Datepicker
    $('.datepicker').datepicker({
      format: "yyyy-mm-dd",
      autoclose: true,
      todayBtn: 'linked',
      language: 'es',
      orientation: "bottom auto"
    });

    // 2. Función AJAX para cerrar caja
    function cerrarCajaGestor(codigoGestor) {
      if (!confirm('¿Estás seguro de cerrar la caja para el gestor ' + codigoGestor + '?\nEsta acción no se puede deshacer.')) {
        return;
      }

      $.ajax({
        url: '',
        type: 'POST',
        data: {
          action: 'cerrar_caja',
          codigo_gestor: codigoGestor
        },
        dataType: 'json',
        success: function (response) {
          if (response.status === 'success') {
            var btn = $('#btn-' + codigoGestor);
            btn.prop('disabled', true);
            btn.removeClass('btn-success').addClass('btn-danger'); // Cambia a rojo
            btn.text(codigoGestor + ' (Cerrado)');
            alert('Caja cerrada correctamente el: ' + response.fecha);
          } else {
            alert('Error al guardar: ' + response.message);
          }
        },
        error: function (xhr, status, error) {
          console.error(xhr.responseText);
          alert('Ocurrió un error de conexión.');
        }
      });
    }

    // 3. Lógica EXCEL AVANZADA (Para que los montos sean numéricos)
    document.getElementById('btnExport').addEventListener('click', function () {
      const wb = XLSX.utils.book_new();

      // Función auxiliar para obtener la tabla sin la columna de botones
      function obtenerTablaLimpia(idTabla) {
        var original = document.getElementById(idTabla);
        var clon = original.cloneNode(true);
        clon.querySelectorAll('.no-export').forEach(el => el.remove());
        return clon;
      }

      // Función que convierte celdas de texto con "$" a NÚMEROS reales en Excel
      function corregirMontosEnHoja(sheet) {
        function corregirMontosEnHoja(sheet) {
          for (var cellRef in sheet) {
            if (cellRef[0] === '!') continue; // Saltar metadatos

            var cell = sheet[cellRef];

            // Detectar si es celda de texto ('s') y contiene el signo '$'
            if (cell.t === 's' && cell.v && typeof cell.v === 'string' && cell.v.includes('$')) {
              var numeroLimpio = cell.v.replace(/\$/g, '').replace(/,/g, '').trim();

              if (!isNaN(numeroLimpio) && numeroLimpio !== '') {
                cell.v = parseFloat(numeroLimpio); // Convertir a número real
                cell.t = 'n'; // Marcar como tipo Number
                cell.z = '"$"#,##0.00'; // Aplicar formato de moneda personalizado
              }
            }
          }
        }
        for (var cellRef in sheet) {
          if (cellRef[0] === '!') continue; // Saltar metadatos

          var cell = sheet[cellRef];

          // Detectar si es texto y tiene signo de pesos
          if (cell.t === 's' && cell.v && cell.v.includes('$')) {
            var numeroLimpio = cell.v.replace(/\$/g, '').replace(/,/g, '').trim();

            if (!isNaN(numeroLimpio) && numeroLimpio !== '') {
              cell.v = parseFloat(numeroLimpio); // Convertir a Numero
              cell.t = 'n'; // Marcar como tipo Number
              cell.z = '"$"#,##0.00'; // Aplicar formato de celda Moneda
            }
          }
        }
      }

      // Procesar Tabla de Pagos
      var tablaPagos = obtenerTablaLimpia('tablaPagos');
      var sheetPagos = XLSX.utils.table_to_sheet(tablaPagos, { raw: true });
      corregirMontosEnHoja(sheetPagos); // <--- Corrección Numérica
      XLSX.utils.book_append_sheet(wb, sheetPagos, "Pagos");

      // Procesar Resumen
      var tablaResumen = obtenerTablaLimpia('resumenGestores');
      var sheetResumen = XLSX.utils.table_to_sheet(tablaResumen, { raw: true });
      corregirMontosEnHoja(sheetResumen); // <--- Corrección Numérica
      XLSX.utils.book_append_sheet(wb, sheetResumen, "Resumen por Gestor");

      // Descargar archivo
      XLSX.writeFile(wb, "reporte_pagos.xlsx");
    });
  </script>
</body>

</html>