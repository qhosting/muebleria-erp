import * as XLSX from "xlsx";
import { DetalleCalculadoCEJ, ResumenCorteCEJ, separarYCalcularResumenesCEJ } from "./corte-cej-utils";

export interface DatosExportacionCEJ {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  detalles: DetalleCalculadoCEJ[];
  resumen?: ResumenCorteCEJ;
  resumenDQ?: ResumenCorteCEJ;
  resumenDP?: ResumenCorteCEJ;
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

  // --- 4. BLOQUE COMPARATIVO Y RESUMEN EJECUTIVO (Fila 500 en adelante) ---
  const resCalculados = separarYCalcularResumenesCEJ(datos.detalles);
  const resGlobal = datos.resumen || resCalculados.global;
  const resDQ = datos.resumenDQ || resCalculados.dq;
  const resDP = datos.resumenDP || resCalculados.dp;

  const resumenRowStart = Math.max(8 + datos.detalles.length + 5, 500);

  // Tabla Comparativa Ejecutiva: GLOBAL vs DQ vs DP
  setCell(resumenRowStart, 0, "RESUMEN COMPARATIVO DE CORTE");
  setCell(resumenRowStart, 1, "GLOBAL (TOTAL)");
  setCell(resumenRowStart, 2, "DQ (QUERETARO)");
  setCell(resumenRowStart, 3, "DP (POLANCO)");

  const rowsComp = [
    { concepto: "Cuentas Asignadas", g: resGlobal.totalCuentas, dq: resDQ.totalCuentas, dp: resDP.totalCuentas, num: true },
    { concepto: "Pago Sugerido (Ppto $)", g: resGlobal.totalSugerido, dq: resDQ.totalSugerido, dp: resDP.totalSugerido, num: true },
    { concepto: "Cobranza Real Recibida ($)", g: resGlobal.totalCobrado, dq: resDQ.totalCobrado, dp: resDP.totalCobrado, num: true },
    { concepto: "% Cumplimiento (Sin Dobles)", g: `${resGlobal.porcentajeCtasSinDobles}%`, dq: `${resDQ.porcentajeCtasSinDobles}%`, dp: `${resDP.porcentajeCtasSinDobles}%`, num: false },
    { concepto: "% Cumplimiento (Con Dobles)", g: `${resGlobal.porcentajeCtasConDobles}%`, dq: `${resDQ.porcentajeCtasConDobles}%`, dp: `${resDP.porcentajeCtasConDobles}%`, num: false },
    { concepto: "Cobro en Efectivo ($)", g: resGlobal.cobranzaEfectivo.pesos, dq: resDQ.cobranzaEfectivo.pesos, dp: resDP.cobranzaEfectivo.pesos, num: true },
    { concepto: "Cobro en Bancos ($)", g: resGlobal.cobranzaBancos.pesos, dq: resDQ.cobranzaBancos.pesos, dp: resDP.cobranzaBancos.pesos, num: true },
    { concepto: "Saldo Vencido ($)", g: resGlobal.totalVencido, dq: resDQ.totalVencido, dp: resDP.totalVencido, num: true },
    { concepto: "Cartera Total ($)", g: resGlobal.totalCartera, dq: resDQ.totalCartera, dp: resDP.totalCartera, num: true },
    { concepto: "Cuentas en RUTA", g: resGlobal.resumenProblemas.cuentasRuta.cuentas, dq: resDQ.resumenProblemas.cuentasRuta.cuentas, dp: resDP.resumenProblemas.cuentasRuta.cuentas, num: true },
    { concepto: "Vencidos en RUTA ($)", g: resGlobal.resumenProblemas.vencidosRuta.pesos, dq: resDQ.resumenProblemas.vencidosRuta.pesos, dp: resDP.resumenProblemas.vencidosRuta.pesos, num: true },
    { concepto: "Total Cuentas Problema", g: resGlobal.resumenProblemas.totalProblemas.cuentas, dq: resDQ.resumenProblemas.totalProblemas.cuentas, dp: resDP.resumenProblemas.totalProblemas.cuentas, num: true }
  ];

  rowsComp.forEach((item, rIdx) => {
    const curRow = resumenRowStart + 1 + rIdx;
    setCell(curRow, 0, item.concepto);
    setCell(curRow, 1, item.g, item.num ? 'n' : 's');
    setCell(curRow, 2, item.dq, item.num ? 'n' : 's');
    setCell(curRow, 3, item.dp, item.num ? 'n' : 's');
  });

  const detalleStart = resumenRowStart + rowsComp.length + 3;

  // Totales de la Cartera
  setCell(detalleStart + 1, 0, "Totales Cartera");
  setCell(detalleStart + 1, 6, resGlobal.totalSugerido ?? 0, 'n');
  setCell(detalleStart + 1, 7, resGlobal.totalVencido ?? 0, 'n');
  setCell(detalleStart + 1, 9, resGlobal.totalCartera ?? 0, 'n');
  setCell(detalleStart + 1, 14, resGlobal.totalCobrado ?? 0, 'n');
  setCell(detalleStart + 1, 15, "CUENTAS");
  setCell(detalleStart + 1, 16, datos.detalles.length, 'n');

  // Resumen de Problemas (Página 2 CEJ)
  setCell(detalleStart + 3, 0, "RESUMEN DE COBRANZA");
  setCell(detalleStart + 3, 3, `${datos.nombreGestor} RUTA SEMANA ${datos.semana}`);

  const prob = resGlobal.resumenProblemas;
  setCell(detalleStart + 4, 0, "Cuentas Asignadas");
  setCell(detalleStart + 4, 2, prob?.totalAsignadas.cuentas ?? datos.detalles.length, 'n');
  setCell(detalleStart + 4, 3, prob?.totalAsignadas.pesos ?? resGlobal.totalSugerido ?? 0, 'n');

  setCell(detalleStart + 5, 0, "Cuentas (CANCELADO K)");
  setCell(detalleStart + 5, 2, prob?.canceladoK.cuentas ?? 0, 'n');
  setCell(detalleStart + 5, 3, prob?.canceladoK.pesos ?? 0, 'n');

  setCell(detalleStart + 6, 0, "Cuentas (INTERVENCION IT)");
  setCell(detalleStart + 6, 2, prob?.intervencionIT.cuentas ?? 0, 'n');
  setCell(detalleStart + 6, 3, prob?.intervencionIT.pesos ?? 0, 'n');

  setCell(detalleStart + 7, 0, "Cuentas (ADELANTADO AD)");
  setCell(detalleStart + 7, 2, prob?.adelantadoAD.cuentas ?? 0, 'n');
  setCell(detalleStart + 7, 3, prob?.adelantadoAD.pesos ?? 0, 'n');

  setCell(detalleStart + 8, 0, "Cuentas (PERIODO PE)");
  setCell(detalleStart + 8, 2, prob?.periodoPE.cuentas ?? 0, 'n');
  setCell(detalleStart + 8, 3, prob?.periodoPE.pesos ?? 0, 'n');

  setCell(detalleStart + 9, 0, "Cuentas (PAGO SEM PS)");
  setCell(detalleStart + 9, 2, prob?.pagoSemPS.cuentas ?? 0, 'n');
  setCell(detalleStart + 9, 3, prob?.pagoSemPS.pesos ?? 0, 'n');

  setCell(detalleStart + 10, 0, "Cuentas (DICT LEGAL DL)");
  setCell(detalleStart + 10, 2, prob?.dictLegalDL.cuentas ?? 0, 'n');
  setCell(detalleStart + 10, 3, prob?.dictLegalDL.pesos ?? 0, 'n');

  setCell(detalleStart + 11, 0, "TOTAL PROBLEMAS");
  setCell(detalleStart + 11, 2, prob?.totalProblemas.cuentas ?? 0, 'n');
  setCell(detalleStart + 11, 3, prob?.totalProblemas.pesos ?? 0, 'n');

  setCell(detalleStart + 12, 0, "Cuentas (RUTA)");
  setCell(detalleStart + 12, 2, prob?.cuentasRuta.cuentas ?? 0, 'n');
  setCell(detalleStart + 12, 3, prob?.cuentasRuta.pesos ?? 0, 'n');

  setCell(detalleStart + 13, 0, "Vencidos (RUTA)");
  setCell(detalleStart + 13, 2, prob?.vencidosRuta.cuentas ?? 0, 'n');
  setCell(detalleStart + 13, 3, prob?.vencidosRuta.pesos ?? 0, 'n');

  // Matriz de Periodicidades
  setCell(detalleStart + 14, 4, "PERIODICIDAD");
  setCell(detalleStart + 14, 5, "PPTO CTAS");
  setCell(detalleStart + 14, 6, "PPTO PESOS");
  setCell(detalleStart + 14, 7, "COB CTAS");
  setCell(detalleStart + 14, 8, "COB PESOS");
  setCell(detalleStart + 14, 9, "%CTAS");
  setCell(detalleStart + 14, 10, "%PESOS");

  if (resGlobal.matrizPeriodos) {
    resGlobal.matrizPeriodos.forEach((p, idx) => {
      const pr = detalleStart + 15 + idx;
      setCell(pr, 4, p.periodo);
      setCell(pr, 5, p.pptoCtas, 'n');
      setCell(pr, 6, p.pptoPesos, 'n');
      setCell(pr, 7, p.cobCtas, 'n');
      setCell(pr, 8, p.cobPesos, 'n');
      setCell(pr, 9, `${p.porcCtas}%`);
      setCell(pr, 10, `${p.porcPesos}%`);
    });
    const totRow = detalleStart + 15 + resGlobal.matrizPeriodos.length;
    const totPptoCtas = resGlobal.matrizPeriodos.reduce((a, b) => a + b.pptoCtas, 0);
    const totPptoPesos = resGlobal.matrizPeriodos.reduce((a, b) => a + b.pptoPesos, 0);
    const totCobCtas = resGlobal.matrizPeriodos.reduce((a, b) => a + b.cobCtas, 0);
    const totCobPesos = resGlobal.matrizPeriodos.reduce((a, b) => a + b.cobPesos, 0);
    const totPorcCtas = totPptoCtas > 0 ? Math.round((totCobCtas / totPptoCtas) * 1000) / 10 : 0;
    const totPorcPesos = totPptoPesos > 0 ? Math.round((totCobPesos / totPptoPesos) * 1000) / 10 : 0;
    setCell(totRow, 4, "TOTAL");
    setCell(totRow, 5, totPptoCtas, 'n');
    setCell(totRow, 6, totPptoPesos, 'n');
    setCell(totRow, 7, totCobCtas, 'n');
    setCell(totRow, 8, totCobPesos, 'n');
    setCell(totRow, 9, `${totPorcCtas}%`);
    setCell(totRow, 10, `${totPorcPesos}%`);
  }

  // Presupuesto Diario Semanal
  const diarioStart = detalleStart + 24;
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
 * Genera el HTML completo oficial idéntico a PLANTILLA LISTA COBRANZA
 * Pagina toda la cartera en bloques de ~38 clientes para que no se recorte ningún registro,
 * y finaliza con la página de Resumen Ejecutivo y Metas de Cobro.
 */
export function generarHTMLPlantillaCEJ(datos: DatosExportacionCEJ): string {
  const resCalculados = separarYCalcularResumenesCEJ(datos.detalles);
  const resGlobal = datos.resumen || resCalculados.global;
  const resDQ = datos.resumenDQ || resCalculados.dq;
  const resDP = datos.resumenDP || resCalculados.dp;

  const p = resGlobal.resumenProblemas;
  const mPeriodos = resGlobal.matrizPeriodos || [];
  const rDiario = resGlobal.resumenDiario || [];

  const FILAS_POR_PAGINA = 38;
  const detalles = datos.detalles || [];
  const chunks: DetalleCalculadoCEJ[][] = [];

  if (detalles.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < detalles.length; i += FILAS_POR_PAGINA) {
      chunks.push(detalles.slice(i, i + FILAS_POR_PAGINA));
    }
  }

  const totalPaginas = chunks.length + 1;

  const paginasDetallesHTML = chunks
    .map((chunk, idx) => {
      const paginaActual = idx + 1;
      const desdeItem = idx * FILAS_POR_PAGINA + 1;
      const hastaItem = Math.min((idx + 1) * FILAS_POR_PAGINA, detalles.length);

      return `
  <!-- PÁGINA ${paginaActual}: LISTADO DE CARTERA Y RUTA -->
  <div class="page-break" style="padding: 8px;">
    <div class="header-box">
      <div class="title-company">Grupo Mueblero DASO SA de CV</div>
      <div class="subtitle">Relación de Cobranza Querétaro</div>
      <div class="info-bar">
        <div>SEMANA: <strong>${datos.semana}</strong> (${datos.fechaInicioStr} al ${datos.fechaFinStr})</div>
        <div>GESTOR: <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
        <div>EMISIÓN: <strong>${new Date().toLocaleDateString("es-MX")}</strong></div>
        <div>TOTAL CUENTAS: <strong>${detalles.length}</strong> (Cuentas ${detalles.length > 0 ? `${desdeItem} - ${hastaItem}` : 0})</div>
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
        ${chunk
          .map(
            (d) => `
          <tr>
            <td class="text-center font-mono font-bold">${d.codigoCliente}</td>
            <td class="text-center font-mono">${d.numContrato}</td>
            <td class="text-center">${d.periodoInicial}</td>
            <td style="max-width: 140px; overflow: hidden; text-overflow: ellipsis;">${d.nombreCliente}</td>
            <td class="text-center font-bold">${d.periodicidad}</td>
            <td class="text-right font-mono font-bold">$${(d.pagoSugerido || 0).toLocaleString("es-MX")}</td>
            <td class="text-right font-mono text-danger">$${(d.saldoVencido || 0).toLocaleString("es-MX")}</td>
            <td class="text-center font-bold">${d.pv}</td>
            <td class="text-right font-mono">$${(d.saldoActual || 0).toLocaleString("es-MX")}</td>
            <td class="text-center">${d.gestor}</td>
            <td class="text-center">${d.sup}</td>
            <td class="text-right font-mono font-bold" style="${d.pagoReal > 0 ? 'color: #047857;' : ''}">$${(d.pagoReal || 0).toLocaleString("es-MX")}</td>
            <td class="text-center">${d.diaPago}</td>
            <td class="text-center font-bold" style="color: ${d.problema === 'RUTA' ? '#1d4ed8' : '#b91c1c'};">${d.problema}</td>
            <td class="text-right font-mono">$${(d.pagoDoble || 0).toLocaleString("es-MX")}</td>
            <td class="text-right font-mono">$${(d.recuperadoPv || 0).toLocaleString("es-MX")}</td>
            <td class="text-right font-mono">$${(d.comisionAnalista || 0).toLocaleString("es-MX")}</td>
            <td class="text-center font-mono">${d.telefono}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    <div style="margin-top: 6px; font-size: 8px; color: #64748b; text-align: right;">
      Página ${paginaActual} de ${totalPaginas} • Plantilla Lista Cobranza • Grupo Mueblero DASO
    </div>
  </div>
      `;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PLANTILLA LISTA COBRANZA - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page { size: letter landscape; margin: 8mm; }
    body { font-family: Arial, sans-serif; font-size: 8.5px; color: #111; margin: 0; padding: 0; background: #fff; }
    .page-break { page-break-after: always; break-after: page; }
    .header-box { margin-bottom: 8px; border-bottom: 2px solid #333; padding-bottom: 4px; }
    .title-company { font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0; }
    .subtitle { font-size: 11px; font-weight: 600; color: #444; margin: 2px 0 6px 0; }
    .info-bar { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; background: #f1f5f9; padding: 4px 8px; border: 1px solid #cbd5e1; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { background: #1e293b; color: #fff; font-size: 7.5px; padding: 3px 2px; border: 0.5px solid #475569; }
    td { font-size: 7.5px; padding: 2.5px 2px; border: 0.5px solid #cbd5e1; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .section-card { border: 1px solid #94a3b8; border-radius: 4px; margin-bottom: 12px; }
    .card-header { background: #334155; color: white; font-weight: bold; font-size: 9.5px; padding: 4px 8px; }
    .card-body { padding: 6px 8px; }
    .kpi-row { display: flex; justify-content: space-between; padding: 2.5px 0; border-bottom: 0.5px dashed #cbd5e1; font-size: 8.5px; }
    .kpi-row.highlight { background: #e2e8f0; font-weight: bold; padding: 3px 4px; }
    @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 10px; background: #0f172a; color: white; display: flex; justify-content: space-between;">
    <div><strong>Vista Previa PDF Oficial (${totalPaginas} Páginas)</strong></div>
    <div>
      <button onclick="window.print()">🖨️ Imprimir</button>
      <button onclick="window.close()">Cerrar</button>
    </div>
  </div>

  ${paginasDetallesHTML}

  <div style="padding: 8px;">
    <div class="header-box">
      <div class="title-company">Grupo Mueblero DASO SA de CV</div>
      <div class="subtitle">Resumen Ejecutivo de Corte de Cobranza Querétaro</div>
      <div class="info-bar">
        <div>SEMANA: <strong>${datos.semana}</strong></div>
        <div>GESTOR: <strong>${datos.codigoGestor}</strong></div>
        <div>FECHA: <strong>${new Date().toLocaleDateString("es-MX")}</strong></div>
      </div>
    </div>

    <!-- TABLA COMPARATIVA EJECUTIVA: GLOBAL vs DQ vs DP -->
    <div class="section-card" style="margin-bottom: 12px;">
      <div class="card-header" style="background: #0f172a; display: flex; justify-content: space-between;">
        <span>RESUMEN COMPARATIVO DE CORTE (GLOBAL vs DQ vs DP)</span>
        <span>Semana ${datos.semana} (${datos.anio})</span>
      </div>
      <div class="card-body" style="padding: 4px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 8px;">
          <thead>
            <tr style="background: #1e293b; color: white;">
              <th style="padding: 4px 6px; text-align: left;">INDICADOR CLAVE</th>
              <th style="padding: 4px 6px; text-align: right; background: #334155;">GLOBAL (TOTAL)</th>
              <th style="padding: 4px 6px; text-align: right; background: #1e3a8a;">DQ (QUERÉTARO)</th>
              <th style="padding: 4px 6px; text-align: right; background: #312e81;">DP (POLANCO)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cuentas Asignadas</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resGlobal.totalCuentas} ($${resGlobal.totalSugerido.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #1e3a8a;">${resDQ.totalCuentas} ($${resDQ.totalSugerido.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #312e81;">${resDP.totalCuentas} ($${resDP.totalSugerido.toLocaleString("es-MX")})</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td class="font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cobranza Real Recibida</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #166534;">$${resGlobal.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #166534;">$${resDQ.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #166534;">$${resDP.totalCobrado.toLocaleString("es-MX")}</td>
            </tr>
            <tr>
              <td class="font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">% Cumplimiento (Sin Dobles)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resGlobal.porcentajeCtasSinDobles}%</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #1e3a8a;">${resDQ.porcentajeCtasSinDobles}%</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #312e81;">${resDP.porcentajeCtasSinDobles}%</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cobranza Efectivo</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resGlobal.cobranzaEfectivo.cuentas} ctas ($${resGlobal.cobranzaEfectivo.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resDQ.cobranzaEfectivo.cuentas} ctas ($${resDQ.cobranzaEfectivo.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resDP.cobranzaEfectivo.cuentas} ctas ($${resDP.cobranzaEfectivo.pesos.toLocaleString("es-MX")})</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cobranza Bancos / Depósitos</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resGlobal.cobranzaBancos.cuentas} ctas ($${resGlobal.cobranzaBancos.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resDQ.cobranzaBancos.cuentas} ctas ($${resDQ.cobranzaBancos.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resDP.cobranzaBancos.cuentas} ctas ($${resDP.cobranzaBancos.pesos.toLocaleString("es-MX")})</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Saldo Vencido</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #b91c1c;">$${resGlobal.totalVencido.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #b91c1c;">$${resDQ.totalVencido.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #b91c1c;">$${resDP.totalVencido.toLocaleString("es-MX")}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cartera Total</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">$${resGlobal.totalCartera.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">$${resDQ.totalCartera.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">$${resDP.totalCartera.toLocaleString("es-MX")}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">Cuentas en RUTA</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1;">${resGlobal.resumenProblemas.cuentasRuta.cuentas} ctas ($${resGlobal.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #1e3a8a;">${resDQ.resumenProblemas.cuentasRuta.cuentas} ctas ($${resDQ.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; border-bottom: 0.5px dashed #cbd5e1; color: #312e81;">${resDP.resumenProblemas.cuentasRuta.cuentas} ctas ($${resDP.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px;">Total Cuentas Problema (K, IT, PE...)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resGlobal.resumenProblemas.totalProblemas.cuentas} ctas ($${resGlobal.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resDQ.resumenProblemas.totalProblemas.cuentas} ctas ($${resDQ.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resDP.resumenProblemas.totalProblemas.cuentas} ctas ($${resDP.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <div class="section-card">
          <div class="card-header">Clasificación de Cartera</div>
          <div class="card-body">
            <div class="kpi-row highlight"><span>Cuentas Asignadas</span><span><strong>${p?.totalAsignadas.cuentas ?? 0}</strong> ($${(p?.totalAsignadas.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>CANCELADO (K)</span><span>${p?.canceladoK.cuentas ?? 0} ($${(p?.canceladoK.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>INTERVENCION (IT)</span><span>${p?.intervencionIT.cuentas ?? 0} ($${(p?.intervencionIT.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>ADELANTADO (AD)</span><span>${p?.adelantadoAD.cuentas ?? 0} ($${(p?.adelantadoAD.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>PERIODO (PE)</span><span>${p?.periodoPE.cuentas ?? 0} ($${(p?.periodoPE.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>PAGO SEM (PS)</span><span>${p?.pagoSemPS.cuentas ?? 0} ($${(p?.pagoSemPS.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row"><span>DICT LEGAL (DL)</span><span>${p?.dictLegalDL.cuentas ?? 0} ($${(p?.dictLegalDL.pesos ?? 0).toLocaleString("es-MX")})</span></div>
            <div class="kpi-row highlight" style="margin-top: 4px;">
              <span>Total Cuentas Problema</span>
              <span><strong>${p?.totalProblemas.cuentas ?? 0}</strong> ($${(p?.totalProblemas.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div class="kpi-row" style="margin-top: 6px; font-weight: bold; color: #1d4ed8;">
              <span>Cuentas en RUTA</span>
              <span>${p?.cuentasRuta.cuentas ?? 0} ($${(p?.cuentasRuta.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div class="kpi-row" style="font-weight: bold; color: #b91c1c;">
              <span>Vencidos en RUTA</span>
              <span>${p?.vencidosRuta.cuentas ?? 0} ($${(p?.vencidosRuta.pesos ?? 0).toLocaleString("es-MX")})</span>
            </div>
          </div>
        </div>
        <div class="section-card">
          <div class="card-header">Canales de Recaudación Real</div>
          <div class="card-body">
            <div class="kpi-row"><span>EFECTIVO (Cobranza Gestor)</span><span><strong>${resGlobal.cobranzaEfectivo.cuentas ?? 0} ctas</strong> • $${(resGlobal.cobranzaEfectivo.pesos ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>BANCOS (Transferencia / Depósito)</span><span><strong>${resGlobal.cobranzaBancos.cuentas ?? 0} ctas</strong> • $${(resGlobal.cobranzaBancos.pesos ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row highlight" style="background: #dcfce7;">
              <span>TOTAL COBRANZA RECIBIDA</span>
              <span><strong>$${(resGlobal.totalCobrado ?? 0).toLocaleString("es-MX")}</strong></span>
            </div>
            <div class="kpi-row"><span>Pagos Dobles Registrados</span><span>$${(resGlobal.totalPagosDobles ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>Recuperado Periodos Vencidos</span><span>$${(resGlobal.totalRecuperadoPv ?? 0).toLocaleString("es-MX")}</span></div>
            <div class="kpi-row"><span>% Cuentas sin Dobles</span><span><strong>${resGlobal.porcentajeCtasSinDobles ?? 0}%</strong></span></div>
            <div class="kpi-row"><span>% Cuentas con Dobles</span><span><strong>${resGlobal.porcentajeCtasConDobles ?? 0}%</strong></span></div>
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
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #000;">
                <td class="font-bold text-center">TOTALES</td>
                <td class="text-center">${mPeriodos.reduce((a, b) => a + b.pptoCtas, 0)}</td>
                <td class="text-right font-mono">$${mPeriodos.reduce((a, b) => a + b.pptoPesos, 0).toLocaleString("es-MX")}</td>
                <td class="text-center font-bold" style="color: #047857;">${mPeriodos.reduce((a, b) => a + b.cobCtas, 0)}</td>
                <td class="text-right font-mono font-bold" style="color: #047857;">$${mPeriodos.reduce((a, b) => a + b.cobPesos, 0).toLocaleString("es-MX")}</td>
                <td class="text-center">${mPeriodos.reduce((a, b) => a + b.pptoCtas, 0) > 0 ? Math.round((mPeriodos.reduce((a, b) => a + b.cobCtas, 0) / mPeriodos.reduce((a, b) => a + b.pptoCtas, 0)) * 1000) / 10 : 0}%</td>
                <td class="text-center">${mPeriodos.reduce((a, b) => a + b.pptoPesos, 0) > 0 ? Math.round((mPeriodos.reduce((a, b) => a + b.cobPesos, 0) / mPeriodos.reduce((a, b) => a + b.pptoPesos, 0)) * 1000) / 10 : 0}%</td>
              </tr>
            </tfoot>
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
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #000;">
                <td class="font-bold text-center">TOTALES</td>
                <td class="text-center">${rDiario.reduce((a, b) => a + b.pptoCuentas, 0)}</td>
                <td class="text-center font-bold" style="color: #047857;">${rDiario.reduce((a, b) => a + b.avanceCuentas, 0)}</td>
                <td class="text-right font-mono">$${rDiario.reduce((a, b) => a + b.pptoDinero, 0).toLocaleString("es-MX")}</td>
                <td class="text-right font-mono font-bold" style="color: #047857;">$${rDiario.reduce((a, b) => a + b.avanceDinero, 0).toLocaleString("es-MX")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <div style="margin-top: 12px; font-size: 8px; color: #64748b; text-align: right;">
      Página ${totalPaginas} de ${totalPaginas} • Plantilla Lista Cobranza • Grupo Mueblero DASO
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Genera ventana o documento PDF oficial idéntico a PLANTILLA LISTA COBRANZA
 * Retorna el HTML generado y la URL Blob, intentando abrirla en nueva pestaña de forma segura sin popups bloqueados.
 */
export function imprimirPDFCEJ(datos: DatosExportacionCEJ): { html: string; blobUrl: string } {
  const html = generarHTMLPlantillaCEJ(datos);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const popup = window.open(blobUrl, "_blank");
    if (!popup) {
      console.warn("Ventana emergente no abierta por el navegador. Usando visor modal.");
    }
  } catch (err) {
    console.warn("Error al intentar abrir ventana emergente con Blob URL:", err);
  }

  return { html, blobUrl };
}
