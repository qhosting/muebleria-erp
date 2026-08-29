import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export const dynamic = 'force-dynamic';

/**
 * Función auxiliar para determinar la empresa de Contpaqi a partir del código de cliente
 * DQ... -> Empresa DQ
 * DP... -> Empresa DP (por defecto)
 */
function getEmpresaPorCodigo(codigo: string): 'DP' | 'DQ' {
  const cod = (codigo || '').trim().toUpperCase();
  if (cod.startsWith('DQ')) return 'DQ';
  return 'DP';
}

/**
 * GET: Obtener auditoría y cruce de cobros entre muebleria-erp (PostgreSQL) y ContPAQi Comercial API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fechaInicioStr = searchParams.get('fechaInicio');
    const fechaFinStr = searchParams.get('fechaFin');
    const cobradorFiltro = searchParams.get('cobrador') || 'all';
    const codigoClienteFiltro = searchParams.get('codigoCliente')?.trim().toUpperCase();
    const soloDiferencias = searchParams.get('soloDiferencias') === 'true';

    // Rango de fechas por defecto: semana actual (sábado a viernes)
    let fechaInicio: Date;
    let fechaFin: Date;

    if (fechaInicioStr && fechaFinStr) {
      fechaInicio = new Date(`${fechaInicioStr}T00:00:00.000`);
      fechaFin = new Date(`${fechaFinStr}T23:59:59.999`);
    } else {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const sabado = new Date(hoy);
      sabado.setDate(hoy.getDate() - ((diaSemana + 1) % 7));
      sabado.setHours(0, 0, 0, 0);

      const viernes = new Date(sabado);
      viernes.setDate(sabado.getDate() + 6);
      viernes.setHours(23, 59, 59, 999);

      fechaInicio = sabado;
      fechaFin = viernes;
    }

    // 1. Obtener lista de cobradores y gestores activos en ERP
    const cobradoresDB = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'cobrador' },
          { role: 'admin' },
          { codigoGestor: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        codigoGestor: true,
        rutaAsignada: true,
      },
      orderBy: { name: 'asc' }
    });

    const cobradoresList = Array.from(
      new Set(
        cobradoresDB.map(c => c.codigoGestor || c.name || c.username).filter(Boolean)
      )
    ).sort();

    // 2. Construir filtros para consultar pagos en muebleria-erp (PostgreSQL)
    const wherePagos: any = {
      fechaPago: {
        gte: fechaInicio,
        lte: fechaFin
      }
    };

    if (cobradorFiltro && cobradorFiltro !== 'all') {
      const cobradorMatch = cobradoresDB.find(
        c => (c.codigoGestor && c.codigoGestor.toLowerCase() === cobradorFiltro.toLowerCase()) ||
             (c.name && c.name.toLowerCase() === cobradorFiltro.toLowerCase()) ||
             (c.username && c.username.toLowerCase() === cobradorFiltro.toLowerCase()) ||
             (c.id === cobradorFiltro)
      );

      if (cobradorMatch) {
        wherePagos.OR = [
          { cobradorId: cobradorMatch.id },
          { cobrador: { codigoGestor: { equals: cobradorFiltro, mode: 'insensitive' } } },
          { cobrador: { name: { contains: cobradorFiltro, mode: 'insensitive' } } },
          { cobrador: { username: { contains: cobradorFiltro, mode: 'insensitive' } } }
        ];
      }
    }

    if (codigoClienteFiltro) {
      wherePagos.cliente = {
        codigoCliente: { equals: codigoClienteFiltro, mode: 'insensitive' }
      };
    }

    // 3. Consultar pagos registrados en ERP
    const pagosErpRaw = await prisma.pago.findMany({
      where: wherePagos,
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombreCompleto: true,
            saldoActual: true,
            cobradorAsignado: {
              select: { name: true, codigoGestor: true }
            }
          }
        },
        cobrador: {
          select: {
            id: true,
            name: true,
            codigoGestor: true,
            username: true
          }
        },
        ticket: {
          select: {
            id: true,
            folioRecibo: true,
            fechaPago: true,
            creadoEn: true
          }
        }
      },
      orderBy: { fechaPago: 'asc' }
    });

    // 4. Si se especificó un cliente en particular pero no tuvo pagos en el rango, buscar el cliente en ERP
    let clientesExtra: any[] = [];
    if (codigoClienteFiltro) {
      const cli = await prisma.cliente.findFirst({
        where: { codigoCliente: { equals: codigoClienteFiltro, mode: 'insensitive' } },
        include: {
          cobradorAsignado: {
            select: { name: true, codigoGestor: true }
          }
        }
      });
      if (cli && !pagosErpRaw.some(p => p.cliente?.codigoCliente?.toUpperCase() === codigoClienteFiltro)) {
        clientesExtra.push(cli);
      }
    }

    // 5. Agrupar pagos de ERP por cliente
    const erpPorCliente = new Map<string, {
      cliente: any;
      cobrador: string;
      pagos: any[];
      montoAbono: number;
      montoMora: number;
      montoGcob: number;
      montoTotal: number;
    }>();

    for (const p of pagosErpRaw) {
      const cod = (p.cliente?.codigoCliente || 'SIN_CODIGO').trim().toUpperCase();
      if (!erpPorCliente.has(cod)) {
        const cobradorNombre = p.cobrador?.codigoGestor || p.cobrador?.name || p.cliente?.cobradorAsignado?.codigoGestor || p.cliente?.cobradorAsignado?.name || 'Cobrador Desconocido';
        erpPorCliente.set(cod, {
          cliente: p.cliente,
          cobrador: cobradorNombre,
          pagos: [],
          montoAbono: 0,
          montoMora: 0,
          montoGcob: 0,
          montoTotal: 0
        });
      }

      const item = erpPorCliente.get(cod)!;
      const abono = parseFloat(p.monto.toString()) || 0;
      const mora = parseFloat(p.moratorios?.toString() || '0') || 0;
      const gcob = parseFloat((p as any).gastosCobranza?.toString() || '0') || 0;
      const total = abono + mora + gcob;

      item.montoAbono += abono;
      item.montoMora += mora;
      item.montoGcob += gcob;
      item.montoTotal += total;

      const sincronizadoContpaqi = (p.metadatos as any)?.contpaqiAfectado === true || 
                                   (p.metadatos as any)?.contpaqiDocId !== undefined ||
                                   (p.concepto || '').includes('ContPAQi') ||
                                   (p.referencia || '').includes('CONTPAQI');

      item.pagos.push({
        id: p.id,
        fecha: p.fechaPago.toISOString(),
        montoAbono: abono,
        mora,
        gcob,
        montoTotal: total,
        referencia: p.referencia || p.ticket?.folioRecibo || p.numeroRecibo || (p.concepto ? `${p.concepto}` : `Recibo #${p.id.slice(0, 8)}`),
        cobrador: p.cobrador?.codigoGestor || p.cobrador?.name || item.cobrador,
        sincronizadoContpaqi
      });
    }

    // Agregar clientes adicionales si se buscaron por código
    for (const cli of clientesExtra) {
      const cod = cli.codigoCliente.trim().toUpperCase();
      if (!erpPorCliente.has(cod)) {
        erpPorCliente.set(cod, {
          cliente: cli,
          cobrador: cli.cobradorAsignado?.codigoGestor || cli.cobradorAsignado?.name || 'Sin Asignar',
          pagos: [],
          montoAbono: 0,
          montoMora: 0,
          montoGcob: 0,
          montoTotal: 0
        });
      }
    }

    // 6. Consultar ContPAQi Comercial API para los clientes auditados
    const serviceDP = await getContpaqiService(prisma, 'DP').catch(() => null);
    const serviceDQ = await getContpaqiService(prisma, 'DQ').catch(() => null);

    const codigosAuditados = Array.from(erpPorCliente.keys());
    const contpaqiPorCliente = new Map<string, {
      pagos: any[];
      montoAbono: number;
      montoMora: number;
      montoTotal: number;
      saldoContpaqi: number;
      pagaresPendientesCount: number;
    }>();

    // Consultar ContPAQi en paralelo controlado
    const contpaqiPromises = codigosAuditados.map(async (cod) => {
      const emp = getEmpresaPorCodigo(cod);
      const srv = emp === 'DQ' ? serviceDQ : serviceDP;
      if (!srv) return;

      try {
        const docs = await srv.getClientDocumentos(cod);
        if (!Array.isArray(docs)) return;

        // Filtrar pagarés (Concepto 16)
        const pagares = docs.filter((d: any) => {
          const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
          return c === '16' && !d.cancelado;
        });

        const totalPendientePagares = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || d.CPENDIENTE || 0) || 0), 0);
        
        // Abonos sin asociar
        const abonosSinAsociar = docs.filter((d: any) => {
          const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
          return ['101', '102'].includes(c) && !d.cancelado && (parseFloat(d.pendiente || d.CPENDIENTE || 0) > 0);
        }).reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || d.CPENDIENTE || 0) || 0), 0);

        const saldoContpaqi = Math.max(0, parseFloat((totalPendientePagares - abonosSinAsociar).toFixed(2)));

        // Abonos dentro del rango de fechas
        const abonosEnRango = docs.filter((d: any) => {
          if (d.cancelado) return false;
          const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
          if (!['101', '102'].includes(c)) return false;

          const fDoc = new Date(d.fecha || d.cFecha || d.CFECHA);
          return fDoc >= fechaInicio && fDoc <= fechaFin;
        });

        let montoAbonoCp = 0;
        let montoMoraCp = 0;
        const pagosCpList: any[] = [];

        abonosEnRango.forEach((a: any) => {
          const c = String(a.codigoConcepto || a.Concepto || a.concepto || a.CCODIGOCONCEPTO || a.CIDCONCEPTO || '').trim();
          const tot = parseFloat(a.total || a.cTotal || a.CTOTAL || 0) || 0;
          if (c === '102') {
            montoMoraCp += tot;
          } else {
            montoAbonoCp += tot;
          }

          pagosCpList.push({
            id: a.id || a.cIdDocumento || a.CIDDOCUMENTO,
            fecha: (a.fecha || a.cFecha || a.CFECHA || '').slice(0, 10),
            montoAbono: tot,
            mora: 0,
            gcob: 0,
            montoTotal: tot,
            referencia: a.serie ? `${a.serie}-${a.folio}` : `Folio ${a.folio}`,
            cobrador: 'ContPAQi Comercial'
          });
        });

        contpaqiPorCliente.set(cod, {
          pagos: pagosCpList,
          montoAbono: montoAbonoCp,
          mora: montoMoraCp,
          montoTotal: montoAbonoCp + montoMoraCp,
          saldoContpaqi,
          pagaresPendientesCount: pagares.filter((p: any) => parseFloat(p.pendiente || 0) > 0).length
        });
      } catch (err: any) {
        console.warn(`Aviso ContPAQi para ${cod}:`, err.message);
      }
    });

    await Promise.all(contpaqiPromises);

    // 7. Consolidar Diagnóstico de Clientes
    const clientesCruce: any[] = [];

    let totalPagosErpCount = 0;
    let totalPagosContpaqiCount = 0;
    let montoAbonoErpGlobal = 0;
    let montoMoraErpGlobal = 0;
    let montoGcobErpGlobal = 0;
    let montoTotalErpGlobal = 0;

    let montoAbonoContpaqiGlobal = 0;
    let montoMoraContpaqiGlobal = 0;
    let montoTotalContpaqiGlobal = 0;

    let totalCuadrados = 0;
    let totalDesfaseMonto = 0;
    let totalDesfaseSaldo = 0;
    let totalFaltantesErp = 0;
    let totalPendientesContpaqi = 0;

    for (const [cod, erpData] of erpPorCliente.entries()) {
      const cpData = contpaqiPorCliente.get(cod) || {
        pagos: [],
        montoAbono: 0,
        mora: 0,
        montoTotal: 0,
        saldoContpaqi: 0,
        pagaresPendientesCount: 0
      };

      const saldoErp = parseFloat(erpData.cliente?.saldoActual?.toString() || '0') || 0;
      const saldoContpaqi = cpData.saldoContpaqi;
      const diferenciaSaldo = parseFloat((saldoErp - saldoContpaqi).toFixed(2));

      const erpTotal = parseFloat(erpData.montoTotal.toFixed(2));
      const contpaqiTotal = parseFloat(cpData.montoTotal.toFixed(2));
      const diferenciaCobro = parseFloat((erpTotal - contpaqiTotal).toFixed(2));
      const diferenciaAbono = parseFloat((erpData.montoAbono - cpData.montoAbono).toFixed(2));
      const diferenciaMora = parseFloat((erpData.montoMora - (cpData.mora || 0)).toFixed(2));

      totalPagosErpCount += erpData.pagos.length;
      totalPagosContpaqiCount += cpData.pagos.length;
      montoAbonoErpGlobal += erpData.montoAbono;
      montoMoraErpGlobal += erpData.montoMora;
      montoGcobErpGlobal += erpData.montoGcob;
      montoTotalErpGlobal += erpData.montoTotal;

      montoAbonoContpaqiGlobal += cpData.montoAbono;
      montoMoraContpaqiGlobal += (cpData.mora || 0);
      montoTotalContpaqiGlobal += cpData.montoTotal;

      // Determinar Estado
      let estado: 'CUADRADO' | 'DESFASE_MONTO' | 'FALTANTE_ERP' | 'FALTANTE_MYSQL' = 'CUADRADO';
      let estadoContpaqi: 'APLICADO' | 'PENDIENTE' | 'NO_APLICA' = 'APLICADO';

      if (erpData.pagos.length > 0 && cpData.pagos.length === 0) {
        estado = 'FALTANTE_MYSQL'; // Pagos en ERP que no están en ContPAQi
        estadoContpaqi = 'PENDIENTE';
        totalPendientesContpaqi++;
      } else if (cpData.pagos.length > erpData.pagos.length || contpaqiTotal > erpTotal + 0.01) {
        estado = 'FALTANTE_ERP'; // Abonos en ContPAQi no registrados en ERP
        totalFaltantesErp++;
      } else if (Math.abs(diferenciaCobro) > 0.05) {
        estado = 'DESFASE_MONTO';
        totalDesfaseMonto++;
      } else if (Math.abs(diferenciaSaldo) > 0.05) {
        estado = 'CUADRADO'; // Monto cuadrado, pero saldo desfasado
        totalDesfaseSaldo++;
      } else {
        estado = 'CUADRADO';
        totalCuadrados++;
      }

      if (erpData.pagos.some(p => !p.sincronizadoContpaqi) && cpData.pagos.length < erpData.pagos.length) {
        estadoContpaqi = 'PENDIENTE';
      }

      // Si se pide solo diferencias, filtrar los que estén perfectamente cuadrados en todo
      if (soloDiferencias && estado === 'CUADRADO' && Math.abs(diferenciaSaldo) < 0.05 && estadoContpaqi === 'APLICADO') {
        continue;
      }

      clientesCruce.push({
        codigo: cod,
        nombre: erpData.cliente?.nombreCompleto || 'Cliente Sin Nombre',
        cobrador: erpData.cobrador,
        empresaContpaqi: getEmpresaPorCodigo(cod),
        saldoErp,
        saldoMysql: saldoContpaqi, // Mapeado para compatibilidad con la UI
        saldoContpaqi,
        diferenciaSaldo,
        diferenciaSaldoContpaqi: diferenciaSaldo,
        
        // Pagos en ERP
        erpPagos: erpData.pagos,
        erpAbono: erpData.montoAbono,
        erpMora: erpData.montoMora,
        erpGcob: erpData.montoGcob,
        erpTotal,

        // Abonos en ContPAQi (mapeado en mysqlPagos para compatibilidad total con la UI existente)
        mysqlPagos: cpData.pagos,
        mysqlAbono: cpData.montoAbono,
        mysqlMora: cpData.mora || 0,
        mysqlGcob: 0,
        mysqlTotal: cpData.montoTotal,

        diferencia: diferenciaCobro,
        diferenciaAbono,
        diferenciaMora,
        estado,
        estadoContpaqi
      });
    }

    // Ordenar: primero los que tienen diferencias o pagos pendientes
    clientesCruce.sort((a, b) => {
      if (a.estado !== 'CUADRADO' && b.estado === 'CUADRADO') return -1;
      if (a.estado === 'CUADRADO' && b.estado !== 'CUADRADO') return 1;
      if (Math.abs(a.diferenciaSaldo) > Math.abs(b.diferenciaSaldo)) return -1;
      return a.codigo.localeCompare(b.codigo);
    });

    const totalAuditados = clientesCruce.length;
    const porcentajeCuadre = totalAuditados > 0 ? Math.round((totalCuadrados / totalAuditados) * 100) : 100;

    const resumenCruce = {
      fechaInicio: fechaInicio.toISOString().slice(0, 10),
      fechaFin: fechaFin.toISOString().slice(0, 10),
      cobradorFiltro,
      totalPagosMysql: totalPagosContpaqiCount,
      totalPagosErp: totalPagosErpCount,
      
      // ContPAQi Comercial (mapeado en campos Mysql para compatibilidad UI)
      montoAbonoMysql: montoAbonoContpaqiGlobal,
      montoMoraMysql: montoMoraContpaqiGlobal,
      montoGcobMysql: 0,
      montoTotalMysql: montoTotalContpaqiGlobal,

      // ERP
      montoAbonoErp: montoAbonoErpGlobal,
      montoMoraErp: montoMoraErpGlobal,
      montoGcobErp: montoGcobErpGlobal,
      montoTotalErp: montoTotalErpGlobal,

      // Diferencias Globales
      diferenciaGlobal: parseFloat((montoTotalErpGlobal - montoTotalContpaqiGlobal).toFixed(2)),
      diferenciaAbonoGlobal: parseFloat((montoAbonoErpGlobal - montoAbonoContpaqiGlobal).toFixed(2)),
      diferenciaMoraGlobal: parseFloat((montoMoraErpGlobal - montoMoraContpaqiGlobal).toFixed(2)),

      totalClientesAuditados: totalAuditados,
      totalCuadrados,
      totalDesfaseMonto,
      totalDesfaseSaldo,
      totalFaltantesErp,
      totalFaltantesMysql: totalPendientesContpaqi,
      porcentajeCuadre,

      totalContpaqiAplicados: totalPagosContpaqiCount,
      totalContpaqiPendientes: totalPendientesContpaqi
    };

    return NextResponse.json({
      success: true,
      cobradoresList,
      resumen: resumenCruce,
      clientes: clientesCruce
    });

  } catch (error: any) {
    console.error('Error en GET /api/tesoreria/auditoria/cruce-mysql:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener auditoría' }, { status: 500 });
  }
}

/**
 * POST: Ejecutar acciones operativas de auditoría
 * - aplicar_contpaqi: Crear y afectar documentos en ContPAQi Comercial API
 * - sincronizar_saldo: Sincronizar saldo de PostgreSQL con los pagarés de ContPAQi
 * - auto_alinear / importar_contpaqi: Importar abonos de ContPAQi a PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const accion = body.accion || 'aplicar_contpaqi';
    const codigoCliente = body.codigoCliente?.trim().toUpperCase();

    const serviceDP = await getContpaqiService(prisma, 'DP').catch(() => null);
    const serviceDQ = await getContpaqiService(prisma, 'DQ').catch(() => null);

    // =========================================================================
    // ACCIÓN 1: APLICAR PAGOS DE ERP A CONTPAQI COMERCIAL API
    // =========================================================================
    if (accion === 'aplicar_contpaqi') {
      const pagosIds: string[] = body.pagosIds || [];
      let pagosPendientes: any[] = [];

      if (pagosIds.length > 0) {
        pagosPendientes = await prisma.pago.findMany({
          where: { id: { in: pagosIds } },
          include: {
            cliente: true,
            cobrador: true,
            ticket: true
          }
        });
      } else if (codigoCliente) {
        pagosPendientes = await prisma.pago.findMany({
          where: {
            cliente: { codigoCliente: { equals: codigoCliente, mode: 'insensitive' } }
          },
          include: {
            cliente: true,
            cobrador: true,
            ticket: true
          },
          orderBy: { fechaPago: 'asc' }
        });
      }

      let contpaqiExitosos = 0;
      let contpaqiErrores = 0;
      const erroresDetalle: string[] = [];

      for (const p of pagosPendientes) {
        const cod = p.cliente?.codigoCliente?.trim().toUpperCase();
        if (!cod) continue;

        const emp = getEmpresaPorCodigo(cod);
        const srv = emp === 'DQ' ? serviceDQ : serviceDP;

        if (!srv) {
          contpaqiErrores++;
          erroresDetalle.push(`No hay servicio ContPAQi configurado para empresa ${emp}`);
          continue;
        }

        try {
          const conceptoAbono = emp === 'DQ' ? '102' : '101';
          const abonoMonto = parseFloat(p.monto.toString()) || 0;

          // Registrar documento en ContPAQi
          const nuevoDoc = await srv.createDocumento({
            codigoConcepto: conceptoAbono,
            codigoCliente: cod,
            fecha: p.fechaPago.toISOString().slice(0, 10),
            total: abonoMonto,
            referencia: p.ticket?.folioRecibo || p.numeroRecibo || `PAGO ERP #${p.id.slice(0, 8)}`,
            observaciones: `Registrado desde VertexERP por ${p.cobrador?.name || 'Cobrador'}`,
            empresa: emp
          });

          if (nuevoDoc && (nuevoDoc.id || nuevoDoc.cIdDocumento || nuevoDoc.CIDDOCUMENTO)) {
            const docId = nuevoDoc.id || nuevoDoc.cIdDocumento || nuevoDoc.CIDDOCUMENTO;
            
            // Afectar documento en ContPAQi
            await srv.afectarDocumento(docId).catch(() => {});

            // Marcar en ERP como sincronizado
            await prisma.pago.update({
              where: { id: p.id },
              data: {
                metadatos: {
                  ...((p.metadatos as any) || {}),
                  contpaqiAfectado: true,
                  contpaqiDocId: docId,
                  sincronizadoEn: new Date().toISOString()
                }
              }
            });

            contpaqiExitosos++;
          }
        } catch (err: any) {
          contpaqiErrores++;
          erroresDetalle.push(`Error en pago ${p.id.slice(0, 8)} (${cod}): ${err.message}`);
        }
      }

      return NextResponse.json({
        success: true,
        mensaje: `Proceso ContPAQi finalizado: ${contpaqiExitosos} pagos aplicados exitosamente${contpaqiErrores > 0 ? `, ${contpaqiErrores} con incidencias` : ''}.`,
        contpaqiExitosos,
        contpaqiErrores,
        errores: erroresDetalle
      });
    }

    // =========================================================================
    // ACCIÓN 2: SINCRONIZAR SALDO FIEL DE PAGARÉS CONTPAQI CON ERP
    // =========================================================================
    if (accion === 'sincronizar_saldo' || accion === 'sincronizar_saldo_contpaqi') {
      if (!codigoCliente) {
        return NextResponse.json({ error: 'Falta codigoCliente para sincronizar saldo' }, { status: 400 });
      }

      const emp = getEmpresaPorCodigo(codigoCliente);
      const srv = emp === 'DQ' ? serviceDQ : serviceDP;

      if (!srv) {
        return NextResponse.json({ error: `Servicio ContPAQi no disponible para ${emp}` }, { status: 500 });
      }

      const docs = await srv.getClientDocumentos(codigoCliente);
      if (!Array.isArray(docs)) {
        return NextResponse.json({ error: 'No se encontraron documentos en ContPAQi' }, { status: 404 });
      }

      const pagares = docs.filter((d: any) => {
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return c === '16' && !d.cancelado;
      });

      const totalPendientePagares = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || d.CPENDIENTE || 0) || 0), 0);
      const abonosSinAsociar = docs.filter((d: any) => {
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return ['101', '102'].includes(c) && !d.cancelado && (parseFloat(d.pendiente || d.CPENDIENTE || 0) > 0);
      }).reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || d.CPENDIENTE || 0) || 0), 0);

      const saldoFiel = Math.max(0, parseFloat((totalPendientePagares - abonosSinAsociar).toFixed(2)));

      const updated = await prisma.cliente.updateMany({
        where: { codigoCliente: { equals: codigoCliente, mode: 'insensitive' } },
        data: { saldoActual: saldoFiel }
      });

      return NextResponse.json({
        success: true,
        mensaje: `Saldo actualizado exitosamente a $${saldoFiel.toFixed(2)} para ${codigoCliente}.`,
        saldoActual: saldoFiel,
        clientesActualizados: updated.count
      });
    }

    // =========================================================================
    // ACCIÓN 3: IMPORTAR ABONOS DE CONTPAQI A MUEBLERIA-ERP
    // =========================================================================
    if (accion === 'auto_alinear' || accion === 'importar_contpaqi') {
      if (!codigoCliente) {
        return NextResponse.json({ error: 'Falta codigoCliente para importar' }, { status: 400 });
      }

      const emp = getEmpresaPorCodigo(codigoCliente);
      const srv = emp === 'DQ' ? serviceDQ : serviceDP;

      if (!srv) {
        return NextResponse.json({ error: `Servicio ContPAQi no disponible para ${emp}` }, { status: 500 });
      }

      const cliente = await prisma.cliente.findFirst({
        where: { codigoCliente: { equals: codigoCliente, mode: 'insensitive' } },
        include: { cobradorAsignado: true }
      });

      if (!cliente) {
        return NextResponse.json({ error: `Cliente ${codigoCliente} no existe en ERP` }, { status: 404 });
      }

      const docs = await srv.getClientDocumentos(codigoCliente);
      const abonosContpaqi = Array.isArray(docs) ? docs.filter((d: any) => {
        if (d.cancelado) return false;
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return ['101', '102'].includes(c);
      }) : [];

      // Obtener pagos ya existentes en ERP para evitar duplicar
      const pagosErp = await prisma.pago.findMany({
        where: { clienteId: cliente.id }
      });

      const defaultUser = await prisma.user.findFirst({
        where: { role: 'admin' }
      }) || await prisma.user.findFirst();

      const cobradorId = cliente.cobradorAsignadoId || defaultUser?.id;
      if (!cobradorId) {
        return NextResponse.json({ error: 'No se encontró un usuario cobrador válido en ERP' }, { status: 500 });
      }

      let insertados = 0;
      for (const a of abonosContpaqi) {
        const montoAbono = parseFloat(a.total || a.cTotal || a.CTOTAL || 0);
        const fechaDoc = new Date(a.fecha || a.cFecha || a.CFECHA);
        const folioStr = a.serie ? `${a.serie}-${a.folio}` : String(a.folio);

        // Verificar si ya existe en ERP (por folio o misma fecha y monto)
        const yaExiste = pagosErp.some(p => {
          if (p.numeroRecibo && p.numeroRecibo.trim() === folioStr.trim()) return true;
          const diffHours = Math.abs(new Date(p.fechaPago).getTime() - fechaDoc.getTime()) / (1000 * 60 * 60);
          return diffHours <= 18 && parseFloat(p.monto.toString()) === montoAbono;
        });

        if (yaExiste) continue;

        await prisma.pago.create({
          data: {
            clienteId: cliente.id,
            cobradorId,
            monto: montoAbono,
            moratorios: 0,
            fechaPago: isNaN(fechaDoc.getTime()) ? new Date() : fechaDoc,
            numeroRecibo: folioStr,
            concepto: `Abono ContPAQi Folio ${folioStr}`,
            referencia: `CONTPAQI-DOC-${a.id || a.cIdDocumento || a.CIDDOCUMENTO}`,
            estado: 'aplicado',
            metadatos: {
              contpaqiAfectado: true,
              contpaqiDocId: a.id || a.cIdDocumento || a.CIDDOCUMENTO,
              importadoDesde: 'ContPAQi Comercial'
            }
          }
        });
        insertados++;
      }

      // Sincronizar saldo final
      const pagares = Array.isArray(docs) ? docs.filter((d: any) => {
        const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || d.CIDCONCEPTO || '').trim();
        return c === '16' && !d.cancelado;
      }) : [];
      const totalPendiente = pagares.reduce((acc: number, d: any) => acc + (parseFloat(d.pendiente || 0) || 0), 0);
      
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { saldoActual: totalPendiente }
      });

      return NextResponse.json({
        success: true,
        mensaje: `Se importaron ${insertados} pagos de ContPAQi a muebleria-erp y se actualizó el saldo a $${totalPendiente.toFixed(2)}.`,
        pagosInsertados: insertados,
        saldoActual: totalPendiente
      });
    }

    return NextResponse.json({ error: `Acción '${accion}' no reconocida` }, { status: 400 });

  } catch (error: any) {
    console.error('Error en POST /api/tesoreria/auditoria/cruce-mysql:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar acción de auditoría' }, { status: 500 });
  }
}
