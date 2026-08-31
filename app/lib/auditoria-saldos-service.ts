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

  const abonosSinAsociar = abonosContpaqi.filter(a => parseFloat(a.pendiente || a.CPENDIENTE || 0) > 0)
    .reduce((acc: number, a: any) => acc + (parseFloat(a.pendiente || a.CPENDIENTE || 0) || 0), 0);

  const totalAbonosContpaqi = abonosContpaqi.reduce((acc: number, d: any) => acc + (parseFloat(d.total || d.cTotal || d.CTOTAL || 0) || 0), 0);

  const saldoContpaqiApi = pagares.length > 0
    ? Math.max(0, parseFloat((totalPendientePagares - abonosSinAsociar).toFixed(2)))
    : (docs.find((d: any) => ['100', '4', '5'].includes(String(d.codigoConcepto || '').trim()) && !d.cancelado)?.pendiente || 0);

  // Indexar documentos de ContPAQi por folio y referencia
  const contpaqiFechaMontoList: any[] = [];
  const contpaqiRefSet = new Map<string, any>();

  for (const d of abonosContpaqi) {
    const ref = (d.referencia || '').trim().toUpperCase();
    if (ref && ref !== 'SEMANA' && ref !== 'PAGO' && ref !== 'ABONO') {
      contpaqiRefSet.set(ref, d);
    }
    contpaqiFechaMontoList.push({
      id: d.id || d.cIdDocumento || d.CIDDOCUMENTO,
      folio: `${d.serie || ''}-${d.folio || ''}`,
      fecha: d.fecha ? new Date(d.fecha).toISOString().slice(0, 10) : '',
      total: parseFloat(d.total?.toString() || '0') || 0,
      ref,
      raw: d,
      usado: false
    });
  }

  // 4. Lista de pagos de ERP con fecha efectiva
  const listaPagosUnificados: any[] = [];
  for (const p of pagosErp) {
    const abonoMonto = parseFloat(p.monto?.toString() || '0') || 0;
    const moraMonto = parseFloat(p.moratorios?.toString() || (p as any).interesMoratorio?.toString() || '0') || 0;
    const gcobMonto = parseFloat((p as any).gastosCobranza?.toString() || '0') || 0;

    // Determinar fecha efectiva confiable
    let effectiveDate = p.fechaPago ? new Date(p.fechaPago) : new Date(p.createdAt);
    if (p.ticket?.fecha && Math.abs(new Date(p.ticket.fecha).getTime() - new Date(p.createdAt).getTime()) < 30 * 86400000) {
      effectiveDate = new Date(p.ticket.fecha);
    } else if (p.fechaPago && p.createdAt && Math.abs(new Date(p.fechaPago).getTime() - new Date(p.createdAt).getTime()) > 60 * 86400000) {
      effectiveDate = new Date(p.createdAt);
    }

    const fechaStr = effectiveDate.toISOString().slice(0, 10);
    const ref = p.ticket?.referencia || p.ticket?.folio || p.numeroRecibo || '';

    listaPagosUnificados.push({
      id: p.id,
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
      saldoNuevoActual: parseFloat((p as any).saldoNuevo?.toString() || '0') || 0
    });
  }

  // Ordenar cronológicamente ascendente (del más antiguo al más reciente)
  listaPagosUnificados.sort((a, b) => a.effectiveTime - b.effectiveTime);

  // 5. Reconstrucción y conciliación progresiva
  let pagosPendientesCount = 0;
  let pagosAplicadosCount = 0;

  // Determinar saldo inicial de la cuenta
  let saldoInicial = totalPagaresMonto > 0 ? totalPagaresMonto : 0;
  if (saldoInicial === 0) {
    const totalAbonosErp = listaPagosUnificados.reduce((acc, p) => acc + p.monto, 0);
    saldoInicial = saldoContpaqiApi + totalAbonosErp;
  }

  let runningBalance = saldoInicial;
  const cadenaAscendente: PagoAuditadoItem[] = [];

  for (let i = 0; i < listaPagosUnificados.length; i++) {
    const p = listaPagosUnificados[i];
    const refUpper = (p.referencia || '').trim().toUpperCase();

    let docEncontrado = refUpper && contpaqiRefSet.has(refUpper) ? contpaqiRefSet.get(refUpper) : null;
    if (!docEncontrado && p.fecha && p.monto > 0) {
      docEncontrado = contpaqiFechaMontoList.find(
        (d) => d.fecha === p.fecha && Math.abs(d.total - p.monto) < 0.01 && !d.usado
      )?.raw;
      if (docEncontrado) {
        const itemInList = contpaqiFechaMontoList.find((d) => d.raw === docEncontrado);
        if (itemInList) itemInList.usado = true;
      }
    }
    const estaEnContpaqi = !!docEncontrado;

    if (estaEnContpaqi) {
      pagosAplicadosCount++;
    } else {
      pagosPendientesCount++;
    }

    const saldoAnteriorReconstruido = parseFloat(runningBalance.toFixed(2));
    runningBalance = Math.max(0, parseFloat((runningBalance - p.monto).toFixed(2)));
    const saldoNuevoReconstruido = parseFloat(runningBalance.toFixed(2));

    const requiereAjuste =
      !estaEnContpaqi ||
      Math.abs(p.saldoNuevoActual - saldoNuevoReconstruido) > 0.05 ||
      Math.abs(p.saldoAnteriorActual - saldoAnteriorReconstruido) > 0.05;

    cadenaAscendente.push({
      id: p.id,
      idpagMysql: null,
      fecha: p.fecha,
      monto: p.monto,
      mora: p.mora,
      gcob: p.gcob,
      concepto: p.concepto,
      referencia: p.referencia,
      cobrador: p.cobrador,
      estaEnContpaqi,
      docContpaqiId: docEncontrado?.id || docEncontrado?.cIdDocumento || null,
      docContpaqiFolio: docEncontrado ? `${docEncontrado.serie || ''}-${docEncontrado.folio || ''}` : null,
      saldoAnteriorActual: p.saldoAnteriorActual,
      saldoNuevoActual: p.saldoNuevoActual,
      saldoAnteriorReconstruido,
      saldoNuevoReconstruido,
      requiereAjuste
    });
  }

  const saldoRealCalculado = parseFloat(runningBalance.toFixed(2));
  const diferenciaErp = parseFloat((saldoErpActual - saldoRealCalculado).toFixed(2));

  let estadoCuadre: 'CUADRADO' | 'DESFASE_SALDO' | 'PAGOS_PENDIENTES_CONTPAQI' = 'CUADRADO';
  if (pagosPendientesCount > 0) {
    estadoCuadre = 'PAGOS_PENDIENTES_CONTPAQI';
  } else if (Math.abs(diferenciaErp) > 0.05) {
    estadoCuadre = 'DESFASE_SALDO';
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
    saldoMysqlActual: saldoContpaqiApi,
    saldoRealCalculado,
    diferenciaErp,
    diferenciaMysql: 0,
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

  // 1. Actualizar saldo del cliente en PostgreSQL
  await db.cliente.updateMany({
    where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
    data: { saldoActual: diagnostico.saldoRealCalculado }
  });

  // 2. Si hay pagos registrados en ERP, ajustar saldos de la cadena histórica
  let pagosActualizados = 0;
  for (const pagoItem of diagnostico.cadenaPagos) {
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
    mensaje: `Saldo actualizado exitosamente a $${diagnostico.saldoRealCalculado.toFixed(2)} para ${cod}.`,
    codigo: cod,
    saldoAnterior: diagnostico.saldoErpActual,
    saldoReal: diagnostico.saldoRealCalculado,
    saldoRealCalculado: diagnostico.saldoRealCalculado,
    pagosActualizados,
    diagnostico
  };
}
