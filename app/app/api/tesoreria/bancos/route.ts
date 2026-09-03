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
                { descripcionGeneral: { contains: search, mode: 'insensitive' } },
                { claveRastreo: { contains: search, mode: 'insensitive' } },
                { referencia: { contains: search, mode: 'insensitive' } },
                { bancoOrigen: { contains: search, mode: 'insensitive' } },
                { clabeEmisor: { contains: search, mode: 'insensitive' } },
                { cuentaEmisor: { contains: search, mode: 'insensitive' } }
            ];
        }

        const includeRelations = {
            ticket: {
                select: {
                    id: true,
                    folio: true,
                    referencia: true,
                    monto: true,
                    fecha: true,
                    conciliado: true,
                    cliente: {
                        select: {
                            id: true,
                            codigoCliente: true,
                            nombreCompleto: true,
                            telefono: true
                        }
                    },
                    gestor: {
                        select: {
                            name: true,
                            codigoGestor: true
                        }
                    }
                }
            },
            cliente: {
                select: {
                    id: true,
                    codigoCliente: true,
                    nombreCompleto: true,
                    telefono: true
                }
            }
        };

        let movimientos: any[] = [];
        let total = 0;

        if (banco === '22001022837') {
            const [data, count] = await Promise.all([
                prisma.movimientoSantander22001022837.findMany({
                    where,
                    include: includeRelations,
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
                    include: includeRelations,
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
                    include: includeRelations,
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
                    include: includeRelations,
                    orderBy: { fechaOperacion: 'desc' },
                    take: skip + limit,
                }),
                prisma.movimientoSantander65505732541.findMany({
                    where,
                    include: includeRelations,
                    orderBy: { fechaOperacion: 'desc' },
                    take: skip + limit,
                }),
                prisma.movimientoBanorte0330253963.findMany({
                    where,
                    include: includeRelations,
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

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaStr = searchParams.get('antesDe') || '2026-08-27';
        const fechaLimite = new Date(`${fechaStr}T00:00:00.000Z`);

        const [delS1, delS2, delB, delMb] = await Promise.all([
            prisma.movimientoSantander22001022837.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
            prisma.movimientoSantander65505732541.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
            prisma.movimientoBanorte0330253963.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
            prisma.movimientoBancario.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
        ]);

        return NextResponse.json({
            success: true,
            message: `Registros bancarios anteriores al ${fechaStr} eliminados correctamente`,
            fechaLimite: fechaLimite.toISOString(),
            eliminados: {
                santander_22001022837: delS1.count,
                santander_65505732541: delS2.count,
                banorte_0330253963: delB.count,
                movimientos_bancarios_general: delMb.count,
                total: delS1.count + delS2.count + delB.count + delMb.count
            }
        });
    } catch (error) {
        console.error('Error al eliminar movimientos bancarios antiguos:', error);
        return NextResponse.json(
            { error: 'Error al eliminar movimientos bancarios' },
            { status: 500 }
        );
    }
}
