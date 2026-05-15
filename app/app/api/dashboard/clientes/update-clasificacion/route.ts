import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin' && (session.user as any).role !== 'jefe_ventas') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { clienteIds, clasificacionCobranza } = body;

    if (!clienteIds || !Array.isArray(clienteIds) || clienteIds.length === 0 || !clasificacionCobranza) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = prisma as any;
    
    // Update multiple clients
    const result = await db.cliente.updateMany({
      where: {
        id: { in: clienteIds }
      },
      data: {
        clasificacionCobranza
      }
    });

    return NextResponse.json({
        success: true,
        updatedCount: result.count,
        message: `${result.count} clientes actualizados a clasificación ${clasificacionCobranza}`
    });
  } catch (error: any) {
    console.error('Error updating clasificacion:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
