
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sucursalId = searchParams.get('sucursalId');
        const productoId = searchParams.get('productoId');

        const where: any = {};
        if (sucursalId) where.sucursalId = sucursalId;
        if (productoId) where.productoId = productoId;

        const stocks = await prisma.stock.findMany({
            where,
            include: {
                producto: { select: { nombre: true, codigo: true, stockMinimo: true } },
                sucursal: { select: { nombre: true, esBodega: true } }
            },
            orderBy: { sucursalId: 'asc' }
        });

        return NextResponse.json(stocks);
    } catch (error) {
        console.error('Error al obtener stock:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
