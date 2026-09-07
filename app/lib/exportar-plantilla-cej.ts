import * as XLSX from "xlsx";
import { DetalleCalculadoCEJ, ResumenCorteCEJ } from "./corte-cej-utils";

export interface DatosExportacionCEJ {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  detalles: DetalleCalculadoCEJ[];
  resumen?: ResumenCorteCEJ;
}

/**
 * Genera el archivo Excel oficial idéntico a PLANTILLA - CEJ.xlsx
 */
export function generarExcelCEJ(datos: DatosExportacionCEJ): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const setCell = (r: number, c: number, v: any, t: 's' | 'n' | 'b' = 's', f?: string) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (f) {
      ws[addr] = { v, t: 'n', f };
    } else if (typeof v === 'number') {
      ws[addr] = { v, t: 'n' };
    } else {
      ws[addr] = { v: String(v ?? ''), t: 's' };
    }
  };

  // --- 1. ENCABEZADO OFICIAL (Filas 0 a 3, Excel 1 a 4) ---
  setCell(0, 0, "GRUPO MUEBLERO DASO SA DE CV");
  setCell(1, 0, "Relación de Cobranza Querétaro");

  setCell(2, 0, "Correspondiente a la semana del ");
  setCell(2, 4, datos.fechaInicioStr);
  setCell(2, 5, "al");
  setCell(2, 6, datos.fechaFinStr);
  setCell(2, 8, "SEMANA");
  setCell(2, 14, datos.semana, 'n');

  setCell(3, 0, "Gestor de Cobranza ");
  setCell(3, 2, `${datos.nombreGestor} RUTA SEMANA ${datos.semana}`);
  setCell(3, 5, "FECHA IMPRESIÓN");
  setCell(3, 16, new Date().toLocaleDateString("es-MX"));

  // --- 2. ENCABEZADOS DE TABLA (Fila 7, Excel 8) ---
  const headersLeft = [
    "CODIGO CLIENTE",
    "CUENTA",
    "CONTRATO",
    "Periodo Inicial",
    "RAZON SOCIAL",
    "PERIODO DE PAGO",
    "PAGO SUGERIDO",
    "SALDO VENCIDO",
    "PV",
    "SALDO ACTUAL",
    "GESTOR",
    "SUP",
    "MOR",
    "PVR",
    "PAGO",
    "DIA DE PAGO",
    "TIPO DE COBRO",
    "TEL2",
    "TEL22",
    "C",
    "PAGOANALISTA",
    "PROBLEMA",
    "PAGO DOBLE",
    "NUM DE PAGOS DOBLES",
    "RECUPERADO PV",
    "NUM DE PAGOS DOBLES2",
    "COMANALISTA",
    "FECHA DE PAGO",
    "SERIE ",
    "TIP COB"
  ];

  headersLeft.forEach((h, col) => setCell(7, col, h));

  // Encabezados de Tabla Cobros (Columna 32 en adelante)
  const headersRight = [
    "ID",
    "Fecha de pago",
    "Fecha y Hora",
    "Codigo Cliente",
    "Nombre Cliente",
    "Referencia de pago",
    "Monto",
    "Agente de Cobro",
    "Concepto",
    "Periodicidad",
    "Dia Cobro",
    "Telefono",
    "Moratorio",
    "TIPO"
  ];

  headersRight.forEach((h, idx) => setCell(7, 32 + idx, h));

  // --- 3. FILAS DE CLIENTES Y CARTERA ---
  datos.detalles.forEach((d, i) => {
    const r = 8 + i;
    setCell(r, 0, d.codigoCliente);
    setCell(r, 1, d.codigoCliente);
    setCell(r, 2, d.numContrato || "-");
    setCell(r, 3, d.periodoInicial);
    setCell(r, 4, d.nombreCliente);
    setCell(r, 5, d.periodicidad);
    setCell(r, 6, d.pagoSugerido, 'n');
    setCell(r, 7, d.saldoVencido, 'n');
    setCell(r, 8, d.pv, 'n');
    setCell(r, 9, d.saldoActual, 'n');
    setCell(r, 10, d.gestor || datos.codigoGestor);
    setCell(r, 11, d.sup, 'n');
    setCell(r, 12, d.moratorio, 'n');
    setCell(r, 13, d.pvr, 'n');
    setCell(r, 14, d.pagoReal, 'n');
    setCell(r, 15, d.diaPago);
    setCell(r, 16, d.tipoCobro);
    setCell(r, 17, d.telefono);
    setCell(r, 18, d.telefono2);
    setCell(r, 19, 1, 'n');
    setCell(r, 20, d.pagoAnalista);
    setCell(r, 21, d.problema);
    setCell(r, 22, d.pagoDoble, 'n');
    setCell(r, 23, d.numPagosDobles, 'n');
    setCell(r, 24, d.recuperadoPv, 'n');
    setCell(r, 25, d.numPagosDobles2, 'n');
    setCell(r, 26, d.comisionAnalista, 'n');
    setCell(r, 27, d.fechaPago ? new Date(d.fechaPago).toLocaleDateString("es-MX") : "");
    setCell(r, 28, d.serie);
    setCell(r, 29, d.tipCob);
  });

  // --- 4. BLOQUE DE RESUMEN EJECUTIVO (Fila 500 en adelante) ---
  const resumenRowStart = Math.max(8 + datos.detalles.length + 10, 500);

  // Totales de la Cartera
  setCell(resumenRowStart + 1, 0, "Totales");
  setCell(resumenRowStart + 1, 6, datos.resumen?.totalSugerido ?? 0, 'n');
  setCell(resumenRowStart + 1, 7, datos.resumen?.totalVencido ?? 0, 'n');
  setCell(resumenRowStart + 1, 9, datos.resumen?.totalCartera ?? 0, 'n');
  setCell(resumenRowStart + 1, 14, datos.resumen?.totalCobrado ?? 0, 'n');
  setCell(resumenRowStart + 1, 15, "CUENTAS");
  setCell(resumenRowStart + 1, 16, datos.detalles.length, 'n');

  // Resumen de Problemas (Página 2 CEJ)
  setCell(resumenRowStart + 3, 0, "RESUMEN DE COBRANZA");
  setCell(resumenRowStart + 3, 3, `${datos.nombreGestor} RUTA SEMANA ${datos.semana}`);

  const prob = datos.resumen?.resumenProblemas;
  setCell(resumenRowStart + 4, 0, "Cuentas Asignadas");
  setCell(resumenRowStart + 4, 2, prob?.totalAsignadas.cuentas ?? datos.detalles.length, 'n');
  setCell(resumenRowStart + 4, 3, prob?.totalAsignadas.pesos ?? datos.resumen?.totalSugerido ?? 0, 'n');

  setCell(resumenRowStart + 5, 0, "Cuentas (CANCELADO K)");
  setCell(resumenRowStart + 5, 2, prob?.canceladoK.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 5, 3, prob?.canceladoK.pesos ?? 0, 'n');

  setCell(resumenRowStart + 6, 0, "Cuentas (INTERVENCION IT)");
  setCell(resumenRowStart + 6, 2, prob?.intervencionIT.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 6, 3, prob?.intervencionIT.pesos ?? 0, 'n');

  setCell(resumenRowStart + 7, 0, "Cuentas (ADELANTADO AD)");
  setCell(resumenRowStart + 7, 2, prob?.adelantadoAD.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 7, 3, prob?.adelantadoAD.pesos ?? 0, 'n');

  setCell(resumenRowStart + 8, 0, "Cuentas (PERIODO PE)");
  setCell(resumenRowStart + 8, 2, prob?.periodoPE.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 8, 3, prob?.periodoPE.pesos ?? 0, 'n');

  setCell(resumenRowStart + 9, 0, "Cuentas (PAGO SEM PS)");
  setCell(resumenRowStart + 9, 2, prob?.pagoSemPS.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 9, 3, prob?.pagoSemPS.pesos ?? 0, 'n');

  setCell(resumenRowStart + 10, 0, "Cuentas (DICT LEGAL DL)");
  setCell(resumenRowStart + 10, 2, prob?.dictLegalDL.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 10, 3, prob?.dictLegalDL.pesos ?? 0, 'n');

  setCell(resumenRowStart + 11, 0, "TOTAL PROBLEMAS");
  setCell(resumenRowStart + 11, 2, prob?.totalProblemas.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 11, 3, prob?.totalProblemas.pesos ?? 0, 'n');

  setCell(resumenRowStart + 12, 0, "Cuentas (RUTA)");
  setCell(resumenRowStart + 12, 2, prob?.cuentasRuta.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 12, 3, prob?.cuentasRuta.pesos ?? 0, 'n');

  setCell(resumenRowStart + 13, 0, "Vencidos (RUTA)");
  setCell(resumenRowStart + 13, 2, prob?.vencidosRuta.cuentas ?? 0, 'n');
  setCell(resumenRowStart + 13, 3, prob?.vencidosRuta.pesos ?? 0, 'n');

  // Matriz de Periodicidades
  setCell(resumenRowStart + 14, 4, "PERIODICIDAD");
  setCell(resumenRowStart + 14, 5, "PPTO CTAS");
  setCell(resumenRowStart + 14, 6, "PPTO PESOS");
  setCell(resumenRowStart + 14, 7, "COB CTAS");
  setCell(resumenRowStart + 14, 8, "COB PESOS");
  setCell(resumenRowStart + 14, 9, "%CTAS");
  setCell(resumenRowStart + 14, 10, "%PESOS");

  if (datos.resumen?.matrizPeriodos) {
    datos.resumen.matrizPeriodos.forEach((p, idx) => {
      const pr = resumenRowStart + 15 + idx;
      setCell(pr, 4, p.periodo);
      setCell(pr, 5, p.pptoCtas, 'n');
      setCell(pr, 6, p.pptoPesos, 'n');
      setCell(pr, 7, p.cobCtas, 'n');
      setCell(pr, 8, p.cobPesos, 'n');
      setCell(pr, 9, `${p.porcCtas}%`);
      setCell(pr, 10, `${p.porcPesos}%`);
    });
  }

  // Presupuesto Diario Semanal
  const diarioStart = resumenRowStart + 24;
  setCell(diarioStart, 4, "PPTO DIARIO SEMANAL");
  const diasHeaders = ["SABADO", "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "TOTAL"];
  diasHeaders.forEach((dh, di) => setCell(diarioStart, 5 + di, dh));

  setCell(diarioStart + 1, 4, "PPTO CUENTAS");
  setCell(diarioStart + 2, 4, "AVANCE CUENTAS");
  setCell(diarioStart + 3, 4, "PPTO DINERO");
  setCell(diarioStart + 4, 4, "AVANCE DINERO");

  let totalPptoCtas = 0;
  let totalAvCtas = 0;
  let totalPptoDin = 0;
  let totalAvDin = 0;

  if (datos.resumen?.resumenDiario) {
    datos.resumen.resumenDiario.forEach((d, di) => {
      setCell(diarioStart + 1, 5 + di, d.pptoCuentas, 'n');
      setCell(diarioStart + 2, 5 + di, d.avanceCuentas, 'n');
      setCell(diarioStart + 3, 5 + di, d.pptoDinero, 'n');
      setCell(diarioStart + 4, 5 + di, d.avanceDinero, 'n');

      totalPptoCtas += d.pptoCuentas;
      totalAvCtas += d.avanceCuentas;
      totalPptoDin += d.pptoDinero;
      totalAvDin += d.avanceDinero;
    });
    // Totales diarios
    setCell(diarioStart + 1, 5 + 7, totalPptoCtas, 'n');
    setCell(diarioStart + 2, 5 + 7, totalAvCtas, 'n');
    setCell(diarioStart + 3, 5 + 7, totalPptoDin, 'n');
    setCell(diarioStart + 4, 5 + 7, totalAvDin, 'n');
  }

  // Rango global de la hoja
  const totalRows = diarioStart + 6;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: 46 } });

  // Anchos de columna optimizados
  ws['!cols'] = [
    { wch: 14 }, // CODIGO CLIENTE
    { wch: 14 }, // CUENTA
    { wch: 14 }, // CONTRATO
    { wch: 14 }, // Periodo Inicial
    { wch: 32 }, // RAZON SOCIAL
    { wch: 16 }, // PERIODO DE PAGO
    { wch: 14 }, // PAGO SUGERIDO
    { wch: 14 }, // SALDO VENCIDO
    { wch: 8 },  // PV
    { wch: 14 }, // SALDO ACTUAL
    { wch: 12 }, // GESTOR
    { wch: 8 },  // SUP
    { wch: 10 }, // MOR
    { wch: 10 }, // PVR
    { wch: 12 }, // PAGO
    { wch: 12 }, // DIA DE PAGO
    { wch: 14 }, // TIPO DE COBRO
    { wch: 14 }, // TEL2
    { wch: 14 }, // TEL22
    { wch: 6 },  // C
    { wch: 14 }, // PAGOANALISTA
    { wch: 12 }, // PROBLEMA
    { wch: 12 }, // PAGO DOBLE
    { wch: 12 }, // NUM PAGOS DOBLES
    { wch: 14 }, // RECUPERADO PV
    { wch: 12 }, // NUM PAGOS DOBLES2
    { wch: 14 }, // COMANALISTA
    { wch: 14 }, // FECHA DE PAGO
    { wch: 10 }, // SERIE
    { wch: 10 }  // TIP COB
  ];

  XLSX.utils.book_append_sheet(wb, ws, "LISTA");
  return wb;
}

/**
 * Descarga en el navegador el archivo Excel oficial CEJ
 */
export function descargarExcelCEJ(datos: DatosExportacionCEJ) {
  const wb = generarExcelCEJ(datos);
  const gestorClean = (datos.codigoGestor || datos.nombreGestor || "GESTOR").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `PLANTILLA-LISTA-COBRANZA-${gestorClean}-Semana${datos.semana}-${datos.anio}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Genera ventana o documento PDF oficial idéntico a PLANTILLA LISTA COBRANZA
 * Abre una ventana lista para imprimir o guardar como PDF en orientación horizontal
 */
export function imprimirPDFCEJ(datos: DatosExportacionCEJ) {
  const popup = window.open("", "_blank", "width=1200,height=850");
  if (!popup) {
    alert("Por favor permite las ventanas emergentes para generar el PDF");
    return;
  }

  const p = datos.resumen?.resumenProblemas;
  const mPeriodos = datos.resumen?.matrizPeriodos || [];
  const rDiario = datos.resumen?.resumenDiario || [];

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PLANTILLA LISTA COBRANZA - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page {
      size: letter landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 8.5px;
      color: #111;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .header-box {
      margin-bottom: 8px;
      border-bottom: 2px solid #333;
      padding-bottom: 4px;
    }
    .title-company {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
    }
    .subtitle {
      font-size: 11px;
      font-weight: 600;
      color: #444;
      margin: 2px 0 6px 0;
    }
    .info-bar {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: bold;
      background: #f1f5f9;
      padding: 4px 8px;
      border: 1px solid #cbd5e1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th {
      background: #1e293b;
      color: #fff;
      font-size: 7.5px;
      font-weight: bold;
      text-align: center;
      padding: 3px 2px;
      border: 0.5px solid #475569;
      white-space: nowrap;
    }
    td {
      font-size: 7.5px;
      padding: 2.5px 2px;
      border: 0.5px solid #cbd5e1;
      white-space: nowrap;
    }
    tr:nth-child(even) td {
      background-color: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }

    /* Estilos Página 2: Resumen Ejecutivo */
    .p2-container {
      padding: 6px 0;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1.3fr;
      gap: 16px;
      margin-top: 8px;
    }
    .section-card {
      border: 1px solid #94a3b8;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .card-header {
      background: #334155;
      color: #fff;
      font-weight: bold;
      padding: 4px 8px;
      font-size: 9px;
      text-transform: uppercase;
    }
    .card-body {
      padding: 6px 8px;
    }
    .kpi-row {
      display: flex;
      justify-content: space-between;
      padding: 2.5px 0;
      border-bottom: 0.5px dashed #cbd5e1;
      font-size: 8.5px;
    }
    .kpi-row.highlight {
      background: #e2e8f0;
      font-weight: bold;
      padding: 3px 4px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- BOTONES NO IMPRIMIBLES -->
  <div class="no-print" style="padding: 10px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center;">
    <div><strong>Vista Previa PDF Oficial (Plantilla Lista Cobranza - 2 Páginas)</strong></div>
    <div>
      <button onclick="window.print()" style="background: #10b981; color: white; border: none; padding: 6px 14px; font-weight: bold; cursor: pointer; border-radius: 4px;">
        🖨️ Imprimir / Guardar como PDF
      </button>
      <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 6px 12px; font-weight: bold; cursor: pointer; border-radius: 4px; margin-left: 8px;">
        Cerrar
      </button>
    </div>
  </div>

  <!-- PÁGINA 1: LISTADO DE CARTERA Y RUTA -->
  <div class="page-break" style="padding: 8px;">
    <div class="header-box">
      <div class="title-company">Grupo Mueblero DASO SA de CV</div>
      <div class="subtitle">Relación de Cobranza Querétaro</div>
      <div class="info-bar">
        <div>SEMANA: <strong>${datos.semana}</strong> (${datos.fechaInicioStr} al ${datos.fechaFinStr})</div>
        <div>GESTOR: <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
        <div>EMISIÓN: <strong>${new Date().toLocaleDateString("es-MX")}</strong></div>
        <div>TOTAL CUENTAS: <strong>${datos.detalles.length}</strong></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>CODIGO</th>
          <th>CONTRATO</th>
          <th>INICIAL</th>
          <th style="text-align: left; padding-left: 4px;">CLIENTE</th>
          <th>PERIODO</th>
          <th>SUGERIDO</th>
          <th>VENCIDO</th>
          <th>PV</th>
          <th>SALDO ACT</th>
          <th>GESTOR</th>
          <th>SUP</th>
          <th>PAGO</th>
          <th>DIA</th>
          <th>PROBLEMA</th>
          <th>P. DOBLE</th>
          <th>RECU PV</th>
          <th>COMISIÓN</th>
          <th>TELÉFONO</th>
        </tr>
      </thead>
      <tbody>
        ${datos.detalles
          .slice(0, 48)
          .map(
            (d) => `
          <tr>
            <td class="text-center font-mono font-bold">${d.codigoCliente}</td>
            <td class="text-center font-mono">${d.numContrato}</td>
            <td class="text-center">${d.periodoInicial}</td>
            <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${d.nombreCliente}</td>
            <td class="text-center font-bold">${d.periodicidad}</td>
            <td class="text-right font-mono font-bold">$${d.pagoSugerido.toLocaleString("es-MX")}</td>
            <td class="text-right font-mono text-danger">$${d.saldoVencido.toLocaleString("es-MX")}</td>
            <td class="text-center font-bold">${d.pv}</td>
            <td class="text-right font-mono">$${d.saldoActual.toLocaleString("es-MX")}</td>
            <td class="text-center">${d.gestor}</td>
            <td class="text-center">${d.sup}</td>
            <td class="text-right font-mono font-bold" style="${d.pagoReal > 0 ? 'color: #047857;' : ''}">$${d.pagoReal.toLocaleString("es-MX")}</td>
            <td class="text-center">${d.diaPago}</td>
            <td class="text-center font-bold" style="color: ${d.problema === 'RUTA' ? '#1d4ed8' : '#b91c1c'};">${d.problema}</td>
            <td class="text-right font-mono">$${d.pagoDoble.toLocaleString("es-MX")}</td>
            <td class="text-right font-mono">$${d.recuperadoPv.toLocaleString("es-MX")}</td>
            <td class="text-right font-mono">$${d.comisionAnalista.toLocaleString("es-MX")}</td>
            <td class="text-center font-mono">${d.telefono}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    <div style="margin-top: 6px; font-size: 8px; color: #64748b; text-align: right;">
      Página 1 de 2 • Plantilla Lista Cobranza • Grupo Mueblero DASO
    </div>
  </div>

  <!-- PÁGINA 2: RESUMEN EJECUTIVO Y METAS DE COBRO -->
  <div style="padding: 8px;">
    <div class="header-box">
      <div class="title-company">Grupo Mueblero DASO SA de CV</div>
      <div class="subtitle">Resumen Ejecutivo de Corte de Cobranza Querétaro</div>
      <div class="info-bar">
        <div>SEMANA: <strong>${datos.semana}</strong></div>
        <div>GESTOR: <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
        <div>FECHA CORTE: <strong>${new Date().toLocaleDateString("es-MX")}</strong></div>
        <div>ESTATUS: <strong>${datos.resumen?.pagarConPorcentajeSinDobles ? 'PAGAR CON % SIN DOBLES' : 'OBJETIVO CUMPLIDO'}</strong></div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Columna Izquierda: Clasificación de Problemas -->
      <div>
        <div class="section-card">
          <div class="card-header">Clasificación de Cartera y Problemas</div>
          <div class="card-body">
            <div class="kpi-row highlight">
              <span>Cuentas Asignadas</span>
              <span><strong>${p?.totalAsignadas.cuentas ?? 0}</strong> ($${(p?.totalAsignadas.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div class="kpi-row"><span>CANCELADO (K)</span><span>${p?.canceladoK.cuentas ?? 0} ($${(p?.canceladoK.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>INTERVENCION (IT)</span><span>${p?.intervencionIT.cuentas ?? 0} ($${(p?.intervencionIT.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>ADELANTADO (AD)</span><span>${p?.adelantadoAD.cuentas ?? 0} ($${(p?.adelantadoAD.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>PERIODO (PE)</span><span>${p?.periodoPE.cuentas ?? 0} ($${(p?.periodoPE.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>PAGO SEM (PS)</span><span>${p?.pagoSemPS.cuentas ?? 0} ($${(p?.pagoSemPS.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>DICT LEGAL (DL)</span><span>${p?.dictLegalDL.cuentas ?? 0} ($${(p?.dictLegalDL.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row highlight" style="background: #fecdd3;">
              <span>TOTAL PROBLEMAS</span>
              <span><strong>${p?.totalProblemas.cuentas ?? 0}</strong> ($${(p?.totalProblemas.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div class="kpi-row highlight" style="background: #dbeafe; margin-top: 6px;">
              <span>Cuentas en RUTA</span>
              <span><strong>${p?.cuentasRuta.cuentas ?? 0}</strong> ($${(p?.cuentasRuta.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div class="kpi-row">
              <span>Vencidos en RUTA</span>
              <span><strong>${p?.vencidosRuta.cuentas ?? 0}</strong> ($${(p?.vencidosRuta.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
          </div>
        </div>

        <div class="section-card">
          <div class="card-header">Canales de Recaudación Real</div>
          <div class="card-body">
            <div class="kpi-row"><span>EFECTIVO (Cobranza Gestor)</span><span><strong>${datos.resumen?.cobranzaEfectivo.cuentas ?? 0} ctas</strong> • $${(datos.resumen?.cobranzaEfectivo.pesos ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>BANCOS (Transferencia / Depósito)</span><span><strong>${datos.resumen?.cobranzaBancos.cuentas ?? 0} ctas</strong> • $${(datos.resumen?.cobranzaBancos.pesos ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row highlight" style="background: #dcfce7;">
              <span>TOTAL COBRANZA RECIBIDA</span>
              <span><strong>$${(datos.resumen?.totalCobrado ?? 0).toLocaleString("es-MX")}</strong></span>
            </div>
            <div class="kpi-row"><span>Pagos Dobles Registrados</span><span>$${(datos.resumen?.totalPagosDobles ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>Recuperado Periodos Vencidos</span><span>$${(datos.resumen?.totalRecuperadoPv ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>% Cuentas sin Dobles</span><span><strong>${datos.resumen?.porcentajeCtasSinDobles ?? 0}%</strong></span></div>
            <div class="kpi-row"><span>% Cuentas con Dobles</span><span><strong>${datos.resumen?.porcentajeCtasConDobles ?? 0}%</strong></span></div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha: Matriz Periodicidades y Presupuesto Diario -->
      <div>
        <div class="section-card">
          <div class="card-header">Presupuesto vs Cobranza por Periodicidad</div>
          <table>
            <thead>
              <tr>
                <th>PERIODICIDAD</th>
                <th>PPTO CTAS</th>
                <th>PPTO $</th>
                <th>COB CTAS</th>
                <th>COB $</th>
                <th>% CTAS</th>
                <th>% $</th>
              </tr>
            </thead>
            <tbody>
              ${mPeriodos
                .map(
                  (m) => `
                <tr>
                  <td class="font-bold text-center">${m.periodo}</td>
                  <td class="text-center">${m.pptoCtas}</td>
                  <td class="text-right font-mono">$${m.pptoPesos.toLocaleString("es-MX")}</td>
                  <td class="text-center font-bold">${m.cobCtas}</td>
                  <td class="text-right font-mono font-bold">$${m.cobPesos.toLocaleString("es-MX")}</td>
                  <td class="text-center">${m.porcCtas}%</td>
                  <td class="text-center">${m.porcPesos}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section-card" style="margin-top: 10px;">
          <div class="card-header">Presupuesto y Avance Diario Semanal (RUTA)</div>
          <table>
            <thead>
              <tr>
                <th>DÍA</th>
                <th>PPTO CTAS</th>
                <th>AVANCE CTAS</th>
                <th>PPTO DINERO</th>
                <th>AVANCE DINERO</th>
              </tr>
            </thead>
            <tbody>
              ${rDiario
                .map(
                  (d) => `
                <tr>
                  <td class="font-bold text-center">${d.dia}</td>
                  <td class="text-center">${d.pptoCuentas}</td>
                  <td class="text-center font-bold" style="color: #047857;">${d.avanceCuentas}</td>
                  <td class="text-right font-mono">$${d.pptoDinero.toLocaleString("es-MX")}</td>
                  <td class="text-right font-mono font-bold" style="color: #047857;">$${d.avanceDinero.toLocaleString("es-MX")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div style="margin-top: 12px; font-size: 8px; color: #64748b; text-align: right;">
      Página 2 de 2 • Plantilla Lista Cobranza • Grupo Mueblero DASO
    </div>
  </div>
</body>
</html>
  `;

  popup.document.write(html);
  popup.document.close();
}
