import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizarDiaSemana } from '@/lib/corte-cej-utils';
import { obtenerInfoCalendarioCobranza, getDiasCicloHastaHoy } from '@/lib/calendario-cobranza-utils';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignKey = searchParams.get('campaignKey') || 'no_pagos';
  const diaCobro = searchParams.get('diaCobro') || 'TODOS'; // TODOS, LUNES, MARTES, etc.
  const filterByCobrador = searchParams.get('filterByCobrador') === 'true';
  const gestorId = searchParams.get('gestorId') || searchParams.get('cobradorId');

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  try {
    // 1. Obtener información de la semana activa desde el Calendario Anual (CalendarioCobranza)
    const calInfo = await obtenerInfoCalendarioCobranza(prisma);

    // 2. Base query: cuentas activas, con clasificación RUTA y teléfono válido
    const whereClause: any = {
      statusCuenta: 'activo',
      clasificacionCobranza: 'RUTA', // Solo cuentas asignadas a RUTA
      AND: [
        { telefono: { not: null } },
        { telefono: { not: '' } }
      ]
    };

    // Filtrar por periodicidades activas en el Calendario
    if (calInfo.periodicidadesActivas.length > 0) {
      whereClause.periodicidad = { in: calInfo.periodicidadesActivas as any };
    }

    // Filtrar por gestor específico si se solicita
    if (gestorId && gestorId !== 'TODOS') {
      whereClause.cobradorAsignadoId = gestorId;
    } else if (userRole === 'cobrador' && filterByCobrador) {
      whereClause.cobradorAsignadoId = userId;
    }

    // Para campañas de no pagos, requiere tener saldo pendiente
    if (campaignKey === 'no_pagos') {
      whereClause.OR = [
        { saldoVencido: { gt: 0 } },
        { diasVencidos: { gt: 0 } },
        { saldoActual: { gt: 0 } }
      ];
    }

    const allClients = await prisma.cliente.findMany({
      where: whereClause,
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        telefono: true,
        diaPago: true,
        saldoVencido: true,
        saldoActual: true,
        periodicidad: true,
        cobradorAsignadoId: true,
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            codigoGestor: true
          }
        }
      },
      take: 2000
    });

    // 3. Filtrar por día:
    // Si es TODOS, aplicar el acumulado del ciclo de cobranza: [Sábado ... Día de Hoy]
    // Si se especifica un día (ej. MARTES), solo ese día
    let diasPermitidos: string[];
    if (!diaCobro || diaCobro === 'TODOS') {
      diasPermitidos = getDiasCicloHastaHoy();
    } else {
      diasPermitidos = [normalizarDiaSemana(diaCobro)];
    }

    let filtered = allClients.filter(c => diasPermitidos.includes(normalizarDiaSemana(c.diaPago)));

    // 4. Excluir clientes que ya hayan realizado un pago en la semana de cobranza actual
    if (campaignKey === 'no_pagos' && filtered.length > 0) {
      const clientIds = filtered.map(c => c.id);
      const clientCodes = filtered.map(c => c.codigoCliente);

      // A) Pagos registrados en la semana oficial (fechaInicio a fechaFin)
      const pagosSemana = await prisma.pago.findMany({
        where: {
          clienteId: { in: clientIds },
          fechaPago: {
            gte: calInfo.fechaInicio,
            lte: calInfo.fechaFin
          },
          monto: { gt: 0 }
        },
        select: { clienteId: true }
      }).catch(() => []);

      const clienteIdsConPago = new Set<string>(pagosSemana.map(p => p.clienteId));

      // B) Pagos registrados en tickets conciliados de la semana
      try {
        const ticketsSemana = await prisma.ticket.findMany({
          where: {
            clienteId: { in: clientIds },
            fecha: {
              gte: calInfo.fechaInicio,
              lte: calInfo.fechaFin
            },
            conciliado: true
          },
          select: { clienteId: true }
        });
        ticketsSemana.forEach(t => { if (t.clienteId) clienteIdsConPago.add(t.clienteId); });
      } catch {}

      // C) Corte semanal activo si existe avance de pagoReal > 0
      try {
        const corteActivo = await prisma.corteCobranza.findFirst({
          where: {
            anio: calInfo.anio,
            semana: calInfo.semana
          },
          include: {
            detalles: {
              where: {
                codigoCliente: { in: clientCodes },
                pagoReal: { gt: 0 }
              },
              select: { clienteId: true, codigoCliente: true }
            }
          }
        });
        if (corteActivo?.detalles) {
          const codeToIdMap = new Map(filtered.map(c => [c.codigoCliente, c.id]));
          corteActivo.detalles.forEach(d => {
            if (d.clienteId) clienteIdsConPago.add(d.clienteId);
            const foundId = codeToIdMap.get(d.codigoCliente);
            if (foundId) clienteIdsConPago.add(foundId);
          });
        }
      } catch {}

      filtered = filtered.filter(c => !clienteIdsConPago.has(c.id));
    }

    // 5. Limpiar teléfonos para asegurar que sean válidos (mínimo 10 dígitos)
    const validRecipients = filtered.filter(c => {
      const digits = (c.telefono || '').replace(/\D/g, '');
      return digits.length >= 10;
    }).map(c => ({
      id: c.id,
      codigoCliente: c.codigoCliente,
      nombreCompleto: c.nombreCompleto,
      telefono: c.telefono,
      diaPago: normalizarDiaSemana(c.diaPago),
      diaPagoRaw: c.diaPago,
      periodicidad: c.periodicidad,
      saldoVencido: Number(c.saldoVencido) || 0,
      saldoActual: Number(c.saldoActual) || 0,
      gestorId: c.cobradorAsignado?.id || c.cobradorAsignadoId || null,
      gestor: c.cobradorAsignado?.name || c.cobradorAsignado?.codigoGestor || 'Sin Gestor'
    }));

    return NextResponse.json(validRecipients);
  } catch (error) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'Error fetching preview data' }, { status: 500 });
  }
}

