import { ContpaqiService } from './contpaqi-service';
import mysql from 'mysql2/promise';

const MYSQL_CONFIG = {
  host: process.env.MYSQL_AUDIT_HOST || '152.53.171.236',
  user: process.env.MYSQL_AUDIT_USER || 'mueblesdaso_cob',
  password: process.env.MYSQL_AUDIT_PASSWORD || 'B4Dl6VlHDo',
  database: process.env.MYSQL_AUDIT_DATABASE || 'mueblesdaso_cob',
  connectTimeout: 8000,
};

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
  if (codUpper.startsWith('DP')) return 'DP';
  return 'DQ';
}

/**
 * Ejecuta la auditoría reconstructiva de saldos para un cliente específico
 */
export async function auditarSaldosCliente(
  codigoCliente: string,
  prismaClient?: any,
  externalMysqlConn?: mysql.Connection
): Promise<DiagnosticoClienteSaldos> {
  const cod = codigoCliente.trim().toUpperCase();
  const empresa = obtenerEmpresaPorCodigo(cod);

  // 1. Obtener conexión a MySQL si no se proporcionó
  const conn = externalMysqlConn || (await mysql.createConnection(MYSQL_CONFIG));
  const shouldCloseConn = !externalMysqlConn;

  try {
    // 2. Consultar datos en MySQL (cat_clientes y pagos)
    const [catCliRows]: any = await conn.query(
      'SELECT cod_cliente, nombre_ccliente, saldo_actualcli, codigo_gestor FROM cat_clientes WHERE cod_cliente = ? LIMIT 1',
      [cod]
    );
    const catCli = catCliRows?.[0] || null;
    const nombreCliente = catCli?.nombre_ccliente || 'Cliente sin nombre';
    const cobrador = catCli?.codigo_gestor || 'Sin Asignar';
    const saldoMysqlActual = parseFloat(catCli?.saldo_actualcli || '0') || 0;

    const [pagosMysql]: any = await conn.query(
      'SELECT idpag, fechap, fechahora, montop, mora, gcob, ref_pago, saldo_actualcli, codigo_gestor FROM pagos WHERE cod_cliente = ? ORDER BY fechap DESC, idpag DESC',
      [cod]
    );

    // 3. Consultar datos en ERP (PostgreSQL) si prismaClient está disponible
    let saldoErpActual = saldoMysqlActual;
    let pagosErp: any[] = [];
    if (prismaClient) {
      try {
        const clienteErp = await prismaClient.cliente.findFirst({
          where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
          include: { pagos: { orderBy: { fechaPago: 'desc' } } }
        });
        if (clienteErp) {
          saldoErpActual = parseFloat(clienteErp.saldoActual?.toString() || '0') || saldoMysqlActual;
          pagosErp = clienteErp.pagos || [];
        }
      } catch (err) {
        console.warn('Advertencia al consultar cliente en PostgreSQL:', err);
      }
    }

    // 4. Consultar ContPAQi API en vivo
    const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
    const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';
    const service = new ContpaqiService({ apiUrl, apiKey, empresa });

    let docs: any[] = [];
    try {
      docs = await service.getClientDocumentos(cod);
    } catch (err: any) {
      console.warn(`No se pudieron obtener documentos de ContPAQi para ${cod}:`, err.message);
    }

    // Calcular saldo fiel de ContPAQi
    const pagares = Array.isArray(docs) ? docs.filter((d: any) => d.codigoConcepto?.trim() === '16' && !d.cancelado) : [];
    const totalPagares = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.total) || 0), 0);

    const abonosContpaqi = Array.isArray(docs)
      ? docs.filter((d: any) => {
          if (d.cancelado) return false;
          const c = d.codigoConcepto?.trim();
          if (empresa === 'DP') return c === '101';
          return c === '102' || c === '101';
        })
      : [];

    const facturaInicial = Array.isArray(docs) ? docs.find((d: any) => d.codigoConcepto?.trim() === '100' && !d.cancelado) : null;

    const abonosCobranza = facturaInicial
      ? abonosContpaqi.filter(
          (d: any) =>
            !(d.referencia && d.referencia.toLowerCase().includes('factura')) &&
            !(new Date(d.fecha).getTime() <= new Date(facturaInicial.fecha).getTime() && (d.referencia || '').includes(String(facturaInicial.folio)))
        )
      : abonosContpaqi;

    const totalAbonosContpaqi = abonosCobranza.reduce((acc: number, d: any) => acc + (parseFloat(d.total) || 0), 0);
    const saldoContpaqiApi = totalPagares > 0 ? parseFloat((totalPagares - totalAbonosContpaqi).toFixed(2)) : 0;

    // Mapa de documentos de ContPAQi por idpag (Extra1) y por serie-folio/referencia específica
    const contpaqiExtra1Set = new Map<string, any>();
    const contpaqiRefSet = new Map<string, any>();
    const contpaqiFechaMontoList: any[] = [];

    for (const d of abonosCobranza) {
      const extra = (d.textoExtra1 || '').trim();
      if (extra) {
        contpaqiExtra1Set.set(extra, d);
      }
      const ref = (d.referencia || '').trim().toUpperCase();
      // Solo indexar referencias que sean identificadores específicos (ej: TICKET ID..., folios numéricos)
      // y no palabras genéricas como "SEMANA", "PAGO", "ABONO", "INI SEM"
      const esRefGenerica = !ref || ref === 'SEMANA' || ref.startsWith('SEMANA') || ref === 'PAGO' || ref === 'ABONO' || ref.startsWith('INI SEM');
      if (ref && !esRefGenerica) {
        contpaqiRefSet.set(ref, d);
      }

      contpaqiFechaMontoList.push({
        id: d.id,
        folio: `${d.serie || ''}-${d.folio || ''}`,
        fecha: d.fecha ? new Date(d.fecha).toISOString().slice(0, 10) : '',
        total: parseFloat(d.total?.toString() || '0') || 0,
        extra1: extra,
        ref: ref,
        raw: d
      });
    }

    // 5. Unificar lista cronológica de pagos (ordenados de MÁS RECIENTE a MÁS ANTIGUO)
    const listaPagosUnificados: any[] = [];
    if (Array.isArray(pagosMysql) && pagosMysql.length > 0) {
      for (const p of pagosMysql) {
        listaPagosUnificados.push({
          id: p.idpag,
          idpagMysql: p.idpag,
          fecha: p.fechap ? new Date(p.fechap).toISOString().slice(0, 10) : '',
          monto: parseFloat(p.montop?.toString() || '0') || 0,
          mora: parseFloat(p.mora?.toString() || '0') || 0,
          gcob: parseFloat(p.gcob?.toString() || '0') || 0,
          concepto: p.ref_pago || 'Pago regular',
          referencia: p.ref_pago || '',
          cobrador: p.codigo_gestor || cobrador,
          saldoActualRegistrado: parseFloat(p.saldo_actualcli?.toString() || '0') || 0
        });
      }
    } else if (pagosErp.length > 0) {
      for (const p of pagosErp) {
        listaPagosUnificados.push({
          id: p.id,
          idpagMysql: null,
          fecha: p.fechaPago ? new Date(p.fechaPago).toISOString().slice(0, 10) : '',
          monto: parseFloat(p.monto?.toString() || '0') || 0,
          mora: parseFloat(p.interesMoratorio?.toString() || '0') || 0,
          gcob: parseFloat(p.gastosCobranza?.toString() || '0') || 0,
          concepto: p.concepto || 'Pago regular',
          referencia: p.numeroRecibo || p.concepto || '',
          cobrador: cobrador,
          saldoActualRegistrado: parseFloat(p.saldoNuevo?.toString() || '0') || 0
        });
      }
    }

    // Ordenar descendente (más reciente primero)
    listaPagosUnificados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // 6. ALGORITMO DE RECONSTRUCCIÓN EN CASCADA
    // Se recorre desde el pago más reciente hacia el más antiguo.
    const cadenaPagosAuditada: PagoAuditadoItem[] = [];
    let saldoPivote = saldoContpaqiApi;
    let pagosPendientesCount = 0;
    let pagosAplicadosCount = 0;

    for (let i = 0; i < listaPagosUnificados.length; i++) {
      const p = listaPagosUnificados[i];
      const idStr = String(p.idpagMysql || p.id || '');
      const refUpper = (p.referencia || '').trim().toUpperCase();

      // Verificar si ya está en ContPAQi por Extra1 (idpag), referencia específica, o fecha+monto exactos
      let docEncontrado = contpaqiExtra1Set.get(idStr) || (refUpper && contpaqiRefSet.has(refUpper) ? contpaqiRefSet.get(refUpper) : null);
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

      let saldoAnteriorReconstruido = 0;
      let saldoNuevoReconstruido = 0;

      if (!estaEnContpaqi) {
        // Pago pendiente de subir a ContPAQi:
        // Su saldo anterior es el saldo de ContPAQi (o el pivote acumulado) y su nuevo saldo es saldoAnterior - monto
        saldoAnteriorReconstruido = parseFloat(saldoPivote.toFixed(2));
        saldoNuevoReconstruido = parseFloat((saldoPivote - p.monto).toFixed(2));
        saldoPivote = saldoNuevoReconstruido;
        pagosPendientesCount++;
      } else {
        // Pago YA aplicado en ContPAQi:
        // El saldo actual de ContPAQi ya tiene restado este pago, por lo que su saldoNuevo es el saldo base y saldoAnterior es saldoNuevo + monto
        saldoNuevoReconstruido = parseFloat(saldoPivote.toFixed(2));
        saldoAnteriorReconstruido = parseFloat((saldoPivote + p.monto).toFixed(2));
        saldoPivote = saldoAnteriorReconstruido;
        pagosAplicadosCount++;
      }

      const saldoNuevoActual = p.saldoActualRegistrado;
      const saldoAnteriorActual = p.saldoActualRegistrado + p.monto;
      const requiereAjuste = Math.abs(saldoNuevoActual - saldoNuevoReconstruido) > 0.01;

      cadenaPagosAuditada.push({
        id: p.id,
        idpagMysql: p.idpagMysql,
        fecha: p.fecha,
        monto: p.monto,
        mora: p.mora,
        gcob: p.gcob,
        concepto: p.concepto,
        referencia: p.referencia,
        cobrador: p.cobrador,
        estaEnContpaqi,
        docContpaqiId: docEncontrado?.id || null,
        docContpaqiFolio: docEncontrado ? `${docEncontrado.serie || ''}-${docEncontrado.folio || ''}` : null,
        saldoAnteriorActual,
        saldoNuevoActual,
        saldoAnteriorReconstruido,
        saldoNuevoReconstruido,
        requiereAjuste
      });
    }

    // El saldo real calculado actual del cliente es el saldoNuevo del pago más reciente (o saldoContpaqiApi si no hay pagos)
    const saldoRealCalculado =
      cadenaPagosAuditada.length > 0 ? cadenaPagosAuditada[0].saldoNuevoReconstruido : saldoContpaqiApi;

    const diferenciaErp = parseFloat((saldoErpActual - saldoRealCalculado).toFixed(2));
    const diferenciaMysql = parseFloat((saldoMysqlActual - saldoRealCalculado).toFixed(2));

    let estadoCuadre: 'CUADRADO' | 'DESFASE_SALDO' | 'PAGOS_PENDIENTES_CONTPAQI' = 'CUADRADO';
    if (Math.abs(diferenciaErp) > 0.01 || Math.abs(diferenciaMysql) > 0.01) {
      estadoCuadre = 'DESFASE_SALDO';
    } else if (pagosPendientesCount > 0) {
      estadoCuadre = 'PAGOS_PENDIENTES_CONTPAQI';
    }

    return {
      codigo: cod,
      nombre: nombreCliente,
      empresa,
      cobrador,
      saldoContpaqiApi,
      saldoErpActual,
      saldoMysqlActual,
      saldoRealCalculado,
      diferenciaErp,
      diferenciaMysql,
      estadoCuadre,
      totalPagosAuditados: cadenaPagosAuditada.length,
      pagosPendientesContpaqi: pagosPendientesCount,
      pagosAplicadosContpaqi: pagosAplicadosCount,
      cadenaPagos: cadenaPagosAuditada,
      detallesContpaqi: {
        totalPagares,
        totalAbonosContpaqi,
        numPagares: pagares.length,
        numAbonos: abonosCobranza.length
      }
    };
  } finally {
    if (shouldCloseConn) {
      await conn.end();
    }
  }
}

/**
 * Aplica la corrección del saldo actual y la cascada histórica de pagos para un cliente
 */
export async function actualizarSaldosCliente(
  codigoCliente: string,
  prismaClient?: any,
  externalMysqlConn?: mysql.Connection
): Promise<{ success: boolean; mensaje: string; saldoReal: number; pagosActualizados: number }> {
  const conn = externalMysqlConn || (await mysql.createConnection(MYSQL_CONFIG));
  const shouldCloseConn = !externalMysqlConn;

  try {
    // 1. Ejecutar auditoría para obtener la cadena reconstruida
    const diag = await auditarSaldosCliente(codigoCliente, prismaClient, conn);
    const { saldoRealCalculado, cadenaPagos } = diag;

    let pagosActualizados = 0;

    // 2. Actualizar saldo actual en MySQL (cat_clientes)
    await conn.query(
      'UPDATE cat_clientes SET saldo_actualcli = ? WHERE cod_cliente = ?',
      [saldoRealCalculado.toFixed(2), diag.codigo]
    );

    // 3. Actualizar saldos en cada registro de pago en MySQL
    for (const p of cadenaPagos) {
      if (p.idpagMysql) {
        await conn.query(
          'UPDATE pagos SET saldo_actualcli = ? WHERE idpag = ?',
          [p.saldoNuevoReconstruido.toFixed(2), p.idpagMysql]
        );
        pagosActualizados++;
      }
    }

    // 4. Actualizar en PostgreSQL (ERP) si está disponible
    if (prismaClient) {
      try {
        const cliErp = await prismaClient.cliente.findFirst({
          where: { codigoCliente: { equals: diag.codigo, mode: 'insensitive' } }
        });
        if (cliErp) {
          await prismaClient.cliente.update({
            where: { id: cliErp.id },
            data: {
              saldoActual: saldoRealCalculado,
              estadoCuentaCache: {
                cachedAt: new Date().toISOString(),
                saldoRealContpaqi: saldoRealCalculado,
                data: {
                  saldoActual: saldoRealCalculado,
                  saldoTotal: saldoRealCalculado,
                  saldoContpaqi: diag.saldoContpaqiApi
                }
              }
            }
          });

          // Actualizar pagos en PostgreSQL
          for (const p of cadenaPagos) {
            await prismaClient.pago.updateMany({
              where: {
                clienteId: cliErp.id,
                OR: [
                  { id: String(p.id) },
                  { numeroRecibo: String(p.referencia) },
                  { concepto: { contains: String(p.id) } }
                ]
              },
              data: {
                saldoAnterior: p.saldoAnteriorReconstruido,
                saldoNuevo: p.saldoNuevoReconstruido
              }
            });
          }
        }
      } catch (err: any) {
        console.warn('Advertencia al actualizar PostgreSQL en corrección de saldo:', err.message);
      }
    }

    return {
      success: true,
      mensaje: `Saldo actualizado exitosamente a $${saldoRealCalculado.toFixed(2)} (${pagosActualizados} pagos reajustados)`,
      saldoReal: saldoRealCalculado,
      pagosActualizados
    };
  } finally {
    if (shouldCloseConn) {
      await conn.end();
    }
  }
}
