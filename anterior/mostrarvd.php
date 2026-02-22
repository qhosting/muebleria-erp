<?php
require_once("datos.php");
$con = mysqli_connect($host, $user, $pass, $db_name) or die('Error con la conexion de la base de datos');
if (isset($_POST['fecha1'] ) || isset($_POST['fecha2'] )) {
     $f1 = $_POST['fecha1'];
     $f2 = $_POST['fecha2']; 
$consulta = <<<SQL
SELECT
id_vd,
contrato,
c_cliente,
nom_cliente,
codigo_gestor,
fecha
FROM
vd WHERE fecha between '$f1' AND '$f2' 
SQL;
$filas = mysqli_query($con,$consulta);
//echo $filas;
}
?>
<html>
	<head>
	
		<title>Tabla Verificacion Domiciliaria</title>
		<style>
    #scroll{
        border:1px solid;
        height:500px;
        width:1200px;
		overflow: auto;
        overflow-y:auto;
        overflow-x:auto;
    }
    </style>
        <link rel="stylesheet" href="jquery.dataTables.css" />
		<link rel="stylesheet" type="text/css" href="filtergrid.css" media="screen" />
		<link rel="shortcut icon" href="images/dasologo.ico"/> 
		<link href="styles.css">
		<link rel="stylesheet"  href="stylos.css">
		<script type="text/javascript" src="tablefilter.js"></script>
		<script src="jquery-3.2.1.min.js"></script>
		<script src="jquery.dataTables.js"></script>
		<script type="text/javascript" src="tablefilter.js"></script>
		<script src="dataTables.fixedColumns.min.js"></script>
	     <script src="jquery.dataTables.js"></script>
		  <script src="jquery.table2excel.js"></script>
			
		 <script language="javascript" type="text/javascript"> 

	$(document).ready(function() {
    $('#datos').DataTable( {

        "language": {
             "sProcessing":     "Procesando...",
    "sLengthMenu":     "Mostrar _MENU_ registros",
    "sZeroRecords":    "No se encontraron resultados",
    "sEmptyTable":     "Ningún dato disponible en esta tabla",
    "sInfo":           "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
    "sInfoEmpty":      "Mostrando registros del 0 al 0 de un total de 0 registros",
    "sInfoFiltered":   "(filtrado de un total de _MAX_ registros)",
    "sInfoPostFix":    "",
    "sSearch":         "Buscar:",
    "sUrl":            "",
    "sInfoThousands":  ",",
    "sLoadingRecords": "Cargando...",
    "oPaginate": {
        "sFirst":    "Primero",
        "sLast":     "Último",
        "sNext":     "Siguiente",
        "sPrevious": "Anterior"
    },
    "oAria": {
        "sSortAscending":  ": Activar para ordenar la columna de manera ascendente",
        "sSortDescending": ": Activar para ordenar la columna de manera descendente"
    }
        },"lengthMenu": [[10, 25, 50,100, -1], [10, 25, 50,100, "Todos"]] ,  
    } );
} );	 
$(document).ready(function() {
    // Setup - add a text input to each footer cell
    $('#datos tfoot th').each( function () {
		
        var title = $(this).text();
        $(this).html( '<input type="text" size="10" placeholder="'+title+'" />' );
    } );
    // DataTable
    var table = $('#datos').DataTable();
    // Apply the search
    table.columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                that
                    .search( this.value )
                    .draw();	
            }
        } );	
    } );
} );
	  
</script> 
		
	</head>
	<body>
		<center>
<?php include('menut.php'); ?>
		</br>
<legend align="center" style="font-size: 24pt; color: #000"><b>VD Aplicadas</b></legend>		
		</br></br>
		<div>		
<button>Exportar a Excel</button> 
	</div>	
<div id="scroll">
<table id="datos" >
 <thead > 
<tr>
<th >ID</th>
<th >Fecha</th>
<th >Contrato</th>
<th >Codigo cliente</th>
<th >Nombre del Cliente</th>
<th >Codigo Gestor</th>


<th ></th>

</tr>
</thead>

 <tfoot style="display: table-header-group;">
<tr>
<th >ID</th>
<th >Fecha</th>
<th >Contrato</th>
<th >Codigo cliente</th>
<th >Nombre del Cliente</th>
<th >Codigo Gestor</th>


<th ></th>

</tr>
</tfoot>

 
<?php
while($columna = mysqli_fetch_array($filas)){
$id_vd=$columna['id_vd'];
$fecha=$columna['fecha'];
$contrato=$columna['contrato'];
$c_cliente=$columna['c_cliente'];
$nom_cliente=$columna['nom_cliente'];
$codigo_gestor=$columna['codigo_gestor'];


echo "<tr>";
echo "<td>$columna[id_vd]</td>";
echo "<td>$columna[fecha]</td>";
echo "<td>$columna[contrato]</td>";
echo "<td>$columna[c_cliente]</td>";
echo "<td>$columna[nom_cliente]</td>";
echo "<td>$columna[codigo_gestor]</td>";



echo "<td>  <a href='vervd.php?id_vd=$id_vd'>Ver</a></td>"; 

echo "</tr>";
}
?>
</table>		
</div>	

<script>
   $("button").click(function(){
  $("#datos").table2excel({
    filename: "VD Aplicados"
  }); 
});	
    </script>		
	</center>
	</body>
</html>