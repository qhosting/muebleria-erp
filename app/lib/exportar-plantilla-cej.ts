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
    "TIP COB",
    "MONTO ADELANTADO",
    "SEMANAS ADELANTADAS"
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
  const detallesOrdenados = [...datos.detalles].sort((a, b) =>
    (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );

  detallesOrdenados.forEach((d, i) => {
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
    const esAdelantado = (Number(d.saldoVencido) || 0) <= 0;
    setCell(r, 30, esAdelantado ? (d.montoAdelantado ?? 0) : 0, 'n');
    setCell(r, 31, esAdelantado ? (d.cuotasAdelantadas ?? 0) : 0, 'n');
  });

  // --- 3.1. FILAS DE COBROS Y ABONOS (Columna 32 en adelante) ---
  const pagosCobradosExcel = detallesOrdenados.filter(d => (d.pagoReal || 0) > 0 || (d.moratorio || 0) > 0);
  pagosCobradosExcel.forEach((p, idx) => {
    const pr = 8 + idx;
    setCell(pr, 32, idx + 1, 'n');
    setCell(pr, 33, p.fechaPago ? new Date(p.fechaPago).toLocaleDateString("es-MX") : (p.diaPago || "-"));
    setCell(pr, 34, p.fechaPago ? new Date(p.fechaPago).toLocaleTimeString("es-MX") : "-");
    setCell(pr, 35, p.codigoCliente);
    setCell(pr, 36, p.nombreCliente);
    setCell(pr, 37, p.numContrato || "-");
    setCell(pr, 38, p.pagoReal, 'n');
    setCell(pr, 39, p.gestor || datos.codigoGestor);
    setCell(pr, 40, "ABONO SEMANAL");
    setCell(pr, 41, p.periodicidad);
    setCell(pr, 42, p.diaPago || "-");
    setCell(pr, 43, p.telefono || "-");
    setCell(pr, 44, p.moratorio || 0, 'n');
    setCell(pr, 45, p.tipoCobro || p.canalCobro || "EFECTIVO");
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
  setCell(resumenRowStart, 3, "DP (DASOPLUS)");

  const rowsComp = [
    { concepto: "Cuentas Asignadas (Cartera)", g: resGlobal.totalCuentas, dq: resDQ.totalCuentas, dp: resDP.totalCuentas, num: true },
    { concepto: "Cuentas Asignadas en $ (Pago Sugerido)", g: resGlobal.totalSugerido, dq: resDQ.totalSugerido, dp: resDP.totalSugerido, num: true },
    { concepto: "Cobranza Abonos ($)", g: resGlobal.totalCobrado, dq: resDQ.totalCobrado, dp: resDP.totalCobrado, num: true },
    { concepto: "Interés Moratorio ($)", g: resGlobal.totalMoratorio ?? 0, dq: resDQ.totalMoratorio ?? 0, dp: resDP.totalMoratorio ?? 0, num: true },
    { concepto: "Total Recaudado (Abonos + Mora) ($)", g: resGlobal.totalCobradoConMoratorio ?? ((resGlobal.totalCobrado ?? 0) + (resGlobal.totalMoratorio ?? 0)), dq: resDQ.totalCobradoConMoratorio ?? ((resDQ.totalCobrado ?? 0) + (resDQ.totalMoratorio ?? 0)), dp: resDP.totalCobradoConMoratorio ?? ((resDP.totalCobrado ?? 0) + (resDP.totalMoratorio ?? 0)), num: true },
    { concepto: "% Cumplimiento (Sin Dobles)", g: `${resGlobal.porcentajeCtasSinDobles}%`, dq: `${resDQ.porcentajeCtasSinDobles}%`, dp: `${resDP.porcentajeCtasSinDobles}%`, num: false },
    { concepto: "% Cumplimiento (Con Dobles)", g: `${resGlobal.porcentajeCtasConDobles}%`, dq: `${resDQ.porcentajeCtasConDobles}%`, dp: `${resDP.porcentajeCtasConDobles}%`, num: false },
    { concepto: "Cobro en Efectivo (Gestor)", g: resGlobal.cobranzaGestor?.pesos ?? resGlobal.cobranzaEfectivo.pesos, dq: resDQ.cobranzaGestor?.pesos ?? resDQ.cobranzaEfectivo.pesos, dp: resDP.cobranzaGestor?.pesos ?? resDP.cobranzaEfectivo.pesos, num: true },
    { concepto: "Bancos BOT ($)", g: resGlobal.cobranzaBancosBot?.pesos ?? 0, dq: resDQ.cobranzaBancosBot?.pesos ?? 0, dp: resDP.cobranzaBancosBot?.pesos ?? 0, num: true },
    { concepto: "Bancos Gestor ($)", g: resGlobal.cobranzaBancosGestor?.pesos ?? 0, dq: resDQ.cobranzaBancosGestor?.pesos ?? 0, dp: resDP.cobranzaBancosGestor?.pesos ?? 0, num: true },
    { concepto: "Total Bancos ($)", g: resGlobal.cobranzaBancos.pesos, dq: resDQ.cobranzaBancos.pesos, dp: resDP.cobranzaBancos.pesos, num: true },
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
  setCell(detalleStart + 1, 12, resGlobal.totalMoratorio ?? 0, 'n');
  setCell(detalleStart + 1, 14, resGlobal.totalCobrado ?? 0, 'n');
  setCell(detalleStart + 1, 15, "TOTAL REC.");
  setCell(detalleStart + 1, 16, (resGlobal.totalCobradoConMoratorio ?? ((resGlobal.totalCobrado ?? 0) + (resGlobal.totalMoratorio ?? 0))), 'n');
  setCell(detalleStart + 1, 17, "CUENTAS");
  setCell(detalleStart + 1, 18, datos.detalles.length, 'n');

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

  setCell(detalleStart + 9, 0, "Cuentas (FUGA FU)");
  setCell(detalleStart + 9, 2, (prob?.fugaFU?.cuentas ?? prob?.pagoSemPS.cuentas) ?? 0, 'n');
  setCell(detalleStart + 9, 3, (prob?.fugaFU?.pesos ?? prob?.pagoSemPS.pesos) ?? 0, 'n');

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

  // 3 Líneas requeridas debajo de la tabla de Presupuesto y Avance Diario Semanal
  setCell(diarioStart + 6, 4, "PORCENTAJE COMISION");
  setCell(diarioStart + 6, 5, `${resGlobal.porcentajeCtasSinDobles ?? 0}%`);
  setCell(diarioStart + 7, 4, "PORCENTAJE SALDOS VENCIDOS");
  const pctVencExcel = resGlobal.totalCartera > 0 ? ((resGlobal.totalVencido / resGlobal.totalCartera) * 100).toFixed(1) : "0.0";
  setCell(diarioStart + 7, 5, `${pctVencExcel}%`);
  setCell(diarioStart + 8, 4, "VERIFICACIONES");
  const ctasVDExcel = datos.detalles.filter(d => d.problema === 'VD' || (d as any).vdStatus).length;
  setCell(diarioStart + 8, 5, `${ctasVDExcel} ctas`);

  // Rango global de la hoja
  const totalRows = diarioStart + 10;
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
    { wch: 10 }, // TIP COB
    { wch: 16 }, // MONTO ADELANTADO
    { wch: 16 }  // SEMANAS ADELANTADAS
  ];

  XLSX.utils.book_append_sheet(wb, ws, "LISTA");

  const pDQ = resDQ.resumenProblemas;
  const pDP = resDP.resumenProblemas;

  // --- HOJA 2: RESUMEN DE CORTE (EJECUTIVO DEDICADO) ---
  const filasResumen: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["PLANTILLA LISTA COBRANZA — RESUMEN EJECUTIVO Y CORTE SEMANAL"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}`],
    [],
    ["1. RESUMEN COMPARATIVO DE CORTE: GLOBAL VS DQ VS DP"],
    ["INDICADOR CLAVE", "GLOBAL (TOTAL)", "DQ (QUERETARO)", "DP (DASOPLUS)"],
    ...rowsComp.map((r) => [r.concepto, r.g, r.dq, r.dp]),
    [],
    ["2. RESUMEN DE COBRANZA (PROBLEMAS / CLASIFICACIÓN)"],
    ["CONCEPTO", "GLOBAL CTAS", "GLOBAL $", "DQ CTAS", "DQ $", "DP CTAS", "DP $"],
    ["Cuentas Asignadas", prob?.totalAsignadas.cuentas ?? datos.detalles.length, prob?.totalAsignadas.pesos ?? resGlobal.totalSugerido ?? 0, pDQ?.totalAsignadas.cuentas ?? 0, pDQ?.totalAsignadas.pesos ?? 0, pDP?.totalAsignadas.cuentas ?? 0, pDP?.totalAsignadas.pesos ?? 0],
    ["Cancelado K", prob?.canceladoK.cuentas ?? 0, prob?.canceladoK.pesos ?? 0, pDQ?.canceladoK.cuentas ?? 0, pDQ?.canceladoK.pesos ?? 0, pDP?.canceladoK.cuentas ?? 0, pDP?.canceladoK.pesos ?? 0],
    ["Intervención IT", prob?.intervencionIT.cuentas ?? 0, prob?.intervencionIT.pesos ?? 0, pDQ?.intervencionIT.cuentas ?? 0, pDQ?.intervencionIT.pesos ?? 0, pDP?.intervencionIT.cuentas ?? 0, pDP?.intervencionIT.pesos ?? 0],
    ["Adelantado AD", prob?.adelantadoAD.cuentas ?? 0, prob?.adelantadoAD.pesos ?? 0, pDQ?.adelantadoAD.cuentas ?? 0, pDQ?.adelantadoAD.pesos ?? 0, pDP?.adelantadoAD.cuentas ?? 0, pDP?.adelantadoAD.pesos ?? 0],
    ["Período PE", prob?.periodoPE.cuentas ?? 0, prob?.periodoPE.pesos ?? 0, pDQ?.periodoPE.cuentas ?? 0, pDQ?.periodoPE.pesos ?? 0, pDP?.periodoPE.cuentas ?? 0, pDP?.periodoPE.pesos ?? 0],
    ["Fuga FU", (prob?.fugaFU?.cuentas ?? prob?.pagoSemPS.cuentas) ?? 0, (prob?.fugaFU?.pesos ?? prob?.pagoSemPS.pesos) ?? 0, (pDQ?.fugaFU?.cuentas ?? pDQ?.pagoSemPS.cuentas) ?? 0, (pDQ?.fugaFU?.pesos ?? pDQ?.pagoSemPS.pesos) ?? 0, (pDP?.fugaFU?.cuentas ?? pDP?.pagoSemPS.cuentas) ?? 0, (pDP?.fugaFU?.pesos ?? pDP?.pagoSemPS.pesos) ?? 0],
    ["Dictamen Legal DL", prob?.dictLegalDL.cuentas ?? 0, prob?.dictLegalDL.pesos ?? 0, pDQ?.dictLegalDL.cuentas ?? 0, pDQ?.dictLegalDL.pesos ?? 0, pDP?.dictLegalDL.cuentas ?? 0, pDP?.dictLegalDL.pesos ?? 0],
    ["TOTAL PROBLEMAS", prob?.totalProblemas.cuentas ?? 0, prob?.totalProblemas.pesos ?? 0, pDQ?.totalProblemas.cuentas ?? 0, pDQ?.totalProblemas.pesos ?? 0, pDP?.totalProblemas.cuentas ?? 0, pDP?.totalProblemas.pesos ?? 0],
    ["Cuentas (RUTA)", prob?.cuentasRuta.cuentas ?? 0, prob?.cuentasRuta.pesos ?? 0, pDQ?.cuentasRuta.cuentas ?? 0, pDQ?.cuentasRuta.pesos ?? 0, pDP?.cuentasRuta.cuentas ?? 0, pDP?.cuentasRuta.pesos ?? 0],
    ["Vencidos (RUTA)", prob?.vencidosRuta.cuentas ?? 0, prob?.vencidosRuta.pesos ?? 0, pDQ?.vencidosRuta.cuentas ?? 0, pDQ?.vencidosRuta.pesos ?? 0, pDP?.vencidosRuta.cuentas ?? 0, pDP?.vencidosRuta.pesos ?? 0],
    [],
    ["3. CANALES DE COBRO"],
    ["CANAL", "GLOBAL $", "GLOBAL CTAS", "DQ $", "DQ CTAS", "DP $", "DP CTAS"],
    ["Cobro en Efectivo (Gestor)", resGlobal.cobranzaGestor?.pesos ?? resGlobal.cobranzaEfectivo.pesos, resGlobal.cobranzaGestor?.cuentas ?? resGlobal.cobranzaEfectivo.cuentas, resDQ.cobranzaGestor?.pesos ?? resDQ.cobranzaEfectivo.pesos, resDQ.cobranzaGestor?.cuentas ?? resDQ.cobranzaEfectivo.cuentas, resDP.cobranzaGestor?.pesos ?? resDP.cobranzaEfectivo.pesos, resDP.cobranzaGestor?.cuentas ?? resDP.cobranzaEfectivo.cuentas],
    ["Bancos BOT ($)", resGlobal.cobranzaBancosBot?.pesos ?? 0, resGlobal.cobranzaBancosBot?.cuentas ?? 0, resDQ.cobranzaBancosBot?.pesos ?? 0, resDQ.cobranzaBancosBot?.cuentas ?? 0, resDP.cobranzaBancosBot?.pesos ?? 0, resDP.cobranzaBancosBot?.cuentas ?? 0],
    ["Bancos Gestor ($)", resGlobal.cobranzaBancosGestor?.pesos ?? 0, resGlobal.cobranzaBancosGestor?.cuentas ?? 0, resDQ.cobranzaBancosGestor?.pesos ?? 0, resDQ.cobranzaBancosGestor?.cuentas ?? 0, resDP.cobranzaBancosGestor?.pesos ?? 0, resDP.cobranzaBancosGestor?.cuentas ?? 0],
    ["Total Bancos ($)", resGlobal.cobranzaBancos.pesos, resGlobal.cobranzaBancos.cuentas, resDQ.cobranzaBancos.pesos, resDQ.cobranzaBancos.cuentas, resDP.cobranzaBancos.pesos, resDP.cobranzaBancos.cuentas],
    ["Interés Moratorio ($)", resGlobal.totalMoratorio ?? 0, "-", resDQ.totalMoratorio ?? 0, "-", resDP.totalMoratorio ?? 0, "-"],
    ["TOTAL RECAUDADO (Abonos + Mora)", resGlobal.totalCobradoConMoratorio ?? ((resGlobal.totalCobrado ?? 0) + (resGlobal.totalMoratorio ?? 0)), "-", resDQ.totalCobradoConMoratorio ?? ((resDQ.totalCobrado ?? 0) + (resDQ.totalMoratorio ?? 0)), "-", resDP.totalCobradoConMoratorio ?? ((resDP.totalCobrado ?? 0) + (resDP.totalMoratorio ?? 0)), "-"],
    [],
    ["4. PRESUPUESTO VS COBRANZA POR PERIODICIDAD"],
    ["PERIODICIDAD", "PPTO CTAS", "PPTO $", "COB CTAS", "COB $", "% CTAS", "% $"],
    ...(resGlobal.matrizPeriodos || []).map((m) => [m.periodo, m.pptoCtas, m.pptoPesos, m.cobCtas, m.cobPesos, `${m.porcCtas}%`, `${m.porcPesos}%`]),
    [],
    ["5. PRESUPUESTO Y AVANCE DIARIO SEMANAL"],
    ["DIA", "PPTO CTAS", "AVANCE CTAS", "PPTO DINERO", "AVANCE DINERO"],
    ...(datos.resumen?.resumenDiario || resGlobal.resumenDiario || []).map((d) => [d.dia, d.pptoCuentas, d.avanceCuentas, d.pptoDinero, d.avanceDinero]),
    [],
    ["6. INDICADORES COMPLEMENTARIOS"],
    ["Porcentaje Comisión:", `${resGlobal.porcentajeCtasSinDobles ?? 0}%`],
    ["Porcentaje Saldos Vencidos:", `${pctVencExcel}%`],
    ["Verificaciones (VD):", `${ctasVDExcel} cuentas`]
  ];
  const wsRes = XLSX.utils.aoa_to_sheet(filasResumen);
  wsRes['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsRes, "RESUMEN DE CORTE");

  // --- HOJA 3: CLIENTES SÍ PAGO (ABONOS) ---
  const filasSiPago: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["LISTA DE COBRANZA — CLIENTES CON PAGO (ABONOS RECIBIDOS)"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}`],
    [],
    [
      "#",
      "CODIGO",
      "CONTRATO",
      "NOMBRE CLIENTE",
      "DOMICILIO",
      "TELEFONO",
      "GESTOR",
      "PERIODICIDAD",
      "PAGO SUGERIDO",
      "PAGO REAL (ABONO)",
      "MORATORIO",
      "TOTAL RECAUDADO",
      "TIPO / CANAL",
      "DIA PAGO",
      "FECHA PAGO",
      "PROBLEMA"
    ],
    ...pagosCobradosExcel.map((c, idx) => [
      idx + 1,
      c.codigoCliente,
      c.numContrato || "-",
      c.nombreCliente,
      c.domicilio || "-",
      c.telefono || "-",
      c.gestor || datos.codigoGestor,
      c.periodicidad,
      c.pagoSugerido,
      c.pagoReal,
      c.moratorio || 0,
      (c.pagoReal || 0) + (c.moratorio || 0),
      c.tipoCobro || c.canalCobro || "EFECTIVO",
      c.diaPago || "-",
      c.fechaPago ? new Date(c.fechaPago).toLocaleDateString("es-MX") : "-",
      c.problema || "RUTA"
    ]),
    [],
    [
      "TOTALES",
      `${pagosCobradosExcel.length} cuentas`,
      "",
      "",
      "",
      "",
      "",
      "",
      pagosCobradosExcel.reduce((a, b) => a + (b.pagoSugerido || 0), 0),
      pagosCobradosExcel.reduce((a, b) => a + (b.pagoReal || 0), 0),
      pagosCobradosExcel.reduce((a, b) => a + (b.moratorio || 0), 0),
      pagosCobradosExcel.reduce((a, b) => a + (b.pagoReal || 0) + (b.moratorio || 0), 0),
      "",
      "",
      "",
      ""
    ]
  ];
  const wsSiPago = XLSX.utils.aoa_to_sheet(filasSiPago);
  wsSiPago['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 30 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSiPago, "CLIENTES SÍ PAGO");

  // --- HOJA 4: CLIENTES SIN PAGO (CARTERA PENDIENTE) ---
  const ctasSinPagoExcel = detallesOrdenados.filter(d => Number(d.pagoReal || 0) === 0);
  const filasSinPago: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["LISTA DE COBRANZA — CLIENTES SIN PAGO (CARTERA PENDIENTE)"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}`],
    [],
    [
      "#",
      "CODIGO",
      "CONTRATO",
      "NOMBRE CLIENTE",
      "DOMICILIO",
      "TELEFONO",
      "GESTOR",
      "PERIODICIDAD",
      "PAGO SUGERIDO",
      "SALDO VENCIDO",
      "PV",
      "SALDO ACTUAL",
      "PROBLEMA",
      "MONTO ADELANTADO",
      "SEMANAS ADELANTADAS"
    ],
    ...ctasSinPagoExcel.map((c, idx) => [
      idx + 1,
      c.codigoCliente,
      c.numContrato || "-",
      c.nombreCliente,
      c.domicilio || "-",
      c.telefono || "-",
      c.gestor || datos.codigoGestor,
      c.periodicidad,
      c.pagoSugerido,
      c.saldoVencido,
      c.pv,
      c.saldoActual,
      c.problema || "RUTA",
      (Number(c.saldoVencido) || 0) <= 0 ? (c.montoAdelantado || 0) : 0,
      (Number(c.saldoVencido) || 0) <= 0 ? (c.cuotasAdelantadas || 0) : 0
    ]),
    [],
    [
      "TOTALES",
      `${ctasSinPagoExcel.length} cuentas`,
      "",
      "",
      "",
      "",
      "",
      "",
      ctasSinPagoExcel.reduce((a, b) => a + (b.pagoSugerido || 0), 0),
      ctasSinPagoExcel.reduce((a, b) => a + (b.saldoVencido || 0), 0),
      "",
      ctasSinPagoExcel.reduce((a, b) => a + (b.saldoActual || 0), 0),
      "",
      ctasSinPagoExcel.reduce((a, b) => a + ((Number(b.saldoVencido) || 0) <= 0 ? (b.montoAdelantado || 0) : 0), 0),
      ""
    ]
  ];
  const wsSinPago = XLSX.utils.aoa_to_sheet(filasSinPago);
  wsSinPago['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 30 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 16 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSinPago, "CLIENTES SIN PAGO");

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
 * Genera el HTML oficial del Resumen Ejecutivo de Corte de Cobranza (PLANTILLA CEJ)
 * Excluye el listado individual de clientes para emitir un reporte ejecutivo conciso,
 * enfocado en métricas clave, comparativo GLOBAL vs DQ vs DP, canales de cobro y avance diario.
 */
export function generarHTMLPlantillaCEJ(datos: DatosExportacionCEJ): string {
  const resCalculados = separarYCalcularResumenesCEJ(datos.detalles);
  const resGlobal = datos.resumen || resCalculados.global;
  const resDQ = datos.resumenDQ || resCalculados.dq;
  const resDP = datos.resumenDP || resCalculados.dp;

  const p = resGlobal.resumenProblemas;
  const pDQ = resDQ.resumenProblemas;
  const pDP = resDP.resumenProblemas;
  const mPeriodos = resGlobal.matrizPeriodos || [];
  const rDiario = resGlobal.resumenDiario || [];
  const totalCuentas = datos.detalles?.length || resGlobal.totalCuentas || 0;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>PLANTILLA LISTA COBRANZA - RESUMEN DE CORTE - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page { size: letter landscape; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 8px; color: #0f172a; margin: 0; padding: 0; background: #fff; line-height: 1.25; }
    .header-box { margin-bottom: 8px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title-company { font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; margin: 0; }
    .subtitle { font-size: 10.5px; font-weight: 700; color: #334155; margin: 2px 0 0 0; }
    .info-bar { display: flex; flex-wrap: wrap; gap: 14px; font-size: 8.5px; font-weight: bold; background: #f8fafc; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 8px; }
    .info-bar span { color: #64748b; font-weight: 600; }
    .info-bar strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #0f172a; color: #fff; font-size: 7.5px; font-weight: 700; padding: 3.5px 4px; border: 0.5px solid #334155; text-transform: uppercase; }
    td { font-size: 7.5px; padding: 2.5px 4px; border: 0.5px solid #cbd5e1; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .section-card { border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; margin-bottom: 8px; background: #fff; }
    .card-header { background: #0f172a; color: white; font-weight: 800; font-size: 8.5px; padding: 4px 8px; display: flex; justify-content: space-between; align-items: center; letter-spacing: 0.02em; }
    .card-body { padding: 5px 8px; }
    .kpi-row { display: flex; justify-content: space-between; padding: 2.5px 0; border-bottom: 0.5px dashed #e2e8f0; font-size: 8px; }
    .kpi-row:last-child { border-bottom: none; }
    .kpi-row.highlight { background: #f1f5f9; font-weight: bold; padding: 3px 6px; border-radius: 3px; }
    .signatures-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 14px; padding: 6px 12px; }
    .signature-col { text-align: center; font-size: 8px; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 4px; width: 85%; margin-left: auto; margin-right: auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { size: letter landscape; margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 8px 14px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-radius: 4px;">
    <div style="font-size: 11px;">
      <strong>Plantilla Lista Cobranza — Resumen de Corte Oficial</strong> • Semana ${datos.semana} (${datos.codigoGestor})
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer;">🖨️ Imprimir Resumen</button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cerrar</button>
    </div>
  </div>

  <div style="padding: 4px 6px;">
    <!-- ENCABEZADO INSTITUCIONAL -->
    <div class="header-box">
      <div>
        <div class="title-company">Grupo Mueblero DASO SA de CV</div>
        <div class="subtitle">Plantilla Lista Cobranza — Resumen Ejecutivo y Corte Semanal</div>
      </div>
      <div style="text-align: right; font-size: 8px; color: #475569;">
        <div>SISTEMA ERP MUEBLERÍA DASO</div>
        <div style="font-weight: bold; color: #0f172a;">FECHA IMPRESIÓN: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
      </div>
    </div>

    <!-- BARRA DE METADATOS DEL CICLO -->
    <div class="info-bar">
      <div><span>SEMANA:</span> <strong>Semana ${datos.semana} (${datos.anio})</strong></div>
      <div><span>CICLO OFICIAL:</span> <strong>${datos.fechaInicioStr} al ${datos.fechaFinStr}</strong></div>
      <div><span>GESTOR / COBRADOR:</span> <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
      <div><span>TOTAL CARTERA:</span> <strong>${totalCuentas} cuentas</strong></div>
    </div>

    <!-- TABLA COMPARATIVA EJECUTIVA: GLOBAL vs DQ vs DP -->
    <div class="section-card" style="margin-bottom: 8px;">
      <div class="card-header" style="background: #0f172a;">
        <span>RESUMEN COMPARATIVO DE CORTE (GLOBAL vs DQ QUERÉTARO vs DP DASOPLUS)</span>
        <span>Semana ${datos.semana} (${datos.anio})</span>
      </div>
      <div style="padding: 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 3.5px 6px; text-align: left;">INDICADOR CLAVE</th>
              <th style="padding: 3.5px 6px; text-align: right; background: #334155;">GLOBAL (TOTAL)</th>
              <th style="padding: 3.5px 6px; text-align: right; background: #1e3a8a;">DQ (QUERÉTARO)</th>
              <th style="padding: 3.5px 6px; text-align: right; background: #312e81;">DP (DASOPLUS)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold" style="padding: 2.5px 6px;">Cuentas Asignadas (Cartera)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">${resGlobal.totalCuentas} ctas</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #1e3a8a;">${resDQ.totalCuentas} ctas</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #312e81;">${resDP.totalCuentas} ctas</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td class="font-bold" style="padding: 2.5px 6px;">Cuentas Asignadas en $ (Pago Sugerido)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">$${(resGlobal.totalSugerido ?? 0).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #1e3a8a;">$${(resDQ.totalSugerido ?? 0).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #312e81;">$${(resDP.totalSugerido ?? 0).toLocaleString("es-MX")}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td class="font-bold" style="padding: 2.5px 6px;">Cobranza Abonos ($)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #166534; font-size: 8.5px;">$${resGlobal.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #166534; font-size: 8.5px;">$${resDQ.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #166534; font-size: 8.5px;">$${resDP.totalCobrado.toLocaleString("es-MX")}</td>
            </tr>
            <tr style="background: #fefce8;">
              <td class="font-bold" style="padding: 2.5px 6px; color: #854d0e;">⚡ Interés Moratorio Cobrado ($)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #854d0e; font-size: 8.5px;">$${(resGlobal.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #854d0e; font-size: 8.5px;">$${(resDQ.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #854d0e; font-size: 8.5px;">$${(resDP.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
            </tr>
            <tr style="background: #ecfdf5;">
              <td class="font-bold" style="padding: 2.5px 6px; color: #065f46;">💰 Total Recaudado (Abonos + Mora)</td>
              <td class="text-right font-mono font-black" style="padding: 2.5px 6px; color: #065f46; font-size: 8.5px;">$${(resGlobal.totalCobradoConMoratorio ?? ((resGlobal.totalCobrado ?? 0) + (resGlobal.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-black" style="padding: 2.5px 6px; color: #065f46; font-size: 8.5px;">$${(resDQ.totalCobradoConMoratorio ?? ((resDQ.totalCobrado ?? 0) + (resDQ.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-black" style="padding: 2.5px 6px; color: #065f46; font-size: 8.5px;">$${(resDP.totalCobradoConMoratorio ?? ((resDP.totalCobrado ?? 0) + (resDP.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
            </tr>
            <tr>
              <td class="font-bold" style="padding: 2.5px 6px;">% Cumplimiento Metas (Sin Dobles)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">${resGlobal.porcentajeCtasSinDobles}%</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #1e3a8a;">${resDQ.porcentajeCtasSinDobles}%</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #312e81;">${resDP.porcentajeCtasSinDobles}%</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px;">% Cumplimiento Metas (Con Dobles)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resGlobal.porcentajeCtasConDobles}%</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e3a8a;">${resDQ.porcentajeCtasConDobles}%</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #312e81;">${resDP.porcentajeCtasConDobles}%</td>
            </tr>
            <!-- DESGLOSE CANALES SEPARADOS Y TOTALIZADOS -->
            <tr style="background: #ecfdf5;">
              <td style="padding: 2.5px 6px; font-weight: bold; color: #065f46;">💵 Cobranza Gestor (Efectivo Ruta)</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #065f46;">$${(resGlobal.cobranzaGestor?.pesos ?? resGlobal.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resGlobal.cobranzaGestor?.cuentas ?? resGlobal.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #065f46;">$${(resDQ.cobranzaGestor?.pesos ?? resDQ.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDQ.cobranzaGestor?.cuentas ?? resDQ.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #065f46;">$${(resDP.cobranzaGestor?.pesos ?? resDP.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDP.cobranzaGestor?.cuentas ?? resDP.cobranzaEfectivo?.cuentas ?? 0} ctas)</span></td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px; color: #1e3a8a;">🤖 Bancos BOT (Automático / SPEI)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">$${(resGlobal.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resGlobal.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e3a8a;">$${(resDQ.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDQ.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #312e81;">$${(resDP.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDP.cobranzaBancosBot?.cuentas ?? 0} ctas)</span></td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px; color: #4338ca;">🏦 Bancos Gestor (Depósito Manual)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">$${(resGlobal.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resGlobal.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e3a8a;">$${(resDQ.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDQ.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #312e81;">$${(resDP.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDP.cobranzaBancosGestor?.cuentas ?? 0} ctas)</span></td>
            </tr>
            <tr style="background: #eff6ff; font-weight: bold;">
              <td style="padding: 2.5px 6px; color: #1e40af;">💳 Total Bancos (BOT + GESTOR)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e40af;">$${resGlobal.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resGlobal.cobranzaBancos.cuentas} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e40af;">$${resDQ.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDQ.cobranzaBancos.cuentas} ctas)</span></td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #1e40af;">$${resDP.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDP.cobranzaBancos.cuentas} ctas)</span></td>
            </tr>
            <tr style="background: #dcfce7; font-weight: 900;">
              <td style="padding: 3px 6px; color: #14532d;">💰 TOTAL COBRANZA (GESTOR + BANCOS)</td>
              <td class="text-right font-mono font-black" style="padding: 3px 6px; color: #14532d;">$${resGlobal.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-black" style="padding: 3px 6px; color: #14532d;">$${resDQ.totalCobrado.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-black" style="padding: 3px 6px; color: #14532d;">$${resDP.totalCobrado.toLocaleString("es-MX")}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px;">Saldo Vencido</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #b91c1c;">$${resGlobal.totalVencido.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #b91c1c;">$${resDQ.totalVencido.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px; color: #b91c1c;">$${resDP.totalVencido.toLocaleString("es-MX")}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px;">Cartera Total</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">$${resGlobal.totalCartera.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">$${resDQ.totalCartera.toLocaleString("es-MX")}</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">$${resDP.totalCartera.toLocaleString("es-MX")}</td>
            </tr>
            <tr>
              <td style="padding: 2.5px 6px;">Cuentas en RUTA</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px;">${resGlobal.resumenProblemas.cuentasRuta.cuentas} ctas ($${resGlobal.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #1e3a8a;">${resDQ.resumenProblemas.cuentasRuta.cuentas} ctas ($${resDQ.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono font-bold" style="padding: 2.5px 6px; color: #312e81;">${resDP.resumenProblemas.cuentasRuta.cuentas} ctas ($${resDP.resumenProblemas.cuentasRuta.pesos.toLocaleString("es-MX")})</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 2.5px 6px;">Total Cuentas Problema (K, IT, PE...)</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resGlobal.resumenProblemas.totalProblemas.cuentas} ctas ($${resGlobal.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resDQ.resumenProblemas.totalProblemas.cuentas} ctas ($${resDQ.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
              <td class="text-right font-mono" style="padding: 2.5px 6px;">${resDP.resumenProblemas.totalProblemas.cuentas} ctas ($${resDP.resumenProblemas.totalProblemas.pesos.toLocaleString("es-MX")})</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SECCIÓN DE 2 COLUMNAS: PROBLEMAS/CANALES VS PERIODICIDADES/DIARIO -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <!-- COLUMNA IZQUIERDA -->
      <div>
        <!-- 1. Clasificación de Cartera y Problemas (GLOBAL • DQ • DP) -->
        <div class="section-card">
          <div class="card-header">
            <span>Clasificación de Cartera y Problemas</span>
            <span style="font-size: 7.5px; font-weight: normal; color: #94a3b8;">GLOBAL • DQ • DP</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
            <thead>
              <tr style="background: #0f172a; color: white;">
                <th style="padding: 2.5px 4px; text-align: left;">PROBLEMA / CARTERA</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #334155;">GLOBAL</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #1e3a8a;">DQ</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #312e81;">DP</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #f1f5f9; font-weight: bold;">
                <td style="padding: 2px 4px;">Cuentas Asignadas (Cartera)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.totalAsignadas.cuentas ?? 0} ($${(p?.totalAsignadas.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.totalAsignadas.cuentas ?? 0} ($${(pDQ?.totalAsignadas.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.totalAsignadas.cuentas ?? 0} ($${(pDP?.totalAsignadas.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px;">CANCELADO (K)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.canceladoK.cuentas ?? 0} ($${(p?.canceladoK.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.canceladoK.cuentas ?? 0} ($${(pDQ?.canceladoK.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.canceladoK.cuentas ?? 0} ($${(pDP?.canceladoK.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 2px 4px;">INTERVENCION (IT)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.intervencionIT.cuentas ?? 0} ($${(p?.intervencionIT.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.intervencionIT.cuentas ?? 0} ($${(pDQ?.intervencionIT.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.intervencionIT.cuentas ?? 0} ($${(pDP?.intervencionIT.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px;">ADELANTADO (AD)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.adelantadoAD.cuentas ?? 0} ($${(p?.adelantadoAD.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.adelantadoAD.cuentas ?? 0} ($${(pDQ?.adelantadoAD.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.adelantadoAD.cuentas ?? 0} ($${(pDP?.adelantadoAD.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 2px 4px;">PERIODO (PE)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.periodoPE.cuentas ?? 0} ($${(p?.periodoPE.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.periodoPE.cuentas ?? 0} ($${(pDQ?.periodoPE.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.periodoPE.cuentas ?? 0} ($${(pDP?.periodoPE.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #fff1f2;">
                <td style="padding: 2px 4px; font-weight: bold; color: #be123c;">FUGA (FU)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono font-bold" style="color: #be123c;">${(p?.fugaFU?.cuentas ?? p?.pagoSemPS.cuentas) ?? 0} ($${((p?.fugaFU?.pesos ?? p?.pagoSemPS.pesos) ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono font-bold" style="color: #be123c;">${(pDQ?.fugaFU?.cuentas ?? pDQ?.pagoSemPS.cuentas) ?? 0} ($${((pDQ?.fugaFU?.pesos ?? pDQ?.pagoSemPS.pesos) ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono font-bold" style="color: #be123c;">${(pDP?.fugaFU?.cuentas ?? pDP?.pagoSemPS.cuentas) ?? 0} ($${((pDP?.fugaFU?.pesos ?? pDP?.pagoSemPS.pesos) ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 2px 4px;">DICT LEGAL (DL)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.dictLegalDL.cuentas ?? 0} ($${(p?.dictLegalDL.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.dictLegalDL.cuentas ?? 0} ($${(pDQ?.dictLegalDL.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.dictLegalDL.cuentas ?? 0} ($${(pDP?.dictLegalDL.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #fee2e2; font-weight: bold; color: #991b1b;">
                <td style="padding: 2px 4px;">TOTAL PROBLEMAS</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.totalProblemas.cuentas ?? 0} ($${(p?.totalProblemas.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.totalProblemas.cuentas ?? 0} ($${(pDQ?.totalProblemas.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.totalProblemas.cuentas ?? 0} ($${(pDP?.totalProblemas.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="background: #dbeafe; font-weight: bold; color: #1e40af;">
                <td style="padding: 2px 4px;">Cuentas en RUTA</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.cuentasRuta.cuentas ?? 0} ($${(p?.cuentasRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.cuentasRuta.cuentas ?? 0} ($${(pDQ?.cuentasRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.cuentasRuta.cuentas ?? 0} ($${(pDP?.cuentasRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
              <tr style="font-weight: bold; color: #b91c1c;">
                <td style="padding: 2px 4px;">Vencidos en RUTA</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${p?.vencidosRuta.cuentas ?? 0} ($${(p?.vencidosRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDQ?.vencidosRuta.cuentas ?? 0} ($${(pDQ?.vencidosRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${pDP?.vencidosRuta.cuentas ?? 0} ($${(pDP?.vencidosRuta.pesos ?? 0).toLocaleString("es-MX")})</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 2. Canales de Cobro y Cumplimiento (GLOBAL • DQ • DP) -->
        <div class="section-card" style="margin-top: 6px;">
          <div class="card-header">
            <span>Canales de Recaudación y Cumplimiento</span>
            <span style="font-size: 7.5px; font-weight: normal; color: #94a3b8;">GLOBAL • DQ • DP</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
            <thead>
              <tr style="background: #0f172a; color: white;">
                <th style="padding: 2.5px 4px; text-align: left;">CANAL / INDICADOR</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #334155;">GLOBAL</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #1e3a8a;">DQ</th>
                <th style="padding: 2.5px 4px; text-align: right; background: #312e81;">DP</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #ecfdf5; font-weight: bold; color: #065f46;">
                <td style="padding: 2px 4px;">💵 GESTOR (Efectivo)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.cobranzaGestor?.pesos ?? resGlobal.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resGlobal.cobranzaGestor?.cuentas ?? resGlobal.cobranzaEfectivo?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.cobranzaGestor?.pesos ?? resDQ.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDQ.cobranzaGestor?.cuentas ?? resDQ.cobranzaEfectivo?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.cobranzaGestor?.pesos ?? resDP.cobranzaEfectivo?.pesos ?? 0).toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDP.cobranzaGestor?.cuentas ?? resDP.cobranzaEfectivo?.cuentas ?? 0})</span></td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; color: #1e3a8a;">🤖 BANCOS BOT (SPEI)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resGlobal.cobranzaBancosBot?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDQ.cobranzaBancosBot?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.cobranzaBancosBot?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDP.cobranzaBancosBot?.cuentas ?? 0})</span></td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 2px 4px; color: #4338ca;">📱 BANCOS GESTOR</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resGlobal.cobranzaBancosGestor?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDQ.cobranzaBancosGestor?.cuentas ?? 0})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.cobranzaBancosGestor?.pesos ?? 0).toLocaleString("es-MX")} <span style="color: #64748b;">(${resDP.cobranzaBancosGestor?.cuentas ?? 0})</span></td>
              </tr>
              <tr style="background: #eff6ff; font-weight: bold; color: #1e40af;">
                <td style="padding: 2px 4px;">🏦 TOTAL BANCOS</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${resGlobal.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resGlobal.cobranzaBancos.cuentas})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${resDQ.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDQ.cobranzaBancos.cuentas})</span></td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${resDP.cobranzaBancos.pesos.toLocaleString("es-MX")} <span style="font-weight: normal; color: #64748b;">(${resDP.cobranzaBancos.cuentas})</span></td>
              </tr>
              <tr style="background: #fefce8; color: #854d0e; font-weight: bold;">
                <td style="padding: 2px 4px;">⚡ MORATORIOS</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.totalMoratorio ?? 0).toLocaleString("es-MX")}</td>
              </tr>
              <tr style="background: #dcfce7; color: #14532d; font-weight: 900;">
                <td style="padding: 3px 4px;">💰 TOTAL RECAUDADO</td>
                <td style="padding: 3px 4px; text-align: right;" class="font-mono">$${(resGlobal.totalCobradoConMoratorio ?? ((resGlobal.totalCobrado ?? 0) + (resGlobal.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
                <td style="padding: 3px 4px; text-align: right;" class="font-mono">$${(resDQ.totalCobradoConMoratorio ?? ((resDQ.totalCobrado ?? 0) + (resDQ.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
                <td style="padding: 3px 4px; text-align: right;" class="font-mono">$${(resDP.totalCobradoConMoratorio ?? ((resDP.totalCobrado ?? 0) + (resDP.totalMoratorio ?? 0))).toLocaleString("es-MX")}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td style="padding: 2px 4px;">% Cumpl. (Sin Dobles)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resGlobal.porcentajeCtasSinDobles ?? 0}%</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resDQ.porcentajeCtasSinDobles ?? 0}%</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resDP.porcentajeCtasSinDobles ?? 0}%</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; color: #64748b;">% Cumpl. (Con Dobles)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resGlobal.porcentajeCtasConDobles ?? 0}%</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resDQ.porcentajeCtasConDobles ?? 0}%</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">${resDP.porcentajeCtasConDobles ?? 0}%</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; color: #64748b;">Pagos Dobles ($)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.totalPagosDobles ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.totalPagosDobles ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.totalPagosDobles ?? 0).toLocaleString("es-MX")}</td>
              </tr>
              <tr>
                <td style="padding: 2px 4px; color: #64748b;">Recuperado PV ($)</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resGlobal.totalRecuperadoPv ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDQ.totalRecuperadoPv ?? 0).toLocaleString("es-MX")}</td>
                <td style="padding: 2px 4px; text-align: right;" class="font-mono">$${(resDP.totalRecuperadoPv ?? 0).toLocaleString("es-MX")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- COLUMNA DERECHA -->
      <div>
        <!-- 3. Matriz por Periodicidad -->
        <div class="section-card">
          <div class="card-header">Presupuesto vs Cobranza por Periodicidad</div>
          <table style="width: 100%;">
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
                  <td class="text-center font-bold" style="color: #166534;">${m.cobCtas}</td>
                  <td class="text-right font-mono font-bold" style="color: #166534;">$${m.cobPesos.toLocaleString("es-MX")}</td>
                  <td class="text-center font-bold">${m.porcCtas}%</td>
                  <td class="text-center font-bold">${m.porcPesos}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                <td class="font-bold text-center">TOTALES</td>
                <td class="text-center">${mPeriodos.reduce((a, b) => a + b.pptoCtas, 0)}</td>
                <td class="text-right font-mono">$${mPeriodos.reduce((a, b) => a + b.pptoPesos, 0).toLocaleString("es-MX")}</td>
                <td class="text-center font-bold" style="color: #166534;">${mPeriodos.reduce((a, b) => a + b.cobCtas, 0)}</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">$${mPeriodos.reduce((a, b) => a + b.cobPesos, 0).toLocaleString("es-MX")}</td>
                <td class="text-center font-bold">${mPeriodos.reduce((a, b) => a + b.pptoCtas, 0) > 0 ? Math.round((mPeriodos.reduce((a, b) => a + b.cobCtas, 0) / mPeriodos.reduce((a, b) => a + b.pptoCtas, 0)) * 1000) / 10 : 0}%</td>
                <td class="text-center font-bold">${mPeriodos.reduce((a, b) => a + b.pptoPesos, 0) > 0 ? Math.round((mPeriodos.reduce((a, b) => a + b.cobPesos, 0) / mPeriodos.reduce((a, b) => a + b.pptoPesos, 0)) * 1000) / 10 : 0}%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 4. Avance Diario Semanal -->
        <div class="section-card" style="margin-top: 6px;">
          <div class="card-header">Presupuesto y Avance Diario Semanal (Cuentas RUTA)</div>
          <table style="width: 100%;">
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
                  <td class="text-center font-bold" style="color: #166534;">${d.avanceCuentas}</td>
                  <td class="text-right font-mono">$${d.pptoDinero.toLocaleString("es-MX")}</td>
                  <td class="text-right font-mono font-bold" style="color: #166534;">$${d.avanceDinero.toLocaleString("es-MX")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                <td class="font-bold text-center">TOTALES</td>
                <td class="text-center">${rDiario.reduce((a, b) => a + b.pptoCuentas, 0)}</td>
                <td class="text-center font-bold" style="color: #166534;">${rDiario.reduce((a, b) => a + b.avanceCuentas, 0)}</td>
                <td class="text-right font-mono">$${rDiario.reduce((a, b) => a + b.pptoDinero, 0).toLocaleString("es-MX")}</td>
                <td class="text-right font-mono font-bold" style="color: #166534;">$${rDiario.reduce((a, b) => a + b.avanceDinero, 0).toLocaleString("es-MX")}</td>
              </tr>
            </tfoot>
          </table>
          <!-- 3 líneas adicionales solicitadas por el usuario: PORCENTAJE COMISION, PORCENTAJE SALDOS VENCIDOS, VERIFICACIONES -->
          <div style="background: #f8fafc; border-top: 1px solid #cbd5e1; padding: 4px 6px; font-size: 7.5px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 0.5px dashed #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">PORCENTAJE COMISIÓN:</span>
              <span class="font-mono font-bold" style="color: #0f172a;">${(resGlobal.porcentajeCtasSinDobles ?? 0) >= 90 ? '12.0%' : (resGlobal.porcentajeCtasSinDobles ?? 0) >= 80 ? '10.0%' : (resGlobal.porcentajeCtasSinDobles ?? 0) >= 70 ? '8.0%' : '0.0%'} (${resGlobal.porcentajeCtasSinDobles ?? 0}% cumpl.)</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 0.5px dashed #e2e8f0;">
              <span style="font-weight: 700; color: #334155;">PORCENTAJE SALDOS VENCIDOS:</span>
              <span class="font-mono font-bold" style="color: #b91c1c;">${resGlobal.totalCartera > 0 ? (((resGlobal.totalVencido ?? 0) / resGlobal.totalCartera) * 100).toFixed(1) : 0}% ($${(resGlobal.totalVencido ?? 0).toLocaleString("es-MX")})</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span style="font-weight: 700; color: #334155;">VERIFICACIONES:</span>
              <span class="font-mono font-bold" style="color: #1e40af;">${datos.detalles?.filter(d => (d.problema || '').toUpperCase().includes('VD') || (d.problema || '').toUpperCase().includes('VERIF') || Boolean((d as any).vdStatus)).length || 0} ctas</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- FIRMAS DE AUTORIZACIÓN Y AUDITORÍA -->
    <div class="signatures-box">
      <div class="signature-col">
        <div class="signature-line"></div>
        <div style="font-weight: bold;">${datos.nombreGestor || "GESTOR DE COBRANZA"}</div>
        <div style="color: #64748b; font-size: 7.5px;">Gestor / Cobrador en Ruta</div>
      </div>
      <div class="signature-col">
        <div class="signature-line"></div>
        <div style="font-weight: bold;">SUPERVISOR DE COBRANZA</div>
        <div style="color: #64748b; font-size: 7.5px;">Auditoría y Revisión de Cartera</div>
      </div>
      <div class="signature-col">
        <div class="signature-line"></div>
        <div style="font-weight: bold;">GERENCIA CRÉDITO Y COBRANZA</div>
        <div style="color: #64748b; font-size: 7.5px;">Autorización y Cierre de Semana</div>
      </div>
    </div>

    <div style="margin-top: 8px; font-size: 7.5px; color: #64748b; display: flex; justify-content: space-between;">
      <div>Plantilla Lista Cobranza — Resumen de Corte • Grupo Mueblero DASO SA de CV</div>
      <div>Página 1 de 1</div>
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

export interface ClienteSinPagoItem {
  codigoCliente: string;
  numContrato?: string;
  nombreCompleto: string;
  domicilio?: string;
  gestor?: string;
  saldoVencido: number;
  pv: number;
  problema: string;
  pagoReal?: number;
  telefono?: string;
  periodicidad?: string;
  montoPago?: number;
  diaPago?: string;
  montoAdelantado?: number;
  cuotasAdelantadas?: number;
}

export interface DatosExportacionSinPago {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  clientes: ClienteSinPagoItem[];
}

/**
 * Genera el documento HTML para la Lista de Cobranza de Clientes Sin Pago
 * Incluye: CODIGO, NOMBRE, DOMICILIO, GESTOR, SALDO VENCIDO, PV, PROBLEMA y espacio para notas/firma.
 */
export function generarHTMLClientesSinPagoPDF(datos: DatosExportacionSinPago): string {
  // Ordenar clientes alfanuméricamente por código de cliente A-Z
  const clientesOrdenados = [...datos.clientes].sort((a, b) =>
    (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );

  const totalCuentas = clientesOrdenados.length;
  const totalSugerido = clientesOrdenados.reduce((acc, c) => acc + (c.montoPago || 0), 0);
  const totalVencido = clientesOrdenados.reduce((acc, c) => acc + (c.saldoVencido || 0), 0);
  const totalAdelantado = clientesOrdenados.reduce((acc, c) => acc + ((Number(c.saldoVencido) || 0) <= 0 ? (c.montoAdelantado || 0) : 0), 0);
  const ctasAdelantadas = clientesOrdenados.filter((c) => (Number(c.saldoVencido) || 0) <= 0 && (c.montoAdelantado || 0) > 0).length;

  // Dividir en páginas de aprox 24 clientes por página para impresión limpia
  const FILAS_POR_PAGINA = 24;
  const paginas: ClienteSinPagoItem[][] = [];
  for (let i = 0; i < clientesOrdenados.length; i += FILAS_POR_PAGINA) {
    paginas.push(clientesOrdenados.slice(i, i + FILAS_POR_PAGINA));
  }
  if (paginas.length === 0) {
    paginas.push([]);
  }

  const totalPaginas = paginas.length;

  const paginasHTML = paginas
    .map((grupo, pagIdx) => {
      const inicioIndex = pagIdx * FILAS_POR_PAGINA;
      const esUltimaPagina = pagIdx === totalPaginas - 1;

      return `
        <div class="page-container" style="${pagIdx > 0 ? 'page-break-before: always;' : ''}">
          <!-- ENCABEZADO INSTITUCIONAL -->
          <div class="header-box">
            <div>
              <div class="title-company">Grupo Mueblero DASO SA de CV</div>
              <div class="subtitle">Lista de Cobranza — Clientes Sin Pago (Cartera Pendiente de Recuperación)</div>
            </div>
            <div style="text-align: right; font-size: 8px; color: #475569;">
              <div>SISTEMA ERP MUEBLERÍA DASO</div>
              <div style="font-weight: bold; color: #0f172a;">FECHA: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>

          <!-- BARRA DE METADATOS -->
          <div class="info-bar">
            <div><span>SEMANA:</span> <strong>Semana ${datos.semana} (${datos.anio})</strong></div>
            <div><span>CICLO OFICIAL:</span> <strong>${datos.fechaInicioStr} al ${datos.fechaFinStr}</strong></div>
            <div><span>GESTOR / COBRADOR:</span> <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
            <div><span>TOTAL SIN PAGO:</span> <strong style="color: #b91c1c;">${totalCuentas} cuentas</strong></div>
            <div><span>PAGO SUG. TOTAL:</span> <strong style="color: #1d4ed8;">$${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>SALDO VENCIDO TOTAL:</span> <strong style="color: #b91c1c;">$${totalVencido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            ${ctasAdelantadas > 0 ? `<div><span>ADELANTADOS (AD):</span> <strong style="color: #047857;">${ctasAdelantadas} ctas (+$${totalAdelantado.toLocaleString("es-MX", { minimumFractionDigits: 2 })})</strong></div>` : ''}
          </div>

          <!-- TABLA DE CLIENTES SIN PAGO -->
          <table>
            <thead>
              <tr>
                <th style="width: 24px; text-align: center;">#</th>
                <th style="width: 75px; text-align: center;">CÓDIGO</th>
                <th style="width: 150px;">NOMBRE COMPLETO</th>
                <th>DOMICILIO</th>
                <th style="width: 55px; text-align: center;">GESTOR</th>
                <th style="width: 65px; text-align: center;">TELÉFONO</th>
                <th style="width: 65px; text-align: right;">PAGO SUG.</th>
                <th style="width: 70px; text-align: right;">SALDO VENCIDO</th>
                <th style="width: 28px; text-align: center;">PV</th>
                <th style="width: 60px; text-align: center;">PROBLEMA</th>
                <th style="width: 100px; text-align: center;">NOTAS DE RUTA / FIRMA</th>
              </tr>
            </thead>
            <tbody>
              ${grupo.length === 0 ? `
                <tr>
                  <td colspan="11" style="text-align: center; padding: 20px; font-weight: bold; color: #166534;">
                    ¡Excelente! No hay clientes con saldo pendiente sin abono en este filtro.
                  </td>
                </tr>
              ` : grupo.map((c, idx) => {
                const numFila = inicioIndex + idx + 1;
                const prob = (c.problema || "RUTA").toUpperCase().trim();
                let probColor = "#1e40af";
                let probBg = "#eff6ff";
                if (prob === "K" || prob === "DL") {
                  probColor = "#991b1b";
                  probBg = "#fee2e2";
                } else if (prob === "NC" || prob === "FD") {
                  probColor = "#9a3412";
                  probBg = "#ffedd5";
                } else if (prob === "PA") {
                  probColor = "#0e7490";
                  probBg = "#cffafe";
                } else if (prob === "PE") {
                  probColor = "#854d0e";
                  probBg = "#fef9c3";
                } else if (prob === "AD") {
                  probColor = "#047857";
                  probBg = "#d1fae5";
                }

                return `
                  <tr>
                    <td class="text-center font-mono" style="color: #64748b;">${numFila}</td>
                    <td class="text-center font-mono font-bold" style="white-space: nowrap;">
                      ${c.codigoCliente}
                      ${c.numContrato && c.numContrato !== "-" ? `<br/><span style="color: #64748b; font-size: 6.5px;">${c.numContrato}</span>` : ""}
                    </td>
                    <td class="font-bold" style="white-space: normal;">${c.nombreCompleto}</td>
                    <td style="font-size: 7px; color: #1e293b; line-height: 1.15;">${c.domicilio || "-"}</td>
                    <td class="text-center font-mono font-bold" style="font-size: 7px; color: #334155;">${c.gestor || "-"}</td>
                    <td class="text-center font-mono" style="font-size: 7px;">${c.telefono || "-"}</td>
                    <td class="text-right font-mono font-bold" style="color: #1d4ed8;">$${Number(c.montoPago || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-right font-mono font-bold" style="color: #b91c1c;">$${Number(c.saldoVencido || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-center font-bold">
                      <span style="display: inline-block; padding: 1px 4px; border-radius: 2px; font-size: 7.5px; ${c.pv > 0 ? 'background: #fee2e2; color: #991b1b;' : 'background: #f1f5f9; color: #475569;'}">${c.pv}</span>
                    </td>
                    <td class="text-center font-bold">
                      <span style="display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-size: 7.5px; background: ${probBg}; color: ${probColor}; border: 0.5px solid ${probColor}40;">${prob}</span>
                      ${(Number(c.saldoVencido) || 0) <= 0 && (c.montoAdelantado || 0) > 0 ? `<br/><span style="color: #047857; font-size: 6.5px; font-weight: bold; white-space: nowrap;">+$${Number(c.montoAdelantado).toLocaleString("es-MX")} (${c.cuotasAdelantadas || 0}s)</span>` : ''}
                    </td>
                    <td style="border-bottom: 0.5px solid #cbd5e1; height: 18px;">
                      <div style="width: 100%; height: 12px; border-bottom: 0.5px dotted #94a3b8;"></div>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
            ${esUltimaPagina ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                  <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 7.5px; padding: 3px 6px;">
                    TOTAL CARTERA SIN PAGO (${totalCuentas} CUENTAS)
                  </td>
                  <td class="text-right font-mono font-black" style="color: #1d4ed8; font-size: 8px;">
                    $${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-black" style="color: #b91c1c; font-size: 8px;">
                    $${totalVencido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td colspan="3">-</td>
                </tr>
              </tfoot>
            ` : ""}
          </table>

          ${esUltimaPagina ? `
            <!-- FIRMAS DE AUTORIZACIÓN Y AUDITORÍA -->
            <div class="signatures-box" style="margin-top: 14px;">
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">${datos.nombreGestor || "GESTOR DE COBRANZA"}</div>
                <div style="color: #64748b; font-size: 7px;">Gestor / Cobrador en Ruta</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">SUPERVISOR DE COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Auditoría y Validación de Visitas</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">GERENCIA CRÉDITO Y COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Supervisión Cartera Sin Pago</div>
              </div>
            </div>
          ` : ""}

          <div style="margin-top: 8px; font-size: 7px; color: #64748b; display: flex; justify-content: space-between;">
            <div>Lista de Cobranza — Clientes Sin Pago • Grupo Mueblero DASO SA de CV</div>
            <div>Página ${pagIdx + 1} de ${totalPaginas}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>LISTA DE COBRANZA - CLIENTES SIN PAGO - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page { size: letter landscape; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 7.5px; color: #0f172a; margin: 0; padding: 0; background: #fff; line-height: 1.25; }
    .header-box { margin-bottom: 6px; border-bottom: 2px solid #0f172a; padding-bottom: 3px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title-company { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; margin: 0; }
    .subtitle { font-size: 9.5px; font-weight: 700; color: #b91c1c; margin: 2px 0 0 0; }
    .info-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 8px; font-weight: bold; background: #f8fafc; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 6px; }
    .info-bar span { color: #64748b; font-weight: 600; }
    .info-bar strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th { background: #0f172a; color: #fff; font-size: 7px; font-weight: 700; padding: 3px 4px; border: 0.5px solid #334155; text-transform: uppercase; }
    td { font-size: 7px; padding: 2px 4px; border: 0.5px solid #cbd5e1; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .signatures-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 10px; padding: 4px 10px; }
    .signature-col { text-align: center; font-size: 7.5px; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 4px; width: 80%; margin-left: auto; margin-right: auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { size: letter landscape; margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 8px 14px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-radius: 4px;">
    <div style="font-size: 11px;">
      <strong>Lista de Cobranza — Clientes Sin Pago</strong> • Semana ${datos.semana} (${datos.codigoGestor}) • <strong>${totalCuentas} cuentas</strong>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #dc2626; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer;">🖨️ Imprimir Lista Sin Pago</button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cerrar</button>
    </div>
  </div>

  ${paginasHTML}
</body>
</html>`;
}

/**
 * Genera ventana o Blob URL para imprimir la Lista de Clientes Sin Pago
 */
export function imprimirPDFClientesSinPago(datos: DatosExportacionSinPago): { html: string; blobUrl: string } {
  const html = generarHTMLClientesSinPagoPDF(datos);
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

export interface ClienteSiPagoItem {
  codigoCliente: string;
  numContrato?: string;
  nombreCompleto: string;
  domicilio?: string;
  telefono?: string;
  gestor?: string;
  periodicidad?: string;
  pagoSugerido: number;
  pagoReal: number;
  moratorio: number;
  totalRecaudado: number;
  tipoCobro?: string;
  canalCobro?: string;
  fechaPago?: string | null;
  diaPago?: string;
  problema: string;
  pagoDoble?: number;
  recuperadoPv?: number;
}

export interface DatosExportacionSiPago {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  clientes: ClienteSiPagoItem[];
}

/**
 * Genera el documento HTML para la Lista de Cobranza de Clientes Sí Pago (Abonos Recibidos)
 */
export function generarHTMLClientesSiPagoPDF(datos: DatosExportacionSiPago): string {
  const clientesOrdenados = [...datos.clientes].sort((a, b) =>
    (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );

  const totalCuentas = clientesOrdenados.length;
  const totalSugerido = clientesOrdenados.reduce((acc, c) => acc + (c.pagoSugerido || 0), 0);
  const totalCobradoAbonos = clientesOrdenados.reduce((acc, c) => acc + (c.pagoReal || 0), 0);
  const totalMoratorio = clientesOrdenados.reduce((acc, c) => acc + (c.moratorio || 0), 0);
  const totalRecaudado = totalCobradoAbonos + totalMoratorio;

  const FILAS_POR_PAGINA = 24;
  const paginas: ClienteSiPagoItem[][] = [];
  for (let i = 0; i < clientesOrdenados.length; i += FILAS_POR_PAGINA) {
    paginas.push(clientesOrdenados.slice(i, i + FILAS_POR_PAGINA));
  }
  if (paginas.length === 0) paginas.push([]);

  const totalPaginas = paginas.length;

  const paginasHTML = paginas
    .map((grupo, pagIdx) => {
      const inicioIndex = pagIdx * FILAS_POR_PAGINA;
      const esUltimaPagina = pagIdx === totalPaginas - 1;

      return `
        <div class="page-container" style="${pagIdx > 0 ? 'page-break-before: always;' : ''}">
          <!-- ENCABEZADO INSTITUCIONAL -->
          <div class="header-box">
            <div>
              <div class="title-company">Grupo Mueblero DASO SA de CV</div>
              <div class="subtitle" style="color: #065f46;">Lista de Cobranza — Clientes Sí Pago (Abonos Recibidos en Semana)</div>
            </div>
            <div style="text-align: right; font-size: 8px; color: #475569;">
              <div>SISTEMA ERP MUEBLERÍA DASO</div>
              <div style="font-weight: bold; color: #0f172a;">FECHA: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>

          <!-- BARRA DE METADATOS -->
          <div class="info-bar">
            <div><span>SEMANA:</span> <strong>Semana ${datos.semana} (${datos.anio})</strong></div>
            <div><span>CICLO OFICIAL:</span> <strong>${datos.fechaInicioStr} al ${datos.fechaFinStr}</strong></div>
            <div><span>GESTOR / COBRADOR:</span> <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
            <div><span>CUENTAS QUE PAGARON:</span> <strong style="color: #065f46;">${totalCuentas} cuentas</strong></div>
            <div><span>PAGO SUGERIDO:</span> <strong style="color: #1d4ed8;">$${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>ABONOS COBRADOS:</span> <strong style="color: #065f46;">$${totalCobradoAbonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            ${totalMoratorio > 0 ? `<div><span>MORATORIOS:</span> <strong style="color: #854d0e;">$${totalMoratorio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>` : ''}
            <div><span>TOTAL RECAUDADO:</span> <strong style="color: #047857; font-size: 9px;">$${totalRecaudado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
          </div>

          <!-- TABLA DE CLIENTES CON PAGO -->
          <table>
            <thead>
              <tr>
                <th style="width: 22px; text-align: center;">#</th>
                <th style="width: 70px; text-align: center;">CÓDIGO</th>
                <th style="width: 140px;">NOMBRE COMPLETO</th>
                <th>DOMICILIO</th>
                <th style="width: 50px; text-align: center;">GESTOR</th>
                <th style="width: 60px; text-align: center;">TELÉFONO</th>
                <th style="width: 55px; text-align: right;">PAGO SUG.</th>
                <th style="width: 60px; text-align: right; background: #064e3b;">ABONO ($)</th>
                <th style="width: 50px; text-align: right; background: #78350f;">MORA ($)</th>
                <th style="width: 65px; text-align: right; background: #065f46;">TOTAL ($)</th>
                <th style="width: 65px; text-align: center;">CANAL / TIPO</th>
                <th style="width: 60px; text-align: center;">FECHA / DÍA</th>
                <th style="width: 50px; text-align: center;">PROBLEMA</th>
              </tr>
            </thead>
            <tbody>
              ${grupo.length === 0 ? `
                <tr>
                  <td colspan="13" style="text-align: center; padding: 20px; font-weight: bold; color: #64748b;">
                    No hay clientes con abono registrado en este filtro.
                  </td>
                </tr>
              ` : grupo.map((c, idx) => {
                const numFila = inicioIndex + idx + 1;
                const prob = (c.problema || "RUTA").toUpperCase().trim();
                return `
                  <tr>
                    <td class="text-center font-mono" style="color: #64748b;">${numFila}</td>
                    <td class="text-center font-mono font-bold" style="white-space: nowrap;">
                      ${c.codigoCliente}
                      ${c.numContrato && c.numContrato !== "-" ? `<br/><span style="color: #64748b; font-size: 6.5px;">${c.numContrato}</span>` : ""}
                    </td>
                    <td class="font-bold" style="white-space: normal;">${c.nombreCompleto}</td>
                    <td style="font-size: 7px; color: #1e293b; line-height: 1.15;">${c.domicilio || "-"}</td>
                    <td class="text-center font-mono font-bold" style="font-size: 7px; color: #334155;">${c.gestor || "-"}</td>
                    <td class="text-center font-mono" style="font-size: 7px;">${c.telefono || "-"}</td>
                    <td class="text-right font-mono" style="color: #1d4ed8;">$${Number(c.pagoSugerido || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-right font-mono font-bold" style="color: #065f46; background: #ecfdf5;">$${Number(c.pagoReal || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-right font-mono font-bold" style="color: #854d0e; background: #fefce8;">$${Number(c.moratorio || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-right font-mono font-black" style="color: #064e3b; background: #d1fae5;">$${Number(c.totalRecaudado || ((c.pagoReal || 0) + (c.moratorio || 0))).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-center font-bold" style="font-size: 6.5px;">
                      <span style="display: inline-block; padding: 1px 3px; border-radius: 2px; ${c.tipoCobro === 'BANCOS' || c.canalCobro?.includes('BANCO') ? 'background: #eff6ff; color: #1d4ed8;' : 'background: #f0fdf4; color: #166534;'}">
                        ${c.tipoCobro || c.canalCobro || "EFECTIVO"}
                      </span>
                    </td>
                    <td class="text-center font-mono" style="font-size: 6.5px;">
                      ${c.fechaPago ? new Date(c.fechaPago).toLocaleDateString("es-MX") : (c.diaPago || "-")}
                    </td>
                    <td class="text-center font-bold">
                      <span style="display: inline-block; padding: 1px 4px; border-radius: 2px; font-size: 7px; background: #f1f5f9; color: #334155;">${prob}</span>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
            ${esUltimaPagina ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                  <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 7.5px; padding: 3px 6px;">
                    TOTAL CLIENTES SÍ PAGO (${totalCuentas} CUENTAS)
                  </td>
                  <td class="text-right font-mono font-bold" style="color: #1d4ed8; font-size: 7.5px;">
                    $${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-black" style="color: #065f46; font-size: 8px; background: #ecfdf5;">
                    $${totalCobradoAbonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-bold" style="color: #854d0e; font-size: 7.5px; background: #fefce8;">
                    $${totalMoratorio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-black" style="color: #064e3b; font-size: 8.5px; background: #d1fae5;">
                    $${totalRecaudado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td colspan="3">-</td>
                </tr>
              </tfoot>
            ` : ""}
          </table>

          ${esUltimaPagina ? `
            <!-- FIRMAS DE AUTORIZACIÓN Y AUDITORÍA -->
            <div class="signatures-box" style="margin-top: 14px;">
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">${datos.nombreGestor || "GESTOR DE COBRANZA"}</div>
                <div style="color: #64748b; font-size: 7px;">Gestor / Cobrador en Ruta</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">SUPERVISOR DE COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Auditoría y Arqueo de Cobranza</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">GERENCIA CRÉDITO Y COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Validación de Ingresos Semanales</div>
              </div>
            </div>
          ` : ""}

          <div style="margin-top: 8px; font-size: 7px; color: #64748b; display: flex; justify-content: space-between;">
            <div>Lista de Cobranza — Clientes Sí Pago • Grupo Mueblero DASO SA de CV</div>
            <div>Página ${pagIdx + 1} de ${totalPaginas}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>LISTA DE COBRANZA - CLIENTES SÍ PAGO - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page { size: letter landscape; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 7.5px; color: #0f172a; margin: 0; padding: 0; background: #fff; line-height: 1.25; }
    .header-box { margin-bottom: 6px; border-bottom: 2px solid #0f172a; padding-bottom: 3px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title-company { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; margin: 0; }
    .subtitle { font-size: 9.5px; font-weight: 700; color: #065f46; margin: 2px 0 0 0; }
    .info-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 8px; font-weight: bold; background: #f8fafc; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 6px; }
    .info-bar span { color: #64748b; font-weight: 600; }
    .info-bar strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th { background: #0f172a; color: #fff; font-size: 7px; font-weight: 700; padding: 3px 4px; border: 0.5px solid #334155; text-transform: uppercase; }
    td { font-size: 7px; padding: 2px 4px; border: 0.5px solid #cbd5e1; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .signatures-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 10px; padding: 4px 10px; }
    .signature-col { text-align: center; font-size: 7.5px; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 4px; width: 80%; margin-left: auto; margin-right: auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { size: letter landscape; margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 8px 14px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-radius: 4px;">
    <div style="font-size: 11px;">
      <strong>Lista de Cobranza — Clientes Sí Pago</strong> • Semana ${datos.semana} (${datos.codigoGestor}) • <strong>${totalCuentas} cuentas</strong> • Recaudado: <strong>$${totalRecaudado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer;">🖨️ Imprimir Lista Sí Pago</button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cerrar</button>
    </div>
  </div>

  ${paginasHTML}
</body>
</html>`;
}

/**
 * Genera ventana o Blob URL para imprimir la Lista de Clientes Sí Pago
 */
export function imprimirPDFClientesSiPago(datos: DatosExportacionSiPago): { html: string; blobUrl: string } {
  const html = generarHTMLClientesSiPagoPDF(datos);
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

export interface DatosExportacionCarteraPDF {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  clientes: DetalleCalculadoCEJ[];
}

/**
 * Genera el documento HTML para la Cartera Completa en Ruta
 */
export function generarHTMLCarteraEnRutaPDF(datos: DatosExportacionCarteraPDF): string {
  const clientesOrdenados = [...datos.clientes].sort((a, b) =>
    (a.codigoCliente || "").localeCompare(b.codigoCliente || "", undefined, {
      numeric: true,
      sensitivity: "base"
    })
  );

  const totalCuentas = clientesOrdenados.length;
  const totalSugerido = clientesOrdenados.reduce((acc, c) => acc + (c.pagoSugerido || 0), 0);
  const totalVencido = clientesOrdenados.reduce((acc, c) => acc + (c.saldoVencido || 0), 0);
  const totalSaldoActual = clientesOrdenados.reduce((acc, c) => acc + (c.saldoActual || 0), 0);
  const totalCobradoAbonos = clientesOrdenados.reduce((acc, c) => acc + (c.pagoReal || 0), 0);
  const totalMoratorio = clientesOrdenados.reduce((acc, c) => acc + (c.moratorio || 0), 0);
  const totalRecaudado = totalCobradoAbonos + totalMoratorio;

  const FILAS_POR_PAGINA = 24;
  const paginas: DetalleCalculadoCEJ[][] = [];
  for (let i = 0; i < clientesOrdenados.length; i += FILAS_POR_PAGINA) {
    paginas.push(clientesOrdenados.slice(i, i + FILAS_POR_PAGINA));
  }
  if (paginas.length === 0) paginas.push([]);

  const totalPaginas = paginas.length;

  const paginasHTML = paginas
    .map((grupo, pagIdx) => {
      const inicioIndex = pagIdx * FILAS_POR_PAGINA;
      const esUltimaPagina = pagIdx === totalPaginas - 1;

      return `
        <div class="page-container" style="${pagIdx > 0 ? 'page-break-before: always;' : ''}">
          <!-- ENCABEZADO INSTITUCIONAL -->
          <div class="header-box">
            <div>
              <div class="title-company">Grupo Mueblero DASO SA de CV</div>
              <div class="subtitle" style="color: #1e3a8a;">Lista de Cobranza — Cartera en Ruta (Formato Oficial CEJ)</div>
            </div>
            <div style="text-align: right; font-size: 8px; color: #475569;">
              <div>SISTEMA ERP MUEBLERÍA DASO</div>
              <div style="font-weight: bold; color: #0f172a;">FECHA: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>

          <!-- BARRA DE METADATOS -->
          <div class="info-bar">
            <div><span>SEMANA:</span> <strong>Semana ${datos.semana} (${datos.anio})</strong></div>
            <div><span>CICLO OFICIAL:</span> <strong>${datos.fechaInicioStr} al ${datos.fechaFinStr}</strong></div>
            <div><span>GESTOR / COBRADOR:</span> <strong>${datos.codigoGestor} - ${datos.nombreGestor}</strong></div>
            <div><span>TOTAL CARTERA:</span> <strong style="color: #0f172a;">${totalCuentas} cuentas</strong></div>
            <div><span>PAGO SUGERIDO:</span> <strong style="color: #1d4ed8;">$${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>SALDO VENCIDO:</span> <strong style="color: #b91c1c;">$${totalVencido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>SALDO ACTUAL:</span> <strong>$${totalSaldoActual.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
            <div><span>TOTAL COBRADO:</span> <strong style="color: #065f46;">$${totalRecaudado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong></div>
          </div>

          <!-- TABLA DE CARTERA EN RUTA -->
          <table>
            <thead>
              <tr>
                <th style="width: 22px; text-align: center;">#</th>
                <th style="width: 65px; text-align: center;">CÓDIGO</th>
                <th style="width: 50px; text-align: center;">CONTRATO</th>
                <th style="width: 140px;">CLIENTE</th>
                <th style="width: 45px; text-align: center;">PERIODO</th>
                <th style="width: 55px; text-align: right;">PAGO SUG.</th>
                <th style="width: 60px; text-align: right;">SALDO VENC.</th>
                <th style="width: 24px; text-align: center;">PV</th>
                <th style="width: 60px; text-align: right;">SALDO ACT.</th>
                <th style="width: 45px; text-align: center;">GESTOR</th>
                <th style="width: 45px; text-align: right;">MORA ($)</th>
                <th style="width: 55px; text-align: right; background: #064e3b;">PAGO REAL</th>
                <th style="width: 50px; text-align: center;">DÍA PAGO</th>
                <th style="width: 60px; text-align: center;">TELÉFONO</th>
                <th style="width: 50px; text-align: center;">PROBLEMA</th>
              </tr>
            </thead>
            <tbody>
              ${grupo.length === 0 ? `
                <tr>
                  <td colspan="15" style="text-align: center; padding: 20px; font-weight: bold; color: #64748b;">
                    No hay cuentas en esta ruta.
                  </td>
                </tr>
              ` : grupo.map((c, idx) => {
                const numFila = inicioIndex + idx + 1;
                const prob = (c.problema || "RUTA").toUpperCase().trim();
                return `
                  <tr>
                    <td class="text-center font-mono" style="color: #64748b;">${numFila}</td>
                    <td class="text-center font-mono font-bold" style="white-space: nowrap;">${c.codigoCliente}</td>
                    <td class="text-center font-mono" style="font-size: 7px; color: #64748b;">${c.numContrato || "-"}</td>
                    <td class="font-bold" style="white-space: normal;">${c.nombreCliente}</td>
                    <td class="text-center font-bold" style="font-size: 6.5px;">${c.periodicidad || "-"}</td>
                    <td class="text-right font-mono" style="color: #1d4ed8;">$${Number(c.pagoSugerido || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-right font-mono" style="color: #b91c1c;">$${Number(c.saldoVencido || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-center font-bold" style="font-size: 7px;">${c.pv || 0}</td>
                    <td class="text-right font-mono font-bold">$${Number(c.saldoActual || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-center font-mono" style="font-size: 7px;">${c.gestor || datos.codigoGestor}</td>
                    <td class="text-right font-mono font-bold" style="color: #854d0e;">${Number(c.moratorio || 0) > 0 ? `$${Number(c.moratorio).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "-"}</td>
                    <td class="text-right font-mono font-black" style="color: #065f46; background: ${Number(c.pagoReal || 0) > 0 ? '#ecfdf5' : 'transparent'};">
                      ${Number(c.pagoReal || 0) > 0 ? `$${Number(c.pagoReal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "-"}
                    </td>
                    <td class="text-center font-mono" style="font-size: 6.5px;">${c.diaPago || "-"}</td>
                    <td class="text-center font-mono" style="font-size: 6.5px;">${c.telefono || "-"}</td>
                    <td class="text-center font-bold">
                      <span style="display: inline-block; padding: 1px 4px; border-radius: 2px; font-size: 7px; background: ${prob === 'AD' ? '#d1fae5' : '#f1f5f9'}; color: ${prob === 'AD' ? '#047857' : '#334155'}; font-weight: 800;">${prob}</span>
                      ${(Number(c.saldoVencido) || 0) <= 0 && (c.montoAdelantado || 0) > 0 ? `<br/><span style="color: #047857; font-size: 6px; font-weight: bold; white-space: nowrap;">+$${Number(c.montoAdelantado).toLocaleString("es-MX")}</span>` : ''}
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
            ${esUltimaPagina ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold; border-top: 1.5px solid #0f172a;">
                  <td colspan="5" style="text-align: right; text-transform: uppercase; font-size: 7.5px; padding: 3px 6px;">
                    TOTALES CARTERA EN RUTA (${totalCuentas} CUENTAS)
                  </td>
                  <td class="text-right font-mono font-bold" style="color: #1d4ed8; font-size: 7.5px;">
                    $${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-bold" style="color: #b91c1c; font-size: 7.5px;">
                    $${totalVencido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-center">-</td>
                  <td class="text-right font-mono font-bold" style="font-size: 7.5px;">
                    $${totalSaldoActual.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-center">-</td>
                  <td class="text-right font-mono font-bold" style="color: #854d0e; font-size: 7.5px;">
                    $${totalMoratorio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td class="text-right font-mono font-black" style="color: #065f46; font-size: 8px; background: #ecfdf5;">
                    $${totalCobradoAbonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td colspan="3">-</td>
                </tr>
              </tfoot>
            ` : ""}
          </table>

          ${esUltimaPagina ? `
            <!-- FIRMAS DE AUTORIZACIÓN Y AUDITORÍA -->
            <div class="signatures-box" style="margin-top: 14px;">
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">${datos.nombreGestor || "GESTOR DE COBRANZA"}</div>
                <div style="color: #64748b; font-size: 7px;">Gestor / Cobrador en Ruta</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">SUPERVISOR DE COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Auditoría y Validación de Cartera</div>
              </div>
              <div class="signature-col">
                <div class="signature-line"></div>
                <div style="font-weight: bold;">GERENCIA CRÉDITO Y COBRANZA</div>
                <div style="color: #64748b; font-size: 7px;">Autorización y Cierre de Semana</div>
              </div>
            </div>
          ` : ""}

          <div style="margin-top: 8px; font-size: 7px; color: #64748b; display: flex; justify-content: space-between;">
            <div>Lista de Cobranza — Cartera en Ruta • Grupo Mueblero DASO SA de CV</div>
            <div>Página ${pagIdx + 1} de ${totalPaginas}</div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>LISTA DE COBRANZA - CARTERA EN RUTA - ${datos.codigoGestor} - Semana ${datos.semana}</title>
  <style>
    @page { size: letter landscape; margin: 8mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 7.5px; color: #0f172a; margin: 0; padding: 0; background: #fff; line-height: 1.25; }
    .header-box { margin-bottom: 6px; border-bottom: 2px solid #0f172a; padding-bottom: 3px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title-company { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; margin: 0; }
    .subtitle { font-size: 9.5px; font-weight: 700; color: #1e3a8a; margin: 2px 0 0 0; }
    .info-bar { display: flex; flex-wrap: wrap; gap: 12px; font-size: 8px; font-weight: bold; background: #f8fafc; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 6px; }
    .info-bar span { color: #64748b; font-weight: 600; }
    .info-bar strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th { background: #0f172a; color: #fff; font-size: 7px; font-weight: 700; padding: 3px 4px; border: 0.5px solid #334155; text-transform: uppercase; }
    td { font-size: 7px; padding: 2px 4px; border: 0.5px solid #cbd5e1; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .signatures-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 10px; padding: 4px 10px; }
    .signature-col { text-align: center; font-size: 7.5px; }
    .signature-line { border-top: 1px solid #334155; margin-bottom: 4px; width: 80%; margin-left: auto; margin-right: auto; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { size: letter landscape; margin: 6mm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 8px 14px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-radius: 4px;">
    <div style="font-size: 11px;">
      <strong>Lista de Cobranza — Cartera en Ruta</strong> • Semana ${datos.semana} (${datos.codigoGestor}) • <strong>${totalCuentas} cuentas</strong> • Ppto: <strong>$${totalSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</strong>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px; cursor: pointer;">🖨️ Imprimir Cartera en Ruta</button>
      <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">Cerrar</button>
    </div>
  </div>

  ${paginasHTML}
</body>
</html>`;
}

/**
 * Genera ventana o Blob URL para imprimir la Cartera en Ruta
 */
export function imprimirPDFCarteraEnRuta(datos: DatosExportacionCarteraPDF): { html: string; blobUrl: string } {
  const html = generarHTMLCarteraEnRutaPDF(datos);
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

export interface DatosExportacionCarteraExcel {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  filtroEmpresa?: string;
  clientes: Array<{
    codigoCliente: string;
    numContrato?: string;
    periodoInicial?: string;
    nombreCompleto?: string;
    nombreCliente?: string;
    domicilio?: string;
    periodicidad?: string;
    montoPago?: number;
    pagoSugerido?: number;
    saldoVencido?: number;
    pv?: number;
    saldoActual?: number;
    gestor?: string;
    sup?: number;
    moratorio?: number;
    problema?: string;
    montoAdelantado?: number;
    cuotasAdelantadas?: number;
    pagoReal?: number;
    pagoDoble?: number;
    recuperadoPv?: number;
    comisionAnalista?: number;
    diaPago?: string;
    telefono?: string;
  }>;
}

/**
 * Descarga archivo Excel individual para Cartera en Ruta
 */
export function descargarExcelCarteraEnRuta(datos: DatosExportacionCarteraExcel) {
  const wb = XLSX.utils.book_new();

  const filtroTexto = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? ` • Filtro: ${datos.filtroEmpresa}` : "";
  const filas: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["LISTA DE COBRANZA — RUTA DETALLADA DE CARTERA (FORMATO OFICIAL CEJ)"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}${filtroTexto} • Total: ${datos.clientes.length} cuentas`],
    [],
    [
      "#",
      "CODIGO",
      "CONTRATO",
      "INICIAL",
      "CLIENTE",
      "DOMICILIO",
      "PERIODO",
      "PAGO SUG.",
      "VENCIDO",
      "PV",
      "SALDO ACT.",
      "GESTOR",
      "SUP",
      "MORATORIO",
      "PROBLEMA",
      "ADELANTADO ($)",
      "SEM ADELANTADAS",
      "PAGO REAL",
      "P. DOBLE",
      "RECU PV",
      "COMISIÓN",
      "DIA PAGO",
      "TELÉFONO"
    ],
    ...datos.clientes.map((c, idx) => [
      idx + 1,
      c.codigoCliente,
      c.numContrato || "-",
      c.periodoInicial || "-",
      c.nombreCompleto || c.nombreCliente || "-",
      c.domicilio || "-",
      c.periodicidad || "-",
      Number(c.montoPago ?? c.pagoSugerido ?? 0),
      Number(c.saldoVencido ?? 0),
      Number(c.pv ?? 0),
      Number(c.saldoActual ?? 0),
      c.gestor || datos.codigoGestor,
      Number(c.sup ?? 0),
      Number(c.moratorio ?? 0),
      c.problema || "RUTA",
      Number(c.montoAdelantado ?? 0),
      Number(c.cuotasAdelantadas ?? 0),
      Number(c.pagoReal ?? 0),
      Number(c.pagoDoble ?? 0),
      Number(c.recuperadoPv ?? 0),
      Number(c.comisionAnalista ?? 0),
      c.diaPago || "-",
      c.telefono || "-"
    ]),
    [],
    [
      "TOTALES",
      `${datos.clientes.length} cuentas`,
      "",
      "",
      "",
      "",
      "",
      datos.clientes.reduce((a, b) => a + Number(b.montoPago ?? b.pagoSugerido ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.saldoVencido ?? 0), 0),
      "",
      datos.clientes.reduce((a, b) => a + Number(b.saldoActual ?? 0), 0),
      "",
      "",
      datos.clientes.reduce((a, b) => a + Number(b.moratorio ?? 0), 0),
      "",
      datos.clientes.reduce((a, b) => a + Number(b.montoAdelantado ?? 0), 0),
      "",
      datos.clientes.reduce((a, b) => a + Number(b.pagoReal ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.pagoDoble ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.recuperadoPv ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.comisionAnalista ?? 0), 0),
      "",
      ""
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 30 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "CARTERA EN RUTA");

  const gestorClean = (datos.codigoGestor || datos.nombreGestor || "GESTOR").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filtroSuffix = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? `-${datos.filtroEmpresa}` : "";
  const filename = `CARTERA-EN-RUTA-${gestorClean}-Semana${datos.semana}-${datos.anio}${filtroSuffix}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface DatosExportacionSiPagoExcel {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  filtroEmpresa?: string;
  clientes: Array<{
    codigoCliente: string;
    numContrato?: string;
    nombreCompleto?: string;
    nombreCliente?: string;
    domicilio?: string;
    telefono?: string;
    gestor?: string;
    periodicidad?: string;
    pagoSugerido?: number;
    montoPago?: number;
    pagoReal: number;
    moratorio?: number;
    totalRecaudado?: number;
    tipoCobro?: string;
    canalCobro?: string;
    diaPago?: string;
    fechaPago?: string | null;
    problema?: string;
    pagoDoble?: number;
    recuperadoPv?: number;
  }>;
}

/**
 * Descarga archivo Excel individual para Clientes Sí Pago
 */
export function descargarExcelClientesSiPago(datos: DatosExportacionSiPagoExcel) {
  const wb = XLSX.utils.book_new();

  const filtroTexto = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? ` • Filtro: ${datos.filtroEmpresa}` : "";
  const filas: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["LISTA DE COBRANZA — CLIENTES CON PAGO (ABONOS RECIBIDOS)"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}${filtroTexto} • Total: ${datos.clientes.length} cuentas`],
    [],
    [
      "#",
      "CODIGO",
      "CONTRATO",
      "NOMBRE CLIENTE",
      "DOMICILIO",
      "TELÉFONO",
      "GESTOR",
      "PERIODICIDAD",
      "PAGO SUGERIDO",
      "PAGO REAL (ABONO)",
      "MORATORIO",
      "TOTAL RECAUDADO",
      "TIPO / CANAL",
      "DIA PAGO",
      "FECHA PAGO",
      "PROBLEMA"
    ],
    ...datos.clientes.map((c, idx) => [
      idx + 1,
      c.codigoCliente,
      c.numContrato || "-",
      c.nombreCompleto || c.nombreCliente || "-",
      c.domicilio || "-",
      c.telefono || "-",
      c.gestor || datos.codigoGestor,
      c.periodicidad || "-",
      Number(c.pagoSugerido ?? c.montoPago ?? 0),
      Number(c.pagoReal ?? 0),
      Number(c.moratorio ?? 0),
      Number((c.pagoReal ?? 0) + (c.moratorio ?? 0)),
      c.tipoCobro || c.canalCobro || "EFECTIVO",
      c.diaPago || "-",
      c.fechaPago ? (typeof c.fechaPago === 'string' && c.fechaPago.includes('T') ? new Date(c.fechaPago).toLocaleDateString("es-MX") : c.fechaPago) : "-",
      c.problema || "RUTA"
    ]),
    [],
    [
      "TOTALES",
      `${datos.clientes.length} cuentas`,
      "",
      "",
      "",
      "",
      "",
      "",
      datos.clientes.reduce((a, b) => a + Number(b.pagoSugerido ?? b.montoPago ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.pagoReal ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.moratorio ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.pagoReal ?? 0) + Number(b.moratorio ?? 0), 0),
      "",
      "",
      "",
      ""
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 30 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "CLIENTES SÍ PAGO");

  const gestorClean = (datos.codigoGestor || datos.nombreGestor || "GESTOR").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filtroSuffix = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? `-${datos.filtroEmpresa}` : "";
  const filename = `CLIENTES-SI-PAGO-${gestorClean}-Semana${datos.semana}-${datos.anio}${filtroSuffix}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface DatosExportacionSinPagoExcel {
  anio: number;
  semana: number;
  fechaInicioStr: string;
  fechaFinStr: string;
  nombreGestor: string;
  codigoGestor: string;
  filtroEmpresa?: string;
  clientes: Array<{
    codigoCliente: string;
    numContrato?: string;
    nombreCompleto?: string;
    nombreCliente?: string;
    domicilio?: string;
    gestor?: string;
    saldoVencido?: number;
    pv?: number;
    saldoActual?: number;
    problema?: string;
    pagoReal?: number;
    telefono?: string;
    periodicidad?: string;
    montoPago?: number;
    pagoSugerido?: number;
    diaPago?: string;
    montoAdelantado?: number;
    cuotasAdelantadas?: number;
  }>;
}

/**
 * Descarga archivo Excel individual para Clientes Sin Pago
 */
export function descargarExcelClientesSinPago(datos: DatosExportacionSinPagoExcel) {
  const wb = XLSX.utils.book_new();

  const filtroTexto = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? ` • Filtro: ${datos.filtroEmpresa}` : "";
  const filas: any[][] = [
    ["GRUPO MUEBLERO DASO SA DE CV"],
    ["LISTA DE COBRANZA — CLIENTES SIN PAGO (CARTERA PENDIENTE)"],
    [`Semana ${datos.semana} (${datos.anio}) • Ciclo: ${datos.fechaInicioStr} al ${datos.fechaFinStr} • Cobrador: ${datos.codigoGestor} - ${datos.nombreGestor}${filtroTexto} • Total: ${datos.clientes.length} cuentas`],
    [],
    [
      "#",
      "CODIGO",
      "CONTRATO",
      "NOMBRE CLIENTE",
      "DOMICILIO",
      "TELÉFONO",
      "GESTOR",
      "PERIODICIDAD",
      "PAGO SUGERIDO",
      "SALDO VENCIDO",
      "PV",
      "SALDO ACTUAL",
      "PROBLEMA",
      "MONTO ADELANTADO",
      "SEMANAS ADELANTADAS",
      "DIA PAGO"
    ],
    ...datos.clientes.map((c, idx) => [
      idx + 1,
      c.codigoCliente,
      c.numContrato || "-",
      c.nombreCompleto || c.nombreCliente || "-",
      c.domicilio || "-",
      c.telefono || "-",
      c.gestor || datos.codigoGestor,
      c.periodicidad || "-",
      Number(c.pagoSugerido ?? c.montoPago ?? 0),
      Number(c.saldoVencido ?? 0),
      Number(c.pv ?? 0),
      Number(c.saldoActual ?? 0),
      c.problema || "RUTA",
      Number((Number(c.saldoVencido) || 0) <= 0 ? (c.montoAdelantado || 0) : 0),
      Number((Number(c.saldoVencido) || 0) <= 0 ? (c.cuotasAdelantadas || 0) : 0),
      c.diaPago || "-"
    ]),
    [],
    [
      "TOTALES",
      `${datos.clientes.length} cuentas`,
      "",
      "",
      "",
      "",
      "",
      "",
      datos.clientes.reduce((a, b) => a + Number(b.pagoSugerido ?? b.montoPago ?? 0), 0),
      datos.clientes.reduce((a, b) => a + Number(b.saldoVencido ?? 0), 0),
      "",
      datos.clientes.reduce((a, b) => a + Number(b.saldoActual ?? 0), 0),
      "",
      datos.clientes.reduce((a, b) => a + Number((Number(b.saldoVencido) || 0) <= 0 ? (b.montoAdelantado || 0) : 0), 0),
      "",
      ""
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 30 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "CLIENTES SIN PAGO");

  const gestorClean = (datos.codigoGestor || datos.nombreGestor || "GESTOR").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filtroSuffix = datos.filtroEmpresa && datos.filtroEmpresa !== "TODAS" ? `-${datos.filtroEmpresa}` : "";
  const filename = `CLIENTES-SIN-PAGO-${gestorClean}-Semana${datos.semana}-${datos.anio}${filtroSuffix}.xlsx`;
  XLSX.writeFile(wb, filename);
}


