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
  domicilio?: string | null;
}

export interface PagoCorteRaw {
  codigoCliente: string;
  monto: number;
  moratorio?: number | null;
  fechaPago?: Date | string | null;
  tipo?: string | null; // EFECTIVO, BANCOS, etc.
  folio?: string | null;
  metodoPago?: string | null;
  ticketId?: string | null;
  banco?: string | null;
  concepto?: string | null;
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
  canalCobro?: string;
  montoBot?: number;
  montoBancosGestor?: number;
  montoGestor?: number;
  domicilio?: string;
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
  cobranzaBancosBot: { cuentas: number; pesos: number };
  cobranzaBancosGestor: { cuentas: number; pesos: number };
  cobranzaGestor: { cuentas: number; pesos: number };
  resumenProblemas: ResumenProblemasCEJ;
  matrizPeriodos: FilaPeriodoCEJ[];
  resumenDiario: ResumenDiarioCEJ[];
}

/**
 * Normaliza cualquier formato de día (números 1-7, nombres en español con o sin tildes)
 * a los nombres estándar usados en CEJ: SABADO, DOMINGO, LUNES, MARTES, MIERCOLES, JUEVES, VIERNES
 */
export function normalizarDiaSemana(val: any): string {
  if (!val) return "SABADO";
  const s = String(val).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (s === "1" || s.startsWith("LUN")) return "LUNES";
  if (s === "2" || s.startsWith("MAR")) return "MARTES";
  if (s === "3" || s.startsWith("MIE")) return "MIERCOLES";
  if (s === "4" || s.startsWith("JUE")) return "JUEVES";
  if (s === "5" || s.startsWith("VIE")) return "VIERNES";
  if (s === "6" || s.startsWith("SAB")) return "SABADO";
  if (s === "7" || s === "0" || s.startsWith("DOM")) return "DOMINGO";

  const diasDef = ["SABADO", "DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"];
  for (const dia of diasDef) {
    if (s.includes(dia)) return dia;
  }
  return "SABADO";
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
 * Clasifica un pago individual en uno de los 3 canales oficiales del ERP:
 * - BANCOS_BOT: Pago generado/conciliado automáticamente vía bot, tickets WhatsApp o SPEI
 * - BANCOS_GESTOR: Reportado manualmente como bancario por el gestor en app móvil o depósito directo
 * - GESTOR: Cobranza física en efectivo en ruta
 */
export function clasificarCanalPago(pago: {
  metodoPago?: string | null;
  ticketId?: string | null;
  banco?: string | null;
  concepto?: string | null;
  tipo?: string | null;
}): "BANCOS_BOT" | "BANCOS_GESTOR" | "GESTOR" {
  const m = (pago.metodoPago || pago.tipo || "").toUpperCase().trim();
  const c = (pago.concepto || "").toUpperCase().trim();

  // 1. Si tiene ticketId vinculado o el método/concepto es explícitamente de bot
  if (
    Boolean(pago.ticketId) ||
    m === "BANCOS BOT" ||
    m === "BANCARIO_BOT" ||
    m === "SPEI AUTO CONCILIADO" ||
    m === "BOT" ||
    m === "WHATSAPP" ||
    c.includes("BOT") ||
    c.includes("TKT")
  ) {
    return "BANCOS_BOT";
  }

  // 2. Cobranza física en efectivo en ruta por el cobrador
  if (m === "GESTOR" || m === "EFECTIVO" || m === "CONTADO") {
    return "GESTOR";
  }

  // 3. Captura manual de banco en app móvil / reporte bancario del gestor
  if (
    m === "BANCARIO" ||
    m === "BANCOS GESTOR" ||
    m === "GESTOR BANCOS" ||
    m === "TRANSFERENCIA" ||
    m === "DEPOSITO" ||
    m.includes("BANCO") ||
    m.includes("TRANS") ||
    m.includes("DEPO") ||
    Boolean(pago.banco)
  ) {
    return "BANCOS_GESTOR";
  }

  return pago.banco ? "BANCOS_GESTOR" : "GESTOR";
}

/**
 * Clasifica un texto de tipoCobro (ej. de cortes guardados o detalles) a canal oficial
 */
export function clasificarCanalDesdeTipoCobro(tipoCobro: string = ""): "BANCOS_BOT" | "BANCOS_GESTOR" | "GESTOR" {
  const t = (tipoCobro || "").toUpperCase().trim();
  if (t.includes("BOT") || t.includes("WHATSAPP") || t.includes("SPEI") || t.includes("TKT")) {
    return "BANCOS_BOT";
  }
  if (t.includes("BANCO") || t.includes("TRANS") || t.includes("DEPO") || t.includes("BANCARIO")) {
    return "BANCOS_GESTOR";
  }
  return "GESTOR";
}

/**
 * Genera el detalle calculado y los resúmenes ejecutivos para un conjunto de clientes y pagos
 */
export function procesarDetallesYResumenCEJ(
  clientes: ClienteCorteRaw[],
  pagosSemana: PagoCorteRaw[] = [],
  periodicidadesActivas: string[] = []
): { detalles: DetalleCalculadoCEJ[]; resumen: ResumenCorteCEJ } {
  // Normalizar periodicidades activas a minúsculas
  const periodicidadesActivasNorm = (periodicidadesActivas || []).map((p) => p.toLowerCase().trim());

  // Mapa de pagos acumulados por cliente con desglose por canal
  const pagosMap = new Map<
    string,
    {
      monto: number;
      moratorio: number;
      fechaPago: string | null;
      tipo: string;
      folio: string;
      montoBot: number;
      montoBancosGestor: number;
      montoGestor: number;
      canalDominante: "BANCOS BOT" | "BANCOS GESTOR" | "GESTOR";
    }
  >();

  pagosSemana.forEach((p) => {
    const cod = p.codigoCliente.toUpperCase().trim();
    const existing = pagosMap.get(cod) || {
      monto: 0,
      moratorio: 0,
      fechaPago: null,
      tipo: "GESTOR",
      folio: "",
      montoBot: 0,
      montoBancosGestor: 0,
      montoGestor: 0,
      canalDominante: "GESTOR" as const
    };

    const monto = Number(p.monto) || 0;
    existing.monto += monto;
    existing.moratorio += Number(p.moratorio) || 0;
    if (p.fechaPago) {
      existing.fechaPago = typeof p.fechaPago === "string" ? p.fechaPago : p.fechaPago.toISOString();
    }
    if (p.folio) existing.folio = p.folio;

    const canal = clasificarCanalPago(p);
    if (canal === "BANCOS_BOT") {
      existing.montoBot += monto;
    } else if (canal === "BANCOS_GESTOR") {
      existing.montoBancosGestor += monto;
    } else {
      existing.montoGestor += monto;
    }

    // Determinar canal predominante / etiqueta de tipo
    if (existing.montoBot > 0 && existing.montoGestor === 0 && existing.montoBancosGestor === 0) {
      existing.canalDominante = "BANCOS BOT";
      existing.tipo = "BANCOS BOT";
    } else if (existing.montoBancosGestor > 0 && existing.montoGestor === 0 && existing.montoBot === 0) {
      existing.canalDominante = "BANCOS GESTOR";
      existing.tipo = "BANCOS GESTOR";
    } else if (existing.montoBot > 0) {
      existing.canalDominante = "BANCOS BOT";
      existing.tipo = "BANCOS BOT";
    } else if (existing.montoBancosGestor > 0) {
      existing.canalDominante = "BANCOS GESTOR";
      existing.tipo = "BANCOS GESTOR";
    } else {
      existing.canalDominante = "GESTOR";
      existing.tipo = "GESTOR";
    }

    pagosMap.set(cod, existing);
  });

  const detalles: DetalleCalculadoCEJ[] = clientes.map((c) => {
    const cod = c.codigoCliente.toUpperCase().trim();
    const pagoInfo = pagosMap.get(cod) || {
      monto: 0,
      moratorio: 0,
      fechaPago: null,
      tipo: "0",
      folio: "",
      montoBot: 0,
      montoBancosGestor: 0,
      montoGestor: 0,
      canalDominante: "GESTOR" as const
    };
    const pagoReal = pagoInfo.monto;
    const moratorio = pagoInfo.moratorio;
    const pagoSugerido = Number(c.montoPago) || 0;
    const saldoVencido = Number(c.saldoVencido) || 0;
    const saldoActual = Number(c.saldoActual) || 0;
    const periodicidad = (c.periodicidad || "SEMANAL").toUpperCase().trim();
    const periodicidadMin = (c.periodicidad || "semanal").toLowerCase().trim();
    const pv = Number(c.pv) || 0;
    const sup = calcularSUP(periodicidad, pv);

    // DETERMINACIÓN AUTOMÁTICA DE PROBLEMA (REGLAS DE NEGOCIO):
    // 1. Si dio abono en la semana (pagoReal > 0), SIEMPRE es RUTA sin importar su etiqueta previa o PE
    // 2. Si no dio abono y NO le toca pago su periodo en esta semana -> PE (Periodo)
    // 3. Si sí le toca pago en esta semana -> RUTA (o clasificación asignada distinta de PE)
    const leTocaPagoSemana =
      periodicidadesActivasNorm.length === 0 ||
      periodicidadesActivasNorm.includes(periodicidadMin);

    let problema = "RUTA";
    if (pagoReal > 0) {
      problema = "RUTA";
    } else if (!leTocaPagoSemana) {
      problema = "PE";
    } else {
      const clasifActual = (c.clasificacionCobranza || "").toUpperCase().trim();
      problema = (clasifActual && clasifActual !== "PE") ? clasifActual : "RUTA";
    }

    const diaAsignado = normalizarDiaSemana(c.diaPago || c.pagoAnalista);
    const pagoAnalista = (c.pagoAnalista && (c.pagoAnalista.toUpperCase().trim() === "SI" || c.pagoAnalista.toUpperCase().trim() === "NO"))
      ? c.pagoAnalista.toUpperCase().trim()
      : diaAsignado;

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
      diaPago: diaAsignado,
      tipoCobro: pagoInfo.tipo !== "0" ? pagoInfo.tipo : "0",
      canalCobro: pagoInfo.monto > 0 ? pagoInfo.canalDominante : undefined,
      montoBot: pagoInfo.montoBot,
      montoBancosGestor: pagoInfo.montoBancosGestor,
      montoGestor: pagoInfo.montoGestor,
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
      tipCob: tipCob,
      domicilio: c.domicilio || "-"
    };
  });

  const resumen = calcularResumenCEJDesdeDetalles(detalles);

  return { detalles, resumen };
}

/**
 * Calcula el resumen ejecutivo de corte a partir de una lista de detalles de cobranza
 */
export function calcularResumenCEJDesdeDetalles(detalles: (DetalleCalculadoCEJ | any)[]): ResumenCorteCEJ {
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

  let cobBancosBotCtas = 0;
  let cobBancosBotPesos = 0;
  let cobBancosGestorCtas = 0;
  let cobBancosGestorPesos = 0;
  let cobGestorCtas = 0;
  let cobGestorPesos = 0;
  let ctasCobradas = 0;

  detalles.forEach((d) => {
    const pagoSugerido = Number(d.pagoSugerido ?? d.montoPago) || 0;
    const pagoReal = Number(d.pagoReal) || 0;
    const saldoVencido = Number(d.saldoVencido) || 0;
    const saldoActual = Number(d.saldoActual) || 0;
    const pagoDoble = Number(d.pagoDoble) || 0;
    const recuperadoPv = Number(d.recuperadoPv) || 0;

    totalSugerido += pagoSugerido;
    totalCobrado += pagoReal;
    totalVencido += saldoVencido;
    totalCartera += saldoActual;
    totalPagosDobles += pagoDoble;
    totalRecuperadoPv += recuperadoPv;

    if (pagoReal > 0) {
      ctasCobradas++;

      // Desglose analítico de canales: BANCOS BOT, BANCOS GESTOR, GESTOR
      if (d.montoBot !== undefined || d.montoBancosGestor !== undefined || d.montoGestor !== undefined) {
        const mBot = Number(d.montoBot) || 0;
        const mBG = Number(d.montoBancosGestor) || 0;
        const mG = Number(d.montoGestor) || 0;

        if (mBot > 0) {
          cobBancosBotCtas++;
          cobBancosBotPesos += mBot;
        }
        if (mBG > 0) {
          cobBancosGestorCtas++;
          cobBancosGestorPesos += mBG;
        }
        if (mG > 0) {
          cobGestorCtas++;
          cobGestorPesos += mG;
        }

        // Fallback de contingencia si no se desglosaron montos
        if (mBot === 0 && mBG === 0 && mG === 0) {
          const canal = clasificarCanalDesdeTipoCobro(d.tipoCobro);
          if (canal === "BANCOS_BOT") {
            cobBancosBotCtas++;
            cobBancosBotPesos += pagoReal;
          } else if (canal === "BANCOS_GESTOR") {
            cobBancosGestorCtas++;
            cobBancosGestorPesos += pagoReal;
          } else {
            cobGestorCtas++;
            cobGestorPesos += pagoReal;
          }
        }
      } else {
        const canal = clasificarCanalDesdeTipoCobro(d.tipoCobro);
        if (canal === "BANCOS_BOT") {
          cobBancosBotCtas++;
          cobBancosBotPesos += pagoReal;
        } else if (canal === "BANCOS_GESTOR") {
          cobBancosGestorCtas++;
          cobBancosGestorPesos += pagoReal;
        } else {
          cobGestorCtas++;
          cobGestorPesos += pagoReal;
        }
      }
    }

    // Clasificación Problema
    const prob = (d.problema || "RUTA").toUpperCase().trim();
    if (prob.includes("CAN") || prob === "K") {
      problemasAgg.canceladoK.cuentas++;
      problemasAgg.canceladoK.pesos += pagoSugerido;
    } else if (prob.includes("INT") || prob === "IT") {
      problemasAgg.intervencionIT.cuentas++;
      problemasAgg.intervencionIT.pesos += pagoSugerido;
    } else if (prob.includes("AD") || prob === "ADELANTADO") {
      problemasAgg.adelantadoAD.cuentas++;
      problemasAgg.adelantadoAD.pesos += pagoSugerido;
    } else if (prob.includes("PE") || prob === "PERIODO") {
      problemasAgg.periodoPE.cuentas++;
      problemasAgg.periodoPE.pesos += pagoSugerido;
    } else if (prob.includes("PS") || prob === "PAGO SEM") {
      problemasAgg.pagoSemPS.cuentas++;
      problemasAgg.pagoSemPS.pesos += pagoSugerido;
    } else if (prob.includes("DL") || prob.includes("DICT")) {
      problemasAgg.dictLegalDL.cuentas++;
      problemasAgg.dictLegalDL.pesos += pagoSugerido;
    }

    if (prob === "RUTA") {
      problemasAgg.cuentasRuta.cuentas++;
      problemasAgg.cuentasRuta.pesos += pagoSugerido;
      if (saldoVencido >= 1) {
        problemasAgg.vencidosRuta.cuentas++;
        problemasAgg.vencidosRuta.pesos += saldoVencido;
      }

      // Desglose Diario Semanal para RUTA
      const matchDia = normalizarDiaSemana(d.diaPago || d.pagoAnalista);
      if (matchDia && diasMap.has(matchDia)) {
        const item = diasMap.get(matchDia)!;
        item.pptoCuentas++;
        item.pptoDinero += pagoSugerido;
        if (pagoReal > 0) {
          item.avanceCuentas++;
          item.avanceDinero += pagoReal;
        }
      }
    }

    // Periodicidad
    let perKey = "SEMANAL";
    const periodicidadStr = (d.periodicidad || "SEMANAL").toUpperCase();
    for (const p of periodicidadesDef) {
      if (periodicidadStr.includes(p)) {
        perKey = p;
        break;
      }
    }
    const perItem = periodosMap.get(perKey) || { pptoCtas: 0, pptoPesos: 0, cobCtas: 0, cobPesos: 0 };
    perItem.pptoCtas++;
    perItem.pptoPesos += pagoSugerido;
    if (pagoReal > 0) {
      perItem.cobCtas++;
      perItem.cobPesos += pagoReal;
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

  const cobBancosCtas = cobBancosBotCtas + cobBancosGestorCtas;
  const cobBancosPesos = cobBancosBotPesos + cobBancosGestorPesos;
  const cobEfectivoCtas = cobGestorCtas;
  const cobEfectivoPesos = cobGestorPesos;

  return {
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
    cobranzaBancosBot: { cuentas: cobBancosBotCtas, pesos: cobBancosBotPesos },
    cobranzaBancosGestor: { cuentas: cobBancosGestorCtas, pesos: cobBancosGestorPesos },
    cobranzaGestor: { cuentas: cobGestorCtas, pesos: cobGestorPesos },
    resumenProblemas,
    matrizPeriodos,
    resumenDiario
  };
}

/**
 * Separa una lista de detalles por empresa (DQ y DP) y calcula los tres resúmenes (Global, DQ, DP)
 */
export function separarYCalcularResumenesCEJ(detalles: (DetalleCalculadoCEJ | any)[]): {
  global: ResumenCorteCEJ;
  dq: ResumenCorteCEJ;
  dp: ResumenCorteCEJ;
} {
  const global = calcularResumenCEJDesdeDetalles(detalles);

  const detallesDQ = detalles.filter((d) => {
    const cod = (d.codigoCliente || "").toUpperCase();
    const cont = (d.numContrato || "").toUpperCase();
    return cod.startsWith("DQ") || cont.startsWith("DQ");
  });

  const detallesDP = detalles.filter((d) => {
    const cod = (d.codigoCliente || "").toUpperCase();
    const cont = (d.numContrato || "").toUpperCase();
    return cod.startsWith("DP") || cont.startsWith("DP");
  });

  const dq = calcularResumenCEJDesdeDetalles(detallesDQ);
  const dp = calcularResumenCEJDesdeDetalles(detallesDP);

  return { global, dq, dp };
}
