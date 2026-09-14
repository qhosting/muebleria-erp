import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizarDiaSemana } from '@/lib/corte-cej-utils';

async function getActivePeriodicidades(): Promise<string[]> {
  try {
    // 1. Intentar consultar tabla cobranzaruta si existe
    try {
      const rawActive: any[] = await prisma.$queryRawUnsafe(`
        SELECT periodicidad 
        FROM cobranzaruta 
        WHERE status = 'ACTIVO' 
          AND CURRENT_DATE BETWEEN fecha_inicio_periodo AND fecha_fin_periodo
      `);
      if (rawActive && rawActive.length > 0) {
        return rawActive.map(r => String(r.periodicidad).toLowerCase());
      }
    } catch {
      // Fallback si no existe la tabla directa
    }

    // 2. Consultar configuracion_sistema
    const config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sms_rutas' }
    });

    if (config && config.cobranza && Array.isArray((config.cobranza as any)?.rutas)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const active = (config.cobranza as any).rutas.filter((r: any) => {
        return r.status === 'ACTIVO' && 
               r.fecha_inicio_periodo <= todayStr && 
               r.fecha_fin_periodo >= todayStr;
      });
      if (active.length > 0) {
        return active.map((r: any) => String(r.periodicidad).toLowerCase());
      }
    }
  } catch (err) {
    console.warn('Error reading active cobranzaruta:', err);
  }

  // Fallback por defecto a semanal y quincenal activas
  return ['semanal', 'quincenal'];
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignKey = searchParams.get('campaignKey') || 'no_pagos';
  const diaCobro = searchParams.get('diaCobro') || 'TODOS'; // TODOS, LUNES, MARTES, etc. o 1, 2...
  const filterByCobrador = searchParams.get('filterByCobrador') === 'true';

  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  try {
    const activePeriodicidades = await getActivePeriodicidades();

    // Base query: clientes activos con teléfono válido
    const whereClause: any = {
      statusCuenta: 'activo',
      AND: [
        { telefono: { not: null } },
        { telefono: { not: '' } }
      ]
    };

    // Filtro por periodicidad activa en cobranzaruta
    if (activePeriodicidades.length > 0) {
      whereClause.periodicidad = { in: activePeriodicidades as any };
    }

    // Si es cobrador y solicita explícitamente filtrar por sus clientes
    if (userRole === 'cobrador' && filterByCobrador) {
      whereClause.cobradorAsignadoId = userId;
    }

    // Lógica específica de campaña:
    // En el legacy cat_clientes, cc.pagar = '0' indica cliente con saldo pendiente / mora en el periodo
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
        cobradorAsignado: {
          select: {
            name: true,
            codigoGestor: true
          }
        }
      },
      take: 1000
    });

    // Filtrar por día de cobro si no es TODOS usando normalizarDiaSemana
    let filtered = allClients;
    if (diaCobro && diaCobro !== 'TODOS') {
      const targetDia = normalizarDiaSemana(diaCobro);
      filtered = allClients.filter(c => normalizarDiaSemana(c.diaPago) === targetDia);
    }

    // Limpiar teléfonos para asegurar que sean válidos (mínimo 10 dígitos)
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
      gestor: c.cobradorAsignado?.name || c.cobradorAsignado?.codigoGestor || 'N/A'
    }));

    return NextResponse.json(validRecipients);
  } catch (error) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'Error fetching preview data' }, { status: 500 });
  }
}
