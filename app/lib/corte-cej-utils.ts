/**
 * Utilidades analíticas de cálculo para la Plantilla CEJ y Corte Semanal de Cobranza
 * Según especificaciones oficiales de 'PLANTILLA - CEJ.xlsx' y 'PLANTILLA - CEJ.pdf'
 */

export interface ClienteCorteRaw {
  id?: string;
  codigoCliente: string;
  numContrato?: string | null;
  fechaVenta?: Date | string | null;
  nombreCompleto: string;
  periodicidad?: string | null;
  montoPago: number;
  saldoVencido?: number | null;
  saldoActual: number;
  pv?: number | null;
  diasVencidos?: number | null;
  gestor?: string | null;
  diaPago?: string | null;
  telefono?: string | null;
  telefonoTrabajo?: string | null;
  clasificacionCobranza?: string | null;
  pagoAnalista?: string | null;
}

export interface PagoCorteRaw {
  codigoCliente: string;
  monto: number;
  moratorio?: number | null;
  fechaPago?: Date | string | null;
  tipo?: string | null; // EFECTIVO, BANCOS, etc.
  folio?: string | null;
}

export interface DetalleCalculadoCEJ {
  clienteId?: string;
  codigoCliente: string;
  numContrato: string;
  periodoInicial: string; // ISO o DD/MM/YYYY
  nombreCliente: string;
  periodicidad: string;
  pagoSugerido: number;
  saldoVencido: number;
  pv: number;
  saldoActual: number;
  gestor: string;
  sup: number; // Días supuestos de atraso
  moratorio: number;
  pvr: number; // Saldo vencido restante tras cobro
  pagoReal: number;
  diaPago: string;
  tipoCobro: string;
  telefono: string;
  telefono2: string;
  c: number;
  pagoAnalista: string;
  problema: string;
  pagoDoble: number;
  numPagosDobles: number;
  recuperadoPv: number;
  numPagosDobles2: number;
  comisionAnalista: number;
  fechaPago: string | null;
  serie: string;
  tipCob: string;
}

export interface ResumenProblemasCEJ {
  canceladoK: { cuentas: number; pesos: number };
  intervencionIT: { cuentas: number; pesos: number };
  adelantadoAD: { cuentas: number; pesos: number };
  periodoPE: { cuentas: number; pesos: number };
  pagoSemPS: { cuentas: number; pesos: number };
  dictLegalDL: { cuentas: number; pesos: number };
  totalProblemas: { cuentas: number; pesos: number };
  cuentasRuta: { cuentas: number; pesos: number };
  vencidosRuta: { cuentas: number; pesos: number };
  totalAsignadas: { cuentas: number; pesos: number };
}

export interface FilaPeriodoCEJ {
  periodo: string;
  pptoCtas: number;
  pptoPesos: number;
  cobCtas: number;
  cobPesos: number;
  porcCtas: number;
  porcPesos: number;
}

export interface ResumenDiarioCEJ {
  dia: string;
  pptoCuentas: number;
  avanceCuentas: number;
  pptoDinero: number;
  avanceDinero: number;
}

export interface ResumenCorteCEJ {
  totalCuentas: number;
  totalSugerido: number;
  totalCobrado: number;
  totalVencido: number;
  totalCartera: number;
  totalPagosDobles: number;
  totalRecuperadoPv: number;
  porcentajeCtasSinDobles: number;
  porcentajeCtasConDobles: number;
  pagarConPorcentajeSinDobles: boolean;
  cobranzaEfectivo: { cuentas: number; pesos: number };
  cobranzaBancos: { cuentas: number; pesos: number };
  resumenProblemas: ResumenProblemasCEJ;
  matrizPeriodos: FilaPeriodoCEJ[];
  resumenDiario: ResumenDiarioCEJ[];
}

/**
 * Calcula los días supuestos según periodicidad y periodos vencidos (SUP)
 */
export function calcularSUP(periodicidad: string, pv: number): number {
  const p = (periodicidad || "").toUpperCase().trim();
  if (pv <= 0) return 0;
  if (p.includes("SEMANAL")) return pv * 7;
  if (p.includes("CATORCENAL")) return pv * 14;
  if (p.includes("QUINCENAL")) return pv * 15;
  if (p.includes("MENSUAL")) return pv * 30;
  return pv * 7;
}

/**
 * Calcula Pago Doble conforme a la fórmula oficial de Excel:
 * IF(AND(PAGO>=PAGO_SUG*2, PAGO<=SALDO_VENC, SALDO_VENC>PAGO_SUG*2), PAGO-PAGO_SUG,
 *   IF(AND(PAGO>=SALDO_VENC, SALDO_VENC>0, SALDO_VENC>=PAGO_SUG*2), SALDO_VENC-PAGO_SUG, 0))
 */
export function calcularPagoDoble(pago: number, pagoSugerido: number, saldoVencido: number): number {
  if (pagoSugerido <= 0) return 0;
  if (pago >= pagoSugerido * 2 && pago <= saldoVencido && saldoVencido > pagoSugerido * 2) {
    return pago - pagoSugerido;
  }
  if (pago >= saldoVencido && saldoVencido > 0 && saldoVencido >= pagoSugerido * 2) {
    return saldoVencido - pagoSugerido;
  }
  return 0;
}

/**
 * Calcula Recuperado PV conforme a la fórmula oficial de Excel:
 * IF(AND(PAGO>=PAGO_SUG*1, PAGO<=SALDO_VENC, SALDO_VENC>PAGO_SUG*1), PAGO-PAGO_SUG,
 *   IF(AND(PAGO>=SALDO_VENC, SALDO_VENC>0, SALDO_VENC>=PAGO_SUG*1), SALDO_VENC-PAGO_SUG, 0))
 */
export function calcularRecuperadoPV(pago: number, pagoSugerido: number, saldoVencido: number): number {
  if (pagoSugerido <= 0) return 0;
  if (pago >= pagoSugerido * 1 && pago <= saldoVencido && saldoVencido > pagoSugerido * 1) {
    return pago - pagoSugerido;
  }
  if (pago >= saldoVencido && saldoVencido > 0 && saldoVencido >= pagoSugerido * 1) {
    return saldoVencido - pagoSugerido;
  }
  return 0;
}

/**
 * Calcula comisión analista:
 * IF(PAGOANALISTA="SI", PAGO * 10%, IF(PAGOANALISTA != "", PAGO * 5%, 0))
 */
export function calcularComisionAnalista(pago: number, pagoAnalista: string | null | undefined): number {
  if (!pagoAnalista || pago <= 0) return 0;
  const val = pagoAnalista.trim().toUpperCase();
  if (val === "SI") {
    return Math.round(pago * 0.10 * 100) / 100;
  }
  return Math.round(pago * 0.05 * 100) / 100;
}

/**
 * Genera el detalle calculado y los resúmenes ejecutivos para un conjunto de clientes y pagos
 */
export function procesarDetallesYResumenCEJ(
  clientes: ClienteCorteRaw[],
  pagosSemana: PagoCorteRaw[] = []
): { detalles: DetalleCalculadoCEJ[]; resumen: ResumenCorteCEJ } {
  // Mapa de pagos acumulados por cliente
  const pagosMap = new Map<string, { monto: number; moratorio: number; fechaPago: string | null; tipo: string; folio: string }>();

  pagosSemana.forEach((p) => {
    const cod = p.codigoCliente.toUpperCase().trim();
    const existing = pagosMap.get(cod) || { monto: 0, moratorio: 0, fechaPago: null, tipo: "GESTOR", folio: "" };
    existing.monto += Number(p.monto) || 0;
    existing.moratorio += Number(p.moratorio) || 0;
    if (p.fechaPago) {
      existing.fechaPago = typeof p.fechaPago === "string" ? p.fechaPago : p.fechaPago.toISOString();
    }
    if (p.tipo) existing.tipo = p.tipo;
    if (p.folio) existing.folio = p.folio;
    pagosMap.set(cod, existing);
  });

  const detalles: DetalleCalculadoCEJ[] = clientes.map((c) => {
    const cod = c.codigoCliente.toUpperCase().trim();
    const pagoInfo = pagosMap.get(cod) || { monto: 0, moratorio: 0, fechaPago: null, tipo: "0", folio: "" };
    const pagoReal = pagoInfo.monto;
    const moratorio = pagoInfo.moratorio;
    const pagoSugerido = Number(c.montoPago) || 0;
    const saldoVencido = Number(c.saldoVencido) || 0;
    const saldoActual = Number(c.saldoActual) || 0;
    const periodicidad = (c.periodicidad || "SEMANAL").toUpperCase().trim();
    const pv = Number(c.pv) || 0;
    const sup = calcularSUP(periodicidad, pv);

    const problema = (c.clasificacionCobranza || "RUTA").toUpperCase().trim();
    const pagoAnalista = (c.pagoAnalista || c.diaPago || "SÁBADO").toUpperCase().trim();

    const pagoDoble = calcularPagoDoble(pagoReal, pagoSugerido, saldoVencido);
    const numPagosDobles = pagoDoble > 0 && pagoSugerido > 0 ? Math.floor(pagoDoble / pagoSugerido) : 0;
    const recuperadoPv = calcularRecuperadoPV(pagoReal, pagoSugerido, saldoVencido);
    const numPagosDobles2 = recuperadoPv > 0 ? 1 : 0;
    const comisionAnalista = calcularComisionAnalista(pagoReal, pagoAnalista);

    const pvr = Math.max(0, saldoVencido - pagoReal);

    let tipCob = "0";
    if (pagoReal > 0) {
      if (saldoVencido > 1999 && pagoSugerido > 0) {
        tipCob = (pagoReal / pagoSugerido).toFixed(2);
      } else {
        tipCob = "1";
      }
    }

    const periodoInicialStr = c.fechaVenta
      ? (typeof c.fechaVenta === "string" ? c.fechaVenta : c.fechaVenta.toISOString().split("T")[0])
      : "-";

    return {
      clienteId: c.id,
      codigoCliente: c.codigoCliente,
      numContrato: c.numContrato || "-",
      periodoInicial: periodoInicialStr,
      nombreCliente: c.nombreCompleto,
      periodicidad: periodicidad,
      pagoSugerido: pagoSugerido,
      saldoVencido: saldoVencido,
      pv: pv,
      saldoActual: saldoActual,
      gestor: c.gestor || "DQCEJ",
      sup: sup,
      moratorio: moratorio,
      pvr: pvr,
      pagoReal: pagoReal,
      diaPago: c.diaPago || "sábado",
      tipoCobro: pagoInfo.tipo !== "0" ? pagoInfo.tipo : "0",
      telefono: c.telefono || c.telefonoTrabajo || "-",
      telefono2: c.telefonoTrabajo || "-",
      c: 1,
      pagoAnalista: pagoAnalista,
      problema: problema,
      pagoDoble: pagoDoble,
      numPagosDobles: numPagosDobles,
      recuperadoPv: recuperadoPv,
      numPagosDobles2: numPagosDobles2,
      comisionAnalista: comisionAnalista,
      fechaPago: pagoInfo.fechaPago,
      serie: pagoInfo.folio || "",
      tipCob: tipCob
    };
  });

  // --- Resúmenes Ejecutivos ---
  let totalSugerido = 0;
  let totalCobrado = 0;
  let totalVencido = 0;
  let totalCartera = 0;
  let totalPagosDobles = 0;
  let totalRecuperadoPv = 0;

  const problemasAgg = {
    canceladoK: { cuentas: 0, pesos: 0 },
    intervencionIT: { cuentas: 0, pesos: 0 },
    adelantadoAD: { cuentas: 0, pesos: 0 },
    periodoPE: { cuentas: 0, pesos: 0 },
    pagoSemPS: { cuentas: 0, pesos: 0 },
    dictLegalDL: { cuentas: 0, pesos: 0 },
    cuentasRuta: { cuentas: 0, pesos: 0 },
    vencidosRuta: { cuentas: 0, pesos: 0 }
  };

  const periodosMap = new Map<string, { pptoCtas: number; pptoPesos: number; cobCtas: number; cobPesos: number }>();
  const periodicidadesDef = ["SEMANAL", "CATORCENAL", "QUINCENAL", "MENSUAL"];
  periodicidadesDef.forEach((p) => {
    periodosMap.set(p, { pptoCtas: 0, pptoPesos: 0, cobCtas: 0, cobPesos: 0 });
  });

  const diasDef = ["SABADO", "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
  const diasMap = new Map<string, { pptoCuentas: number; avanceCuentas: number; pptoDinero: number; avanceDinero: number }>();
  diasDef.forEach((d) => {
    diasMap.set(d, { pptoCuentas: 0, avanceCuentas: 0, pptoDinero: 0, avanceDinero: 0 });
  });

  let cobEfectivoCtas = 0;
  let cobEfectivoPesos = 0;
  let cobBancosCtas = 0;
  let cobBancosPesos = 0;
  let ctasCobradas = 0;

  detalles.forEach((d) => {
    totalSugerido += d.pagoSugerido;
    totalCobrado += d.pagoReal;
    totalVencido += d.saldoVencido;
    totalCartera += d.saldoActual;
    totalPagosDobles += d.pagoDoble;
    totalRecuperadoPv += d.recuperadoPv;

    if (d.pagoReal > 0) {
      ctasCobradas++;
      const tipo = d.tipoCobro.toUpperCase();
      if (tipo.includes("BANCO") || tipo.includes("TRANS") || tipo.includes("DEPO")) {
        cobBancosCtas++;
        cobBancosPesos += d.pagoReal;
      } else {
        cobEfectivoCtas++;
        cobEfectivoPesos += d.pagoReal;
      }
    }

    // Clasificación Problema
    const prob = d.problema.toUpperCase();
    if (prob.includes("CAN") || prob === "K") {
      problemasAgg.canceladoK.cuentas++;
      problemasAgg.canceladoK.pesos += d.pagoSugerido;
    } else if (prob.includes("INT") || prob === "IT") {
      problemasAgg.intervencionIT.cuentas++;
      problemasAgg.intervencionIT.pesos += d.pagoSugerido;
    } else if (prob.includes("AD") || prob === "ADELANTADO") {
      problemasAgg.adelantadoAD.cuentas++;
      problemasAgg.adelantadoAD.pesos += d.pagoSugerido;
    } else if (prob.includes("PE") || prob === "PERIODO") {
      problemasAgg.periodoPE.cuentas++;
      problemasAgg.periodoPE.pesos += d.pagoSugerido;
    } else if (prob.includes("PS") || prob === "PAGO SEM") {
      problemasAgg.pagoSemPS.cuentas++;
      problemasAgg.pagoSemPS.pesos += d.pagoSugerido;
    } else if (prob.includes("DL") || prob.includes("DICT")) {
      problemasAgg.dictLegalDL.cuentas++;
      problemasAgg.dictLegalDL.pesos += d.pagoSugerido;
    }

    if (prob === "RUTA") {
      problemasAgg.cuentasRuta.cuentas++;
      problemasAgg.cuentasRuta.pesos += d.pagoSugerido;
      if (d.saldoVencido >= 1) {
        problemasAgg.vencidosRuta.cuentas++;
        problemasAgg.vencidosRuta.pesos += d.saldoVencido;
      }

      // Desglose Diario Semanal para RUTA
      const diaClean = d.pagoAnalista.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchDia = diasDef.find((dia) => diaClean.includes(dia));
      if (matchDia) {
        const item = diasMap.get(matchDia)!;
        item.pptoCuentas++;
        item.pptoDinero += d.pagoSugerido;
        if (d.pagoReal > 0) {
          item.avanceCuentas++;
          item.avanceDinero += d.pagoReal;
        }
      }
    }

    // Periodicidad
    let perKey = "SEMANAL";
    for (const p of periodicidadesDef) {
      if (d.periodicidad.includes(p)) {
        perKey = p;
        break;
      }
    }
    const perItem = periodosMap.get(perKey) || { pptoCtas: 0, pptoPesos: 0, cobCtas: 0, cobPesos: 0 };
    perItem.pptoCtas++;
    perItem.pptoPesos += d.pagoSugerido;
    if (d.pagoReal > 0) {
      perItem.cobCtas++;
      perItem.cobPesos += d.pagoReal;
    }
    periodosMap.set(perKey, perItem);
  });

  const totalProbCuentas =
    problemasAgg.canceladoK.cuentas +
    problemasAgg.intervencionIT.cuentas +
    problemasAgg.adelantadoAD.cuentas +
    problemasAgg.periodoPE.cuentas +
    problemasAgg.pagoSemPS.cuentas +
    problemasAgg.dictLegalDL.cuentas;

  const totalProbPesos =
    problemasAgg.canceladoK.pesos +
    problemasAgg.intervencionIT.pesos +
    problemasAgg.adelantadoAD.pesos +
    problemasAgg.periodoPE.pesos +
    problemasAgg.pagoSemPS.pesos +
    problemasAgg.dictLegalDL.pesos;

  const resumenProblemas: ResumenProblemasCEJ = {
    ...problemasAgg,
    totalProblemas: { cuentas: totalProbCuentas, pesos: totalProbPesos },
    totalAsignadas: { cuentas: detalles.length, pesos: totalSugerido }
  };

  const matrizPeriodos: FilaPeriodoCEJ[] = periodicidadesDef.map((p) => {
    const item = periodosMap.get(p)!;
    return {
      periodo: p,
      pptoCtas: item.pptoCtas,
      pptoPesos: item.pptoPesos,
      cobCtas: item.cobCtas,
      cobPesos: item.cobPesos,
      porcCtas: item.pptoCtas > 0 ? Math.round((item.cobCtas / item.pptoCtas) * 1000) / 10 : 0,
      porcPesos: item.pptoPesos > 0 ? Math.round((item.cobPesos / item.pptoPesos) * 1000) / 10 : 0
    };
  });

  const resumenDiario: ResumenDiarioCEJ[] = diasDef.map((d) => {
    const item = diasMap.get(d)!;
    return {
      dia: d,
      pptoCuentas: item.pptoCuentas,
      avanceCuentas: item.avanceCuentas,
      pptoDinero: item.pptoDinero,
      avanceDinero: item.avanceDinero
    };
  });

  const baseCtasRuta = problemasAgg.cuentasRuta.cuentas || detalles.length || 1;
  const porcCtasSinDobles = Math.round((ctasCobradas / baseCtasRuta) * 1000) / 10;
  const porcCtasConDobles = Math.round(((ctasCobradas + totalPagosDobles) / baseCtasRuta) * 1000) / 10;

  const resumen: ResumenCorteCEJ = {
    totalCuentas: detalles.length,
    totalSugerido,
    totalCobrado,
    totalVencido,
    totalCartera,
    totalPagosDobles,
    totalRecuperadoPv,
    porcentajeCtasSinDobles: porcCtasSinDobles,
    porcentajeCtasConDobles: porcCtasConDobles,
    pagarConPorcentajeSinDobles: porcCtasSinDobles < 81,
    cobranzaEfectivo: { cuentas: cobEfectivoCtas, pesos: cobEfectivoPesos },
    cobranzaBancos: { cuentas: cobBancosCtas, pesos: cobBancosPesos },
    resumenProblemas,
    matrizPeriodos,
    resumenDiario
  };

  return { detalles, resumen };
}
