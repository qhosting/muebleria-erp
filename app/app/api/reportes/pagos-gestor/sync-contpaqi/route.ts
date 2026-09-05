import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCdmxDateRange } from '@/lib/utils';
import { ContpaqiService } from '@/lib/contpaqi-service';
import { toCdmxDateString, obtenerEmpresaPorCodigo } from '@/lib/auditoria-saldos-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface SyncResultItem {
  pagoId: string;
  codigoCliente: string;
  clienteNombre: string;
  monto: number;
  fecha: string;
  status: 'CREADO' | 'YA_EXISTE' | 'ERROR';
  docId?: number | string | null;
  docFolio?: string | null;
  mensaje: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const allowedRoles = ['admin', 'auditor', 'tesorero', 'tesoreria', 'direccion', 'gestor_cobranza', 'gerente'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      pagoId,
      pagosIds,
      fechaDesde,
      fechaHasta,
      tipo = 'todos',
      cobradorId = 'all',
      soloValidar = false
    } = body;

    // 1. Construir filtros Prisma para los pagos
    const where: any = {};

    if (pagoId) {
      where.id = pagoId;
    } else if (Array.isArray(pagosIds) && pagosIds.length > 0) {
      where.id = { in: pagosIds };
    } else if (fechaDesde && fechaHasta) {
      where.fechaPago = getCdmxDateRange(fechaDesde, fechaHasta);
      if (tipo && tipo !== 'todos') {
        where.cliente = {
          codigoCliente: {
            startsWith: tipo,
            mode: 'insensitive'
          }
        };
      }
      if (cobradorId && cobradorId !== 'all') {
        where.cobradorId = cobradorId;
      }
    } else {
      return NextResponse.json(
        { error: 'Debe especificar pagoId, pagosIds o el rango fechaDesde y fechaHasta' },
        { status: 400 }
      );
    }

    const pagos = await prisma.pago.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombreCompleto: true
          }
        },
        cobrador: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        },
        ticket: {
          select: {
            id: true,
            folio: true,
            referencia: true,
            fecha: true,
            claveRastreo: true
          }
        }
      },
      orderBy: { fechaPago: 'asc' }
    });

    if (pagos.length === 0) {
      return NextResponse.json({
        success: true,
        mensaje: 'No se encontraron pagos con los criterios seleccionados.',
        total: 0,
        creados: 0,
        yaExistentes: 0,
        pendientes: 0,
        errores: 0,
        detalles: []
      });
    }

    // Configuración ContPAQi Services
    const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
    const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';

    const serviceDP = new ContpaqiService({ apiUrl, apiKey, empresa: 'DP' });
    const serviceDQ = new ContpaqiService({ apiUrl, apiKey, empresa: 'DQ' });

    // Cache en memoria de documentos por cliente para evitar consultas redundantes a la API de ContPAQi
    const clientDocsCache = new Map<string, any[]>();

    const getDocsCliente = async (cod: string, emp: 'DP' | 'DQ'): Promise<any[]> => {
      const cacheKey = `${emp}:${cod}`;
      if (clientDocsCache.has(cacheKey)) {
        return clientDocsCache.get(cacheKey) || [];
      }

      const srv = emp === 'DQ' ? serviceDQ : serviceDP;
      try {
        const raw = await srv.getClientDocumentos(cod);
        const docsList = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
        clientDocsCache.set(cacheKey, docsList);
        return docsList;
      } catch (err: any) {
        console.warn(`[SyncContPAQi] No se pudieron obtener documentos de ${cod} (${emp}):`, err.message);
        clientDocsCache.set(cacheKey, []);
        return [];
      }
    };

    const resultados: SyncResultItem[] = [];
    let creadosCount = 0;
    let yaExistentesCount = 0;
    let erroresCount = 0;

    for (const p of pagos) {
      const cod = p.cliente?.codigoCliente?.trim().toUpperCase();
      const nombreCliente = p.cliente?.nombreCompleto || 'Sin Nombre';

      if (!cod) {
        erroresCount++;
        resultados.push({
          pagoId: p.id,
          codigoCliente: 'N/A',
          clienteNombre: nombreCliente,
          monto: parseFloat(p.monto.toString()) || 0,
          fecha: toCdmxDateString(p.fechaPago),
          status: 'ERROR',
          mensaje: 'El pago no tiene un código de cliente válido en ERP.'
        });
        continue;
      }

      const empresa = obtenerEmpresaPorCodigo(cod);
      const srv = empresa === 'DQ' ? serviceDQ : serviceDP;
      const abonoMonto = parseFloat(p.monto.toString()) || 0;

      if (abonoMonto <= 0) {
        erroresCount++;
        resultados.push({
          pagoId: p.id,
          codigoCliente: cod,
          clienteNombre: nombreCliente,
          monto: abonoMonto,
          fecha: toCdmxDateString(p.fechaPago),
          status: 'ERROR',
          mensaje: 'El monto del abono debe ser mayor a cero.'
        });
        continue;
      }

      const effectiveDate = p.fechaPago ? new Date(p.fechaPago) : (p.ticket?.fecha ? new Date(p.ticket.fecha) : new Date(p.createdAt));
      const fechaStr = toCdmxDateString(effectiveDate) || new Date().toISOString().slice(0, 10);
      const referencia = p.ticket?.folio || p.ticket?.referencia || p.numeroRecibo || p.ticket?.id || `PAGO ERP #${p.id.slice(0, 8)}`;
      const cobradorNombre = p.cobrador?.name || 'Cobrador';

      try {
        // 2. OBTENER DOCUMENTOS DE CONTPAQI PARA ESTE CLIENTE
        const docsCliente = await getDocsCliente(cod, empresa);

        // Filtrar solo abonos (conceptos 101 y 102) que no estén cancelados
        const abonosContpaqi = docsCliente.filter((d: any) => {
          if (d.cancelado) return false;
          const c = String(d.codigoConcepto || d.Concepto || d.concepto || d.CCODIGOCONCEPTO || '').trim();
          return ['101', '102'].includes(c);
        });

        // 3. VALIDACIÓN INTELIGENTE DE DUPLICIDAD EN CONTPAQI
        let docExistente: any = null;

        // Check 3.1: ¿El concepto de Prisma ya tiene un Doc ID de ContPAQi vinculado?
        const matchDocIdEnConcepto = (p.concepto || '').match(/ContPAQi Doc #(\d+)/i);
        if (matchDocIdEnConcepto) {
          const docIdPrisma = matchDocIdEnConcepto[1];
          docExistente = abonosContpaqi.find((d: any) => String(d.id || d.cIdDocumento || d.CIDDOCUMENTO) === docIdPrisma);
          if (!docExistente) {
            // El ID ya está en el concepto aunque no esté en la lista actual
            docExistente = { id: docIdPrisma, folio: 'VINCULADO' };
          }
        }

        // Check 3.2: ¿Hay un documento en ContPAQi con la misma referencia (recibo o folios de ticket)?
        if (!docExistente) {
          const refsCandidatas = [
            p.ticket?.folio,
            p.ticket?.referencia,
            p.numeroRecibo,
            p.ticket?.claveRastreo,
            p.ticket?.id
          ]
            .map((r: any) => String(r || '').trim().toUpperCase())
            .filter((r: string) => r.length >= 4);

          for (const refItem of refsCandidatas) {
            if (!docExistente) {
              docExistente = abonosContpaqi.find((d: any) => {
                if (d.usado) return false;
                const dRef = String(d.referencia || d.cReferencia || '').trim().toUpperCase();
                return dRef && (dRef.includes(refItem) || refItem.includes(dRef));
              });
            }
          }
        }

        // Check 3.3: ¿Hay un abono en ContPAQi en la misma fecha (YYYY-MM-DD) y con el mismo monto exacto?
        if (!docExistente) {
          docExistente = abonosContpaqi.find((d: any) => {
            if (d.usado) return false;
            const dFecha = d.fecha ? (typeof d.fecha === 'string' ? d.fecha.slice(0, 10) : toCdmxDateString(d.fecha)) : '';
            const dTotal = parseFloat(d.total || d.cTotal || d.CTOTAL || '0') || 0;
            return dFecha === fechaStr && Math.abs(dTotal - abonoMonto) < 0.01;
          });
        }

        // --- CASO A: YA EXISTE EN CONTPAQI (EVITAR DUPLICIDAD) ---
        if (docExistente) {
          docExistente.usado = true;
          const existingId = docExistente.id || docExistente.cIdDocumento || docExistente.CIDDOCUMENTO;
          const existingFolio = docExistente.folio || (docExistente.serie ? `${docExistente.serie}-${docExistente.folio}` : null);

          // Si el pago en ERP no tenía marcado el doc ID o sincronizado, actualizarlo
          if (!p.sincronizado || !p.concepto?.includes('ContPAQi Doc #')) {
            const baseConcepto = (p.concepto || 'ABONO').replace(/\s*\(ContPAQi Doc #\d+\)/gi, '').trim();
            const nuevoConcepto = existingId
              ? `${baseConcepto} (ContPAQi Doc #${existingId})`
              : p.concepto;

            await prisma.pago.update({
              where: { id: p.id },
              data: {
                sincronizado: true,
                concepto: nuevoConcepto
              }
            });
          }

          yaExistentesCount++;
          resultados.push({
            pagoId: p.id,
            codigoCliente: cod,
            clienteNombre: nombreCliente,
            monto: abonoMonto,
            fecha: fechaStr,
            status: 'YA_EXISTE',
            docId: existingId,
            docFolio: existingFolio,
            mensaje: `Ya existía en ContPAQi (Doc #${existingId || 'OK'}) en fecha ${fechaStr} por $${abonoMonto.toFixed(2)}. Vinculado sin duplicar.`
          });
          continue;
        }

        // Si solo estamos validando, no crear documento nuevo
        if (soloValidar) {
          resultados.push({
            pagoId: p.id,
            codigoCliente: cod,
            clienteNombre: nombreCliente,
            monto: abonoMonto,
            fecha: fechaStr,
            status: 'ERROR',
            mensaje: `Pendiente en ContPAQi en fecha ${fechaStr} por $${abonoMonto.toFixed(2)}.`
          });
          continue;
        }

        // --- CASO B: NO EXISTE EN CONTPAQI -> CREAR PAGO VÍA API ---
        const conceptoAbono = empresa === 'DQ' ? '102' : '101';

        const nuevoPago = await srv.registrarPago({
          codigoCliente: cod,
          monto: abonoMonto,
          fecha: `${fechaStr}T00:00:00`,
          folioTicket: referencia,
          referencia: referencia,
          observaciones: `Registrado desde Mueblería ERP por ${cobradorNombre}`,
          codigoConceptoAbono: conceptoAbono,
          codigoConceptoCargo: '1'
        }, empresa);

        const newDocId = nuevoPago?.idPago || nuevoPago?.id;
        const newDocFolio = nuevoPago?.folioDocumento || (nuevoPago?.serie ? `${nuevoPago.serie}-${nuevoPago.folio}` : null);

        // Marcar pago como sincronizado en PostgreSQL
        await prisma.pago.update({
          where: { id: p.id },
          data: {
            sincronizado: true,
            concepto: newDocId
              ? (p.concepto ? `${p.concepto} (ContPAQi Doc #${newDocId})` : `ContPAQi Doc #${newDocId}`)
              : p.concepto
          }
        });

        // Actualizar cache local del cliente con el nuevo documento
        const nuevoDocItem = {
          id: newDocId,
          codigoConcepto: conceptoAbono,
          fecha: fechaStr,
          total: abonoMonto,
          referencia,
          cancelado: 0
        };
        const cacheKey = `${empresa}:${cod}`;
        const currentCache = clientDocsCache.get(cacheKey) || [];
        currentCache.push(nuevoDocItem);
        clientDocsCache.set(cacheKey, currentCache);

        creadosCount++;
        resultados.push({
          pagoId: p.id,
          codigoCliente: cod,
          clienteNombre: nombreCliente,
          monto: abonoMonto,
          fecha: fechaStr,
          status: 'CREADO',
          docId: newDocId,
          docFolio: newDocFolio,
          mensaje: `Abono de $${abonoMonto.toFixed(2)} creado y afectado exitosamente en ContPAQi (${empresa} - Doc #${newDocId || 'OK'}).`
        });

      } catch (err: any) {
        erroresCount++;
        console.error(`[SyncContPAQi] Error en pago ${p.id} (${cod}):`, err);
        resultados.push({
          pagoId: p.id,
          codigoCliente: cod,
          clienteNombre: nombreCliente,
          monto: abonoMonto,
          fecha: fechaStr,
          status: 'ERROR',
          mensaje: err.message || 'Error desconocido al conectar con ContPAQi API.'
        });
      }
    }

    const mensajeFinal = soloValidar
      ? `Validación finalizada: ${yaExistentesCount} pagos confirmados y vinculados con ContPAQi Doc ID, ${pagos.length - yaExistentesCount} pendientes de aplicar.`
      : `Proceso completado: ${creadosCount} abonos creados en ContPAQi, ${yaExistentesCount} ya existentes (vinculados sin duplicar)${erroresCount > 0 ? `, ${erroresCount} con error` : ''}.`;

    return NextResponse.json({
      success: true,
      mensaje: mensajeFinal,
      total: pagos.length,
      creados: creadosCount,
      yaExistentes: yaExistentesCount,
      pendientes: pagos.length - yaExistentesCount,
      errores: erroresCount,
      detalles: resultados
    });

  } catch (error: any) {
    console.error('Error general en sincronización ContPAQi:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al sincronizar pagos con ContPAQi' },
      { status: 500 }
    );
  }
}
