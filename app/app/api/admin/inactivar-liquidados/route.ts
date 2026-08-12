export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RecomprasService } from '@/lib/recompras-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session?.user || (userRole !== 'admin' && userRole !== 'gestor_cobranza')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar clientes activos con saldo actual menor o igual a 0
    const liquidados = await prisma.cliente.findMany({
      where: {
        statusCuenta: 'activo',
        saldoActual: { lte: 0 },
      },
      select: {
        id: true,
        nombreCompleto: true,
        codigoCliente: true,
        saldoActual: true,
      },
    });

    if (liquidados.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No se encontraron clientes activos con saldo $0 para inactivar.',
        totalInactivados: 0,
      });
    }

    const ids = liquidados.map(c => c.id);
    const fechaInactivacion = new Date();

    // Actualizar en lote a inactivo
    await prisma.cliente.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        statusCuenta: 'inactivo',
        fechaInactivacion,
      },
    });

    // Crear leads de recompra en segundo plano
    Promise.allSettled(
      ids.map(id => RecomprasService.crearLeadPorLiquidacion(id, 'Inactivado por proceso de liquidación (saldo $0)'))
    ).catch(err => console.error('Error al generar leads de recompra:', err));

    return NextResponse.json({
      success: true,
      message: `Se inactivaron exitosamente ${liquidados.length} cliente(s) con saldo $0.`,
      totalInactivados: liquidados.length,
      clientes: liquidados,
    });
  } catch (error) {
    console.error('Error en inactivación masiva de liquidados:', error);
    return NextResponse.json(
      { error: 'Error interno al inactivar clientes liquidados' },
      { status: 500 }
    );
  }
}
