<?php
// 1. CARGA DE CONFIGURACIÓN Y CONEXIÓN
require("config.php");

if (!$conn) { 
    die("Error de conexión: " . mysqli_connect_error());
}

$feedback_message = '';
$edit_data = null;

// --- LÓGICA DE FECHAS POR DEFECTO (Sábado a Viernes) ---
if (isset($_GET['fecha_inicio']) && isset($_GET['fecha_fin'])) {
    $fecha_inicio = mysqli_real_escape_string($conn, $_GET['fecha_inicio']);
    $fecha_fin = mysqli_real_escape_string($conn, $_GET['fecha_fin']);
} else {
    // Si hoy es sábado (6), ese es el inicio. Si no, busca el último sábado.
    $inicio = (date('N') == 6) ? strtotime('today') : strtotime('last saturday');
    $fecha_inicio = date('Y-m-d', $inicio);
    // El viernes siguiente al sábado de inicio
    $fecha_fin = date('Y-m-d', strtotime('next friday', $inicio));
}

// 2. PROCESAMIENTO DE ACCIONES (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // --- ACCIÓN: GUARDAR (CREAR O EDITAR) ---
    if (isset($_POST['action']) && $_POST['action'] === 'save') {
        $id = isset($_POST['id']) ? mysqli_real_escape_string($conn, $_POST['id']) : '';
        $contrato = mysqli_real_escape_string($conn, $_POST['contrato']);
        $monto = mysqli_real_escape_string($conn, $_POST['monto']);
        $fecha = mysqli_real_escape_string($conn, $_POST['fecha']);
        $hr = mysqli_real_escape_string($conn, $_POST['hr']);
        $referencia = mysqli_real_escape_string($conn, $_POST['referencia']);
        $folio = mysqli_real_escape_string($conn, $_POST['folio']);
        $claverastreo = mysqli_real_escape_string($conn, $_POST['claverastreo']);
        $remitente = mysqli_real_escape_string($conn, $_POST['remitente']);

        if (!empty($id)) {
            $sql = "UPDATE ticket SET contrato='$contrato', monto='$monto', fecha='$fecha', hr='$hr', 
                    referencia='$referencia', folio='$folio', claverastreo='$claverastreo', remitente='$remitente' 
                    WHERE id='$id'";
            $msg = "Ticket actualizado correctamente.";
        } else {
            $sql = "INSERT INTO ticket (contrato, monto, fecha, hr, referencia, folio, claverastreo, remitente, conciliado) 
                    VALUES ('$contrato', '$monto', '$fecha', '$hr', '$referencia', '$folio', '$claverastreo', '$remitente', 0)";
            $msg = "Ticket registrado correctamente.";
        }

        if (mysqli_query($conn, $sql)) {
            $feedback_message = "<p class='msg-success'>$msg</p>";
        } else {
            $feedback_message = "<p class='msg-error'>Error: " . mysqli_error($conn) . "</p>";
        }
    }

    // --- ACCIÓN: ELIMINAR CON REVERSIÓN TOTAL ---
    if (isset($_POST['action']) && $_POST['action'] === 'delete') {
        $id = mysqli_real_escape_string($conn, $_POST['id']);
        
        // Obtener IDs de relación antes de borrar
        $q_info = mysqli_query($conn, "SELECT idpago, idbancos FROM ticket WHERE id = '$id'");
        $t_info = mysqli_fetch_assoc($q_info);
        $idpago_ref = $t_info['idpago'];
        $idbancos_ref = $t_info['idbancos'];

        mysqli_begin_transaction($conn);
        try {
            // 1. Limpiar estado_de_cuenta (usando id de la tabla)
            if (!empty($idbancos_ref)) {
                mysqli_query($conn, "UPDATE estado_de_cuenta SET ticket_id = NULL, id_pago = NULL, cod_cliente = NULL, fecha_identificado = NULL WHERE id = '$idbancos_ref'");
            }

            // 2. Revertir saldo en cat_clientes y eliminar pago
            if (!empty($idpago_ref)) {
                $q_pago = mysqli_query($conn, "SELECT cod_cliente, montop FROM pagos WHERE idpag = '$idpago_ref'");
                if ($p_data = mysqli_fetch_assoc($q_pago)) {
                    $u_cli = $p_data['cod_cliente'];
                    $u_monto = $p_data['montop'];
                    
                    // Sumar saldo y resetear estatus 'pagar'
                    mysqli_query($conn, "UPDATE cat_clientes SET saldo_actualcli = saldo_actualcli + $u_monto, pagar = 0 WHERE cod_cliente = '$u_cli'");
                }
                // Eliminar registro en tabla pagos
                mysqli_query($conn, "DELETE FROM pagos WHERE idpag = '$idpago_ref'");
            }

            // 3. Eliminar el ticket
            mysqli_query($conn, "DELETE FROM ticket WHERE id = '$id'");

            mysqli_commit($conn);
            $feedback_message = "<p class='msg-success'>Ticket eliminado y saldo revertido al cliente con éxito.</p>";
        } catch (Exception $e) {
            mysqli_rollback($conn);
            $feedback_message = "<p class='msg-error'>Error en la reversión: " . $e->getMessage() . "</p>";
        }
    }
}

// 3. CARGAR DATOS PARA EDITAR (GET)
if (isset($_GET['edit'])) {
    $id_edit = mysqli_real_escape_string($conn, $_GET['edit']);
    $res_edit = mysqli_query($conn, "SELECT * FROM ticket WHERE id = '$id_edit'");
    $edit_data = mysqli_fetch_assoc($res_edit);
}

// 4. CONSULTA GENERAL CON FILTROS
$sql_tickets = "SELECT t.*, ec.bank as nombre_banco, p.idpag as confirmacion_pago
                FROM ticket t
                LEFT JOIN estado_de_cuenta ec ON t.idbancos = ec.id
                LEFT JOIN pagos p ON t.idpago = p.idpag
                WHERE t.fecha BETWEEN '$fecha_inicio' AND '$fecha_fin'
                ORDER BY t.fecha DESC, t.hr DESC";
$res_tickets = mysqli_query($conn, $sql_tickets);

require 'includes/header.php';
?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Gestión de Tickets</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f4f7f6; margin: 20px; }
        .container { max-width: 1250px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .filter-bar { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #dee2e6; }
        .form-edit { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; }
        .form-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .form-grid div { display: flex; flex-direction: column; }
        label { font-size: 12px; font-weight: bold; color: #555; margin-bottom: 4px; }
        input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
        .btn { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; color: white; display: inline-flex; align-items: center; gap: 5px; text-decoration: none; }
        .btn-filter { background: #007bff; }
        .btn-save { background: #28a745; grid-column: span 4; justify-content: center; }
        .btn-edit { background: #17a2b8; font-size: 11px; padding: 5px 8px; }
        .btn-delete { background: #dc3545; font-size: 11px; padding: 5px 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
        th, td { padding: 12px; border: 1px solid #eee; text-align: left; }
        th { background: #f1f1f1; color: #333; text-transform: uppercase; font-size: 11px; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; color: white; font-weight: bold; }
        .bg-red { background: #dc3545; }
        .bg-green { background: #28a745; }
        .msg-success { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #c3e6cb; }
        .msg-error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 15px; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>

<div class="container">
    <h2><i class="fa fa-ticket"></i> <?php echo $edit_data ? 'Editar Ticket #'.$edit_data['id'] : 'Registrar Nuevo Ticket'; ?></h2>
    
    <?php echo $feedback_message; ?>

    <div class="filter-bar">
        <form method="GET" style="display: flex; align-items: flex-end; gap: 15px;">
            <div>
                <label>Fecha Inicio (Sábado):</label>
                <input type="date" name="fecha_inicio" value="<?php echo $fecha_inicio; ?>">
            </div>
            <div>
                <label>Fecha Fin (Viernes):</label>
                <input type="date" name="fecha_fin" value="<?php echo $fecha_fin; ?>">
            </div>
            <button type="submit" class="btn btn-filter"><i class="fa fa-search"></i> Filtrar Rango</button>
            <a href="ticket.php" style="font-size: 12px; color: #666; margin-bottom: 10px;">Limpiar filtros</a>
        </form>
    </div>

    <div class="form-edit">
        <form method="POST">
            <input type="hidden" name="action" value="save">
            <?php if($edit_data): ?><input type="hidden" name="id" value="<?php echo $edit_data['id']; ?>"><?php endif; ?>
            
            <div class="form-grid">
                <div><label>Contrato</label><input type="text" name="contrato" value="<?php echo $edit_data['contrato'] ?? ''; ?>" required></div>
                <div><label>Monto</label><input type="number" step="0.01" name="monto" value="<?php echo $edit_data['monto'] ?? ''; ?>" required></div>
                <div><label>Fecha Reporte</label><input type="date" name="fecha" value="<?php echo $edit_data['fecha'] ?? ''; ?>" required></div>
                <div><label>Hora</label><input type="time" name="hr" value="<?php echo $edit_data['hr'] ?? ''; ?>" required></div>
                <div><label>Referencia</label><input type="text" name="referencia" value="<?php echo $edit_data['referencia'] ?? ''; ?>"></div>
                <div><label>Folio</label><input type="text" name="folio" value="<?php echo $edit_data['folio'] ?? ''; ?>"></div>
                <div><label>Clave Rastreo</label><input type="text" name="claverastreo" value="<?php echo $edit_data['claverastreo'] ?? ''; ?>"></div>
                <div><label>Remitente</label><input type="text" name="remitente" value="<?php echo $edit_data['remitente'] ?? ''; ?>"></div>
                
                <button type="submit" class="btn btn-save">
                    <i class="fa fa-check"></i> <?php echo $edit_data ? 'Actualizar Información' : 'Registrar Ticket'; ?>
                </button>
            </div>
        </form>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Contrato</th>
                <th>Monto</th>
                <th>Fecha/Hr</th>
                <th>Estado</th>
                <th>Vínculos</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <?php while ($row = mysqli_fetch_assoc($res_tickets)): ?>
            <tr>
                <td><?php echo $row['id']; ?></td>
                <td><strong><?php echo htmlspecialchars($row['contrato']); ?></strong></td>
                <td>$<?php echo number_format($row['monto'], 2); ?></td>
                <td><?php echo $row['fecha']; ?><br><small><?php echo $row['hr']; ?></small></td>
                <td>
                    <span class="badge <?php echo $row['conciliado'] ? 'bg-green' : 'bg-red'; ?>">
                        <?php echo $row['conciliado'] ? 'CONCILIADO' : 'PENDIENTE'; ?>
                    </span>
                </td>
                <td>
                    <?php if($row['idpago']): ?>
                        <div style="font-size: 11px; color:#28a745;">Pago: #<?php echo $row['idpago']; ?></div>
                    <?php endif; ?>
                    <?php if($row['idbancos']): ?>
                        <div style="font-size: 11px; color:#007bff;">Banco: <?php echo htmlspecialchars($row['nombre_banco'] ?? 'ID: '.$row['idbancos']); ?></div>
                    <?php endif; ?>
                </td>
                <td style="white-space: nowrap;">
                    <a href="ticket.php?edit=<?php echo $row['id']; ?>&fecha_inicio=<?php echo $fecha_inicio; ?>&fecha_fin=<?php echo $fecha_fin; ?>" class="btn btn-edit">
                        <i class="fa fa-pencil"></i>
                    </a>
                    <form method="POST" onsubmit="return confirm('¿Está seguro de eliminar este ticket? Se revertirá el saldo al cliente y se borrará el pago vinculado.');" style="display:inline;">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?php echo $row['id']; ?>">
                        <button type="submit" class="btn btn-delete">
                            <i class="fa fa-trash"></i>
                        </button>
                    </form>
                </td>
            </tr>
            <?php endwhile; ?>
        </tbody>
    </table>
</div>

</body>
</html>
<?php mysqli_close($conn); ?>