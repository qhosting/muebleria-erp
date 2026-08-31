import { ContpaqiService } from './contpaqi-service';
import { prisma } from './db';

export interface PagoAuditadoItem {
  id: string | number;
  idpagMysql?: number | null;
  fecha: string;
  monto: number;
  mora: number;
  gcob: number;
  concepto: string;
  referencia: string;
  cobrador: string;
  estaEnContpaqi: boolean;
  docContpaqiId?: number | null;
  docContpaqiFolio?: string | null;
  saldoAnteriorActual: number;
  saldoNuevoActual: number;
  saldoAnteriorReconstruido: number;
  saldoNuevoReconstruido: number;
  requiereAjuste: boolean;
}

export interface DiagnosticoClienteSaldos {
  codigo: string;
  nombre: string;
  empresa: 'DP' | 'DQ';
  cobrador: string;
  saldoContpaqiApi: number;
  saldoErpActual: number;
  saldoMysqlActual: number;
  saldoRealCalculado: number;
  diferenciaErp: number;
  diferenciaMysql: number;
  estadoCuadre: 'CUADRADO' | 'DESFASE_SALDO' | 'PAGOS_PENDIENTES_CONTPAQI';
  totalPagosAuditados: number;
  pagosPendientesContpaqi: number;
  pagosAplicadosContpaqi: number;
  cadenaPagos: PagoAuditadoItem[];
  detallesContpaqi: {
    totalPagares: number;
    totalAbonosContpaqi: number;
    numPagares: number;
    numAbonos: number;
  };
}

/**
 * Convierte una fecha a string YYYY-MM-DD en zona horaria America/Mexico_City
 */
export function toCdmxDateString(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Determina la empresa ContPAQi en base al código de cliente
 */
export function obtenerEmpresaPorCodigo(codigo: string): 'DP' | 'DQ' {
  const codUpper = (codigo || '').trim().toUpperCase();
  if (codUpper.startsWith('DQ')) return 'DQ';
  return 'DP';
}

/**
 * Ejecuta la auditoría reconstructiva de saldos para un cliente específico (ERP vs ContPAQi API)
 */
export async function auditarSaldosCliente(
  codigoCliente: string,
  prismaClient?: any
): Promise<DiagnosticoClienteSaldos> {
  const db = prismaClient || prisma;
  const cod = codigoCliente.trim().toUpperCase();
  const empresa = obtenerEmpresaPorCodigo(cod);

  // 1. Consultar cliente y pagos en muebleria-erp (PostgreSQL)
  const clienteErp = await db.cliente.findFirst({
    where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
    include: {
      pagos: {
        include: {
          ticket: true,
          cobrador: true
        }
      },
      cobradorAsignado: true
    }
  });

  const nombreCliente = clienteErp?.nombreCompleto || 'Cliente Sin Nombre';
  const cobrador = clienteErp?.cobradorAsignado?.codigoGestor || clienteErp?.cobradorAsignado?.name || 'Sin Asignar';
  const saldoErpActual = parseFloat(clienteErp?.saldoActual?.toString() || '0') || 0;
  const pagosErp = clienteErp?.pagos || [];

  // 2. Consultar ContPAQi API en vivo
  const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
  const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';
  const service = new ContpaqiService({ apiUrl, apiKey, empresa });

  let docs: any[] = [];
  try {
    docs = await service.getClientDocumentos(cod);
  } catch (err: any) {
    console.warn(`No se pudieron obtener documentos de ContPAQi para ${cod}:`, err.message);
  }

  // 3. Calcular saldo fiel de ContPAQi desde pagarés (Concepto 16)
  const pagares = Array.isArray(docs)
    ? docs.filter((d: any) => {
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return c === '16' && !d.cancelado;
      })
    : [];

  const totalPendientePagares = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || d.CPENDIENTE || 0) || 0), 0);
  const totalPagaresMonto = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.total || d.cTotal || d.CTOTAL || 0) || 0), 0);

  const abonosContpaqi = Array.isArray(docs)
    ? docs.filter((d: any) => {
        if (d.cancelado) return false;
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return ['101', '102'].includes(c);
      })
    : [];

  const abonosCobranza = abonosContpaqi.filter(a => {
    const ref = (a.referencia || '').trim().toUpperCase();
    return !ref.includes('FACTURA') && !ref.includes('ENGANCHE');
  });

  const totalAbonosContpaqi = abonosContpaqi.reduce((acc: number, d: any) => acc + (parseFloat(d.total || d.cTotal || d.CTOTAL || 0) || 0), 0);
  const totalAbonosCobranzaContpaqi = abonosCobranza.reduce((acc: number, d: any) => acc + (parseFloat(d.total || d.cTotal || d.CTOTAL || 0) || 0), 0);

  const abonosSinAsociar = abonosContpaqi.filter(a => parseFloat(a.pendiente || a.CPENDIENTE || 0) > 0)
    .reduce((acc: number, a: any) => acc + (parseFloat(a.pendiente || a.CPENDIENTE || 0) || 0), 0);

  const saldoContpaqiApi = pagares.length > 0
    ? Math.max(0, parseFloat(totalPendientePagares.toFixed(2)))
    : parseFloat((docs.find((d: any) => ['100', '4', '5'].includes(String(d.codigoConcepto || '').trim()) && !d.cancelado)?.pendiente || 0).toString());

  // Indexar documentos de ContPAQi por folio y referencia
  const contpaqiFechaMontoList: any[] = [];
  const contpaqiRefSet = new Map<string, any>();

  for (const d of abonosContpaqi) {
    const ref = (d.referencia || '').trim().toUpperCase();
    if (ref && ref !== 'SEMANA' && ref !== 'PAGO' && ref !== 'ABONO') {
      contpaqiRefSet.set(ref, d);
    }
    const dFechaStr = d.fecha ? toCdmxDateString(d.fecha) : '';
    const dTime = d.fecha ? new Date(d.fecha).getTime() : 0;

    contpaqiFechaMontoList.push({
      id: d.id || d.cIdDocumento || d.CIDDOCUMENTO,
      folio: `${d.serie || ''}-${d.folio || ''}`,
      fecha: dFechaStr,
      time: dTime,
      total: parseFloat(d.total?.toString() || '0') || 0,
      ref,
      raw: d,
      usado: false
    });
  }

  // 4. Lista de pagos de ERP con fecha efectiva
  const listaPagosRaw: any[] = [];
  for (const p of pagosErp) {
    const abonoMonto = parseFloat(p.monto?.toString() || '0') || 0;
    const moraMonto = parseFloat(p.moratorios?.toString() || (p as any).interesMoratorio?.toString() || '0') || 0;
    const gcobMonto = parseFloat((p as any).gastosCobranza?.toString() || '0') || 0;

    // Determinar fecha efectiva confiable (preservar fechaPago original de la transacción)
    let effectiveDate = p.fechaPago ? new Date(p.fechaPago) : (p.ticket?.fecha ? new Date(p.ticket.fecha) : new Date(p.createdAt));

    const fechaStr = toCdmxDateString(effectiveDate);
    const ref = p.ticket?.referencia || p.ticket?.folio || p.numeroRecibo || '';

    listaPagosRaw.push({
      id: p.id,
      ticketId: p.ticketId,
      idpagMysql: null,
      fecha: fechaStr,
      effectiveTime: effectiveDate.getTime(),
      monto: abonoMonto,
      mora: moraMonto,
      gcob: gcobMonto,
      concepto: p.concepto || `Pago #${p.id.slice(0, 8)}`,
      referencia: ref,
      cobrador: p.cobrador?.name || cobrador,
      saldoAnteriorActual: parseFloat((p as any).saldoAnterior?.toString() || '0') || 0,
      saldoNuevoActual: parseFloat((p as any).saldoNuevo?.toString() || '0') || 0,
      esDuplicado: false
    });
  }

  // Ordenar cronológicamente ascendente (del más antiguo al más reciente)
  listaPagosRaw.sort((a, b) => a.effectiveTime - b.effectiveTime);

  // 4.1 Deduplicación inteligente de pagos (colisiones entre alineación MySQL y tickets BOT en la misma fecha ±2 días)
  const pagosValidosTemp: any[] = [];
  const idsDuplicados = new Set<string>();

  for (const p of listaPagosRaw) {
    const matchPrevio = pagosValidosTemp.find(pv => {
      const diffDays = Math.abs(pv.effectiveTime - p.effectiveTime) / (1000 * 60 * 60 * 24);
      return Math.abs(pv.monto - p.monto) < 1 && diffDays <= 2.5;
    });

    if (matchPrevio) {
      // Si el actual tiene ticketId y el previo es alineación automática sin ticket, preferimos el ticket
      if (p.ticketId && !matchPrevio.ticketId) {
        const idx = pagosValidosTemp.indexOf(matchPrevio);
        pagosValidosTemp[idx] = p;
        idsDuplicados.add(matchPrevio.id);
      } else {
        idsDuplicados.add(p.id);
      }
    } else {
      pagosValidosTemp.push(p);
    }
  }

  const listaPagosUnificados = listaPagosRaw.map(p => ({
    ...p,
    esDuplicado: idsDuplicados.has(p.id)
  }));

  // 5. Reconciliar contra ContPAQi para identificar qué pagos ya están capturados
  let pagosPendientesCount = 0;
  let pagosAplicadosCount = 0;

  for (const p of listaPagosUnificados) {
    const refUpper = (p.referencia || '').trim().toUpperCase();

    let docEncontrado = refUpper && contpaqiRefSet.has(refUpper) ? contpaqiRefSet.get(refUpper) : null;
    
    // Búsqueda por fecha exacta y monto
    if (!docEncontrado && p.fecha && p.monto > 0) {
      docEncontrado = contpaqiFechaMontoList.find(
        (d) => d.fecha === p.fecha && Math.abs(d.total - p.monto) < 0.01 && !d.usado
      )?.raw;
    }

    // Búsqueda con tolerancia de ±2 días si el monto coincide
    if (!docEncontrado && p.effectiveTime && p.monto > 0) {
      const matchTolerante = contpaqiFechaMontoList.find((d) => {
        if (d.usado) return false;
        if (Math.abs(d.total - p.monto) >= 0.01) return false;
        const diffDays = Math.abs(d.time - p.effectiveTime) / (1000 * 60 * 60 * 24);
        return diffDays <= 2.5;
      });
      if (matchTolerante) {
        docEncontrado = matchTolerante.raw;
      }
    }

    if (docEncontrado) {
      const itemInList = contpaqiFechaMontoList.find((d) => d.raw === docEncontrado);
      if (itemInList) itemInList.usado = true;
    }

    p.estaEnContpaqi = !!docEncontrado;
    p.docContpaqiId = docEncontrado?.id || docEncontrado?.cIdDocumento || null;
    p.docContpaqiFolio = docEncontrado ? `${docEncontrado.serie || ''}-${docEncontrado.folio || ''}` : null;

    if (!p.esDuplicado) {
      if (p.estaEnContpaqi) {
        pagosAplicadosCount++;
      } else {
        pagosPendientesCount++;
      }
    }
  }

  // 6. Calcular el Saldo Real Sugerido
  // Si en ContPAQi el saldo es saldoContpaqiApi ($913),
  // los pagos no reflejados en ContPAQi reducen ese saldo:
  const pagosNoReflejados = listaPagosUnificados.filter(p => !p.esDuplicado && !p.estaEnContpaqi);
  const montoPagosNoReflejados = pagosNoReflejados.reduce((acc, p) => acc + p.monto, 0);
  const saldoRealCalculado = Math.max(0, parseFloat((saldoContpaqiApi - montoPagosNoReflejados).toFixed(2)));

  // 7. Reconstruir la cascada de saldos
  // Calculamos el saldo inicial para que la cascada termine exactamente en saldoRealCalculado:
  const pagosValidosTotalMonto = listaPagosUnificados.filter(p => !p.esDuplicado).reduce((acc, p) => acc + p.monto, 0);
  let runningBalance = parseFloat((saldoRealCalculado + pagosValidosTotalMonto).toFixed(2));
  if (totalPagaresMonto > 0 && Math.abs(totalPagaresMonto - runningBalance) < 1) {
    runningBalance = totalPagaresMonto;
  }

  const cadenaAscendente: PagoAuditadoItem[] = [];

  for (let i = 0; i < listaPagosUnificados.length; i++) {
    const p = listaPagosUnificados[i];

    const saldoAnteriorReconstruido = parseFloat(runningBalance.toFixed(2));
    if (!p.esDuplicado) {
      runningBalance = Math.max(0, parseFloat((runningBalance - p.monto).toFixed(2)));
    }
    const saldoNuevoReconstruido = parseFloat(runningBalance.toFixed(2));

    const requiereAjuste =
      p.esDuplicado ||
      !p.estaEnContpaqi ||
      Math.abs(p.saldoNuevoActual - saldoNuevoReconstruido) > 0.05 ||
      Math.abs(p.saldoAnteriorActual - saldoAnteriorReconstruido) > 0.05;

    cadenaAscendente.push({
      id: p.id,
      idpagMysql: null,
      fecha: p.fecha,
      monto: p.monto,
      mora: p.mora,
      gcob: p.gcob,
      concepto: p.esDuplicado ? `⚠️ [DUPLICADO] ${p.concepto}` : p.concepto,
      referencia: p.referencia,
      cobrador: p.cobrador,
      estaEnContpaqi: p.estaEnContpaqi,
      docContpaqiId: p.docContpaqiId,
      docContpaqiFolio: p.docContpaqiFolio,
      saldoAnteriorActual: p.saldoAnteriorActual,
      saldoNuevoActual: p.saldoNuevoActual,
      saldoAnteriorReconstruido,
      saldoNuevoReconstruido,
      requiereAjuste
    });
  }

  const diferenciaErp = parseFloat((saldoErpActual - saldoRealCalculado).toFixed(2));

  let estadoCuadre: 'CUADRADO' | 'DESFASE_SALDO' | 'PAGOS_PENDIENTES_CONTPAQI' = 'CUADRADO';
  if (Math.abs(diferenciaErp) > 0.05) {
    estadoCuadre = 'DESFASE_SALDO';
  } else if (pagosPendientesCount > 0) {
    estadoCuadre = 'PAGOS_PENDIENTES_CONTPAQI';
  }

  // Ordenar la cadena descendente (más reciente arriba) para presentación visual
  const cadenaPagosAuditada = [...cadenaAscendente].reverse();

  return {
    codigo: cod,
    nombre: nombreCliente,
    empresa,
    cobrador,
    saldoContpaqiApi,
    saldoErpActual,
    saldoMysqlActual: saldoErpActual,
    saldoRealCalculado,
    diferenciaErp,
    diferenciaMysql: diferenciaErp,
    estadoCuadre,
    totalPagosAuditados: listaPagosUnificados.length,
    pagosPendientesContpaqi: pagosPendientesCount,
    pagosAplicadosContpaqi: pagosAplicadosCount,
    cadenaPagos: cadenaPagosAuditada,
    detallesContpaqi: {
      totalPagares: totalPagaresMonto,
      totalAbonosContpaqi,
      numPagares: pagares.length,
      numAbonos: abonosContpaqi.length
    }
  };
}

/**
 * Corrige y sincroniza el saldo y la cascada de pagos de un cliente
 */
export async function actualizarSaldosCliente(
  codigoCliente: string,
  prismaClient?: any,
  _connection?: any
) {
  const db = prismaClient || prisma;
  const cod = codigoCliente.trim().toUpperCase();
  const diagnostico = await auditarSaldosCliente(cod, db);

  // 1. Depurar pagos duplicados detectados (Alineación automática que colisiona con tickets)
  const pagosDuplicados = diagnostico.cadenaPagos.filter(p => p.concepto?.includes('[DUPLICADO]'));
  for (const dup of pagosDuplicados) {
    if (dup.id && typeof dup.id === 'string') {
      try {
        await db.pago.delete({ where: { id: dup.id } });
      } catch (dErr: any) {
        console.warn(`No se pudo eliminar pago duplicado ${dup.id}:`, dErr?.message);
      }
    }
  }

  // 2. Re-auditar después de eliminar duplicados para obtener la cascada limpia
  const diagnosticoLimpio = await auditarSaldosCliente(cod, db);

  // 3. Actualizar saldo del cliente en PostgreSQL
  await db.cliente.updateMany({
    where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
    data: { saldoActual: diagnosticoLimpio.saldoRealCalculado }
  });

  // 4. Ajustar saldos de la cadena histórica en cascada
  let pagosActualizados = 0;
  for (const pagoItem of diagnosticoLimpio.cadenaPagos) {
    if (pagoItem.id && typeof pagoItem.id === 'string') {
      try {
        await db.pago.update({
          where: { id: pagoItem.id },
          data: {
            saldoAnterior: pagoItem.saldoAnteriorReconstruido,
            saldoNuevo: pagoItem.saldoNuevoReconstruido
          }
        });
        pagosActualizados++;
      } catch (pErr: any) {
        console.error(`Error actualizando pago ${pagoItem.id}:`, pErr?.message || pErr);
      }
    }
  }

  return {
    success: true,
    mensaje: `Saldo actualizado exitosamente a $${diagnosticoLimpio.saldoRealCalculado.toFixed(2)} para ${cod}.`,
    codigo: cod,
    saldoAnterior: diagnostico.saldoErpActual,
    saldoReal: diagnosticoLimpio.saldoRealCalculado,
    saldoRealCalculado: diagnosticoLimpio.saldoRealCalculado,
    pagosActualizados,
    diagnostico: diagnosticoLimpio
  };
}
