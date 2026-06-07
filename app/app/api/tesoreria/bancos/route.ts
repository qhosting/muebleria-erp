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
        const banco = searchParams.get('banco') || ''; // '', '22001022837', '65505732541', '0330253963'

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

        let movimientos: any[] = [];
        let total = 0;

        if (banco === '22001022837') {
            const [data, count] = await Promise.all([
                prisma.movimientoSantander22001022837.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.movimientoSantander22001022837.count({ where }),
            ]);
            movimientos = data.map(m => ({ ...m, cuentaDestino: '22001022837', bancoDestino: 'SANTANDER' }));
            total = count;
        } else if (banco === '65505732541') {
            const [data, count] = await Promise.all([
                prisma.movimientoSantander65505732541.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.movimientoSantander65505732541.count({ where }),
            ]);
            movimientos = data.map(m => ({ ...m, cuentaDestino: '65505732541', bancoDestino: 'SANTANDER' }));
            total = count;
        } else if (banco === '0330253963') {
            const [data, count] = await Promise.all([
                prisma.movimientoBanorte0330253963.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.movimientoBanorte0330253963.count({ where }),
            ]);
            movimientos = data.map(m => ({ ...m, cuentaDestino: '0330253963', bancoDestino: 'BANORTE' }));
            total = count;
        } else {
            // "todas" las cuentas: combinamos las 3 tablas con paginación en memoria inteligente
            const [m1, m2, m3, c1, c2, c3] = await Promise.all([
                prisma.movimientoSantander22001022837.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    take: skip + limit,
                }),
                prisma.movimientoSantander65505732541.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    take: skip + limit,
                }),
                prisma.movimientoBanorte0330253963.findMany({
                    where,
                    orderBy: { fechaOperacion: 'desc' },
                    take: skip + limit,
                }),
                prisma.movimientoSantander22001022837.count({ where }),
                prisma.movimientoSantander65505732541.count({ where }),
                prisma.movimientoBanorte0330253963.count({ where }),
            ]);

            const combined = [
                ...m1.map(m => ({ ...m, cuentaDestino: '22001022837', bancoDestino: 'SANTANDER' })),
                ...m2.map(m => ({ ...m, cuentaDestino: '65505732541', bancoDestino: 'SANTANDER' })),
                ...m3.map(m => ({ ...m, cuentaDestino: '0330253963', bancoDestino: 'BANORTE' })),
            ];

            // Ordenamos descendente por fecha de operación
            combined.sort((a, b) => b.fechaOperacion.getTime() - a.fechaOperacion.getTime());

            movimientos = combined.slice(skip, skip + limit);
            total = c1 + c2 + c3;
        }

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
