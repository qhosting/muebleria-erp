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
            const cleanSearchNum = parseInt(search.replace(/[^0-9]/g, ''), 10);
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                ...(!isNaN(cleanSearchNum) && cleanSearchNum > 0 ? [{ legacyId: cleanSearchNum }] : []),
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
                    creadoEn: true,
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
        const desdeStr = searchParams.get('desde');
        const hastaStr = searchParams.get('hasta');
        const antesDeStr = searchParams.get('antesDe');

        let whereClause: any = {};
        let logMessage = '';

        if (desdeStr) {
            const fechaInicio = new Date(`${desdeStr}T00:00:00.000Z`);
            whereClause.fechaOperacion = { gte: fechaInicio };
            if (hastaStr) {
                const fechaFin = new Date(`${hastaStr}T23:59:59.999Z`);
                whereClause.fechaOperacion.lte = fechaFin;
                logMessage = `Registros bancarios del ${desdeStr} al ${hastaStr} eliminados correctamente`;
            } else {
                logMessage = `Registros bancarios desde el ${desdeStr} hasta hoy eliminados correctamente`;
            }
        } else if (antesDeStr) {
            const fechaLimite = new Date(`${antesDeStr}T00:00:00.000Z`);
            whereClause.fechaOperacion = { lt: fechaLimite };
            logMessage = `Registros bancarios anteriores al ${antesDeStr} eliminados correctamente`;
        } else {
            return NextResponse.json({ error: 'Debes especificar el parámetro ?desde=YYYY-MM-DD para eliminar' }, { status: 400 });
        }

        // Antes de eliminar los movimientos, buscar los tickets vinculados a ellos para desconciliarlos
        const [m1, m2, m3, m4] = await Promise.all([
            prisma.movimientoSantander22001022837.findMany({ where: { ...whereClause, ticketId: { not: null } }, select: { ticketId: true } }),
            prisma.movimientoSantander65505732541.findMany({ where: { ...whereClause, ticketId: { not: null } }, select: { ticketId: true } }),
            prisma.movimientoBanorte0330253963.findMany({ where: { ...whereClause, ticketId: { not: null } }, select: { ticketId: true } }),
            prisma.movimientoBancario.findMany({ where: { ...whereClause, ticketId: { not: null } }, select: { ticketId: true } }),
        ]);

        const ticketIds = Array.from(new Set([
            ...m1.map(m => m.ticketId),
            ...m2.map(m => m.ticketId),
            ...m3.map(m => m.ticketId),
            ...m4.map(m => m.ticketId)
        ].filter(Boolean) as string[]));

        if (ticketIds.length > 0) {
            // Revertir pagos creados por el conciliador si los hay
            const pagosConciliados = await prisma.pago.findMany({
                where: {
                    ticketId: { in: ticketIds },
                    metodoPago: { in: ['TESORERIA CONCILIADOR', 'SPEI AUTO CONCILIADO', 'MIGRACION MANUAL'] }
                },
                include: { cliente: true }
            });

            for (const p of pagosConciliados) {
                if (p.cliente) {
                    const saldoActual = parseFloat(p.cliente.saldoActual.toString());
                    const montoPago = parseFloat(p.monto.toString());
                    await prisma.cliente.update({
                        where: { id: p.clienteId },
                        data: { saldoActual: saldoActual + montoPago }
                    });
                }
            }

            if (pagosConciliados.length > 0) {
                await prisma.pago.deleteMany({
                    where: { id: { in: pagosConciliados.map(p => p.id) } }
                });
            }

            // Desmarcar tickets como no conciliados
            await prisma.ticket.updateMany({
                where: { id: { in: ticketIds } },
                data: { conciliado: false }
            });
        }

        // Eliminar los movimientos bancarios en todas las tablas
        const [delS1, delS2, delB, delMb] = await Promise.all([
            prisma.movimientoSantander22001022837.deleteMany({ where: whereClause }),
            prisma.movimientoSantander65505732541.deleteMany({ where: whereClause }),
            prisma.movimientoBanorte0330253963.deleteMany({ where: whereClause }),
            prisma.movimientoBancario.deleteMany({ where: whereClause }),
        ]);

        return NextResponse.json({
            success: true,
            message: logMessage,
            ticketsDesconciliados: ticketIds.length,
            eliminados: {
                santander_22001022837: delS1.count,
                santander_65505732541: delS2.count,
                banorte_0330253963: delB.count,
                movimientos_bancarios_general: delMb.count,
                total: delS1.count + delS2.count + delB.count + delMb.count
            }
        });
    } catch (error) {
        console.error('Error al eliminar movimientos bancarios:', error);
        return NextResponse.json(
            { error: 'Error al eliminar movimientos bancarios' },
            { status: 500 }
        );
    }
}
