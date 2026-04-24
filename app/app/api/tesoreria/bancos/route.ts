import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { concepto: { contains: search, mode: 'insensitive' } },
                { descripcionDetallada: { contains: search, mode: 'insensitive' } },
                { claveRastreo: { contains: search, mode: 'insensitive' } },
                { referencia: { contains: search, mode: 'insensitive' } },
                { bancoOrigen: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [movimientos, total] = await Promise.all([
            prisma.movimientoBancario.findMany({
                where,
                orderBy: { fechaOperacion: 'desc' },
                skip,
                take: limit,
            }),
            prisma.movimientoBancario.count({ where }),
        ]);

        return NextResponse.json({
            movimientos,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
