
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignKey = searchParams.get('campaignKey');
  const diaCobro = searchParams.get('diaCobro'); // Opcional: LUNES, MARTES, etc.

  const userRole = session.user.role;
  const userId = session.user.id;

  try {
    let whereClause: any = {
      statusCuenta: 'activo',
      telefono: { not: null, not: '' },
    };

    // Filtro por rol
    if (userRole === 'cobrador') {
      whereClause.cobradorAsignadoId = userId;
    }

    // Lógica específica de campaña
    if (campaignKey === 'no_pagos') {
      whereClause.saldoVencido = { gt: 0 };
    }

    if (diaCobro && diaCobro !== 'TODOS') {
      whereClause.diaPago = diaCobro;
    }

    const clients = await prisma.cliente.findMany({
      where: whereClause,
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        telefono: true,
        diaPago: true,
        saldoVencido: true,
      },
      take: 500, // Límite para previsualización
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Preview Error:', error);
    return NextResponse.json({ error: 'Error fetching preview data' }, { status: 500 });
  }
}
