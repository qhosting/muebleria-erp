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
        const estatus = searchParams.get('estatus') || 'todos'; // 'todos' | 'efectuadas' | 'pendientes'
        const fechaDesde = searchParams.get('fechaDesde');
        const fechaHasta = searchParams.get('fechaHasta');

        const skip = (page - 1) * limit;

        // ── 1. Filtros para Verificaciones Efectuadas ──
        const whereEfectuadas: any = {};
        if (search) {
            whereEfectuadas.OR = [
                { cliente: { nombreCompleto: { contains: search, mode: 'insensitive' } } },
                { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } },
                { gestor: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (fechaDesde && fechaHasta) {
            whereEfectuadas.fecha = {
                gte: new Date(fechaDesde),
                lte: new Date(fechaHasta),
            };
        }

        // ── 2. Filtros para Clientes Pendientes de VD ──
        const wherePendientes: any = {
            clasificacionCobranza: 'VD',
            statusCuenta: 'activo',
            verificaciones: { none: {} },
        };
        if (search) {
            wherePendientes.OR = [
                { nombreCompleto: { contains: search, mode: 'insensitive' } },
                { codigoCliente: { contains: search, mode: 'insensitive' } },
                { cobradorAsignado: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        if (fechaDesde && fechaHasta) {
            wherePendientes.OR = [
                { fechaVenta: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) } },
                { createdAt: { gte: new Date(fechaDesde), lte: new Date(fechaHasta) } },
            ];
        }

        // Obtener conteos para métricas
        const [totalEfectuadas, totalPendientes] = await Promise.all([
            (prisma as any).verificacionDomiciliaria.count({ where: whereEfectuadas }),
            prisma.cliente.count({ where: wherePendientes }),
        ]);

        let items: any[] = [];
        let totalItems = 0;

        if (estatus === 'efectuadas') {
            totalItems = totalEfectuadas;
            const efect = await (prisma as any).verificacionDomiciliaria.findMany({
                where: whereEfectuadas,
                include: {
                    cliente: {
                        select: {
                            id: true,
                            codigoCliente: true,
                            nombreCompleto: true,
                            direccionCompleta: true,
                            telefono: true,
                            numContrato: true,
                            clasificacionCobranza: true,
                        }
                    },
                    gestor: {
                        select: {
                            id: true,
                            name: true,
                            codigoGestor: true,
                        }
                    }
                },
                orderBy: { fecha: 'desc' },
                skip,
                take: limit,
            });

            items = efect.map((v: any) => ({
                ...v,
                estatus: 'EFECTUADA',
            }));
        } else if (estatus === 'pendientes') {
            totalItems = totalPendientes;
            const pends = await prisma.cliente.findMany({
                where: wherePendientes,
                include: {
                    cobradorAsignado: {
                        select: {
                            id: true,
                            name: true,
                            codigoGestor: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            });

            items = pends.map((c: any) => ({
                id: `pending-${c.id}`,
                clienteId: c.id,
                gestorId: c.cobradorAsignadoId,
                fecha: c.fechaVenta || c.createdAt,
                estatus: 'PENDIENTE',
                detallesExtra: {
                    contrato: c.numContrato || c.codigoCliente,
                    codigoCliente: c.codigoCliente,
                    nombreCliente: c.nombreCompleto,
                    direccion: c.direccionCompleta,
                    telefono: c.telefono,
                    montoPago: c.montoPago ? Number(c.montoPago) : 0,
                    saldoActual: c.saldoActual ? Number(c.saldoActual) : 0,
                    observacion: 'Cliente con clasificación VD (Importación con Bienvenida) - Pendiente de visita de verificación domiciliaria por el gestor.',
                },
                cliente: {
                    id: c.id,
                    codigoCliente: c.codigoCliente,
                    nombreCompleto: c.nombreCompleto,
                    direccionCompleta: c.direccionCompleta,
                    telefono: c.telefono,
                    numContrato: c.numContrato,
                    clasificacionCobranza: c.clasificacionCobranza,
                },
                gestor: c.cobradorAsignado ? {
                    id: c.cobradorAsignado.id,
                    name: c.cobradorAsignado.name,
                    codigoGestor: c.cobradorAsignado.codigoGestor,
                } : null,
            }));
        } else {
            // 'todos': Traer tanto efectuadas como pendientes combinadas
            totalItems = totalEfectuadas + totalPendientes;

            const [efect, pends] = await Promise.all([
                (prisma as any).verificacionDomiciliaria.findMany({
                    where: whereEfectuadas,
                    include: {
                        cliente: {
                            select: {
                                id: true,
                                codigoCliente: true,
                                nombreCompleto: true,
                                direccionCompleta: true,
                                telefono: true,
                                numContrato: true,
                                clasificacionCobranza: true,
                            }
                        },
                        gestor: {
                            select: {
                                id: true,
                                name: true,
                                codigoGestor: true,
                            }
                        }
                    },
                    orderBy: { fecha: 'desc' },
                }),
                prisma.cliente.findMany({
                    where: wherePendientes,
                    include: {
                        cobradorAsignado: {
                            select: {
                                id: true,
                                name: true,
                                codigoGestor: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                }),
            ]);

            const mapEfect = efect.map((v: any) => ({
                ...v,
                estatus: 'EFECTUADA',
            }));

            const mapPends = pends.map((c: any) => ({
                id: `pending-${c.id}`,
                clienteId: c.id,
                gestorId: c.cobradorAsignadoId,
                fecha: c.fechaVenta || c.createdAt,
                estatus: 'PENDIENTE',
                detallesExtra: {
                    contrato: c.numContrato || c.codigoCliente,
                    codigoCliente: c.codigoCliente,
                    nombreCliente: c.nombreCompleto,
                    direccion: c.direccionCompleta,
                    telefono: c.telefono,
                    montoPago: c.montoPago ? Number(c.montoPago) : 0,
                    saldoActual: c.saldoActual ? Number(c.saldoActual) : 0,
                    observacion: 'Cliente con clasificación VD (Importación con Bienvenida) - Pendiente de visita de verificación domiciliaria por el gestor.',
                },
                cliente: {
                    id: c.id,
                    codigoCliente: c.codigoCliente,
                    nombreCompleto: c.nombreCompleto,
                    direccionCompleta: c.direccionCompleta,
                    telefono: c.telefono,
                    numContrato: c.numContrato,
                    clasificacionCobranza: c.clasificacionCobranza,
                },
                gestor: c.cobradorAsignado ? {
                    id: c.cobradorAsignado.id,
                    name: c.cobradorAsignado.name,
                    codigoGestor: c.cobradorAsignado.codigoGestor,
                } : null,
            }));

            // Combinar y ordenar por fecha descendente
            const combined = [...mapEfect, ...mapPends].sort((a, b) => {
                const dateA = new Date(a.fecha).getTime() || 0;
                const dateB = new Date(b.fecha).getTime() || 0;
                return dateB - dateA;
            });

            items = combined.slice(skip, skip + limit);
        }

        return NextResponse.json({
            verificaciones: items,
            counts: {
                total: totalItems,
                efectuadas: totalEfectuadas,
                pendientes: totalPendientes,
            },
            pagination: {
                total: totalItems,
                pages: Math.ceil(totalItems / limit) || 1,
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        console.error('Error al obtener verificaciones:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
