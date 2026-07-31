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
            const cleanSearch = search.trim();
            where.OR = [
                { folio: { contains: cleanSearch, mode: 'insensitive' } },
                { referencia: { contains: cleanSearch, mode: 'insensitive' } },
                { claveRastreo: { contains: cleanSearch, mode: 'insensitive' } },
                { id: { contains: cleanSearch, mode: 'insensitive' } },
                { concepto: { contains: cleanSearch, mode: 'insensitive' } },
                { remitente: { contains: cleanSearch, mode: 'insensitive' } },
                { cuentaOrigen: { contains: cleanSearch, mode: 'insensitive' } },
                { cuentaDestino: { contains: cleanSearch, mode: 'insensitive' } },
                { cliente: { nombreCompleto: { contains: cleanSearch, mode: 'insensitive' } } },
                { cliente: { codigoCliente: { contains: cleanSearch, mode: 'insensitive' } } },
            ];
        }

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    cliente: {
                        select: {
                            id: true,
                            codigoCliente: true,
                            nombreCompleto: true,
                            cobradorAsignado: {
                                select: {
                                    name: true,
                                    codigoGestor: true
                                }
                            }
                        }
                    },
                    gestor: {
                        select: {
                            name: true,
                            codigoGestor: true,
                        }
                    },
                    pagos: {
                        select: {
                            id: true,
                            monto: true,
                            fechaPago: true
                        }
                    }
                },
                orderBy: { creadoEn: 'desc' },
                skip,
                take: limit,
            }),
            prisma.ticket.count({ where }),
        ]);

        return NextResponse.json({
            tickets,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// POST - Aplicar el pago de un ticket manualmente al cliente
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { ticketId } = body;

        if (!ticketId) {
            return NextResponse.json({ error: 'El ID del ticket es obligatorio' }, { status: 400 });
        }

        // Obtener ticket con su cliente y pagos existentes
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                cliente: true,
                pagos: true,
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        if (!ticket.clienteId || !ticket.cliente) {
            return NextResponse.json({ error: 'El ticket no está asociado a ningún cliente' }, { status: 400 });
        }

        if (ticket.pagos.length > 0) {
            return NextResponse.json({ error: 'Este ticket ya tiene un pago aplicado' }, { status: 400 });
        }

        const cliente = ticket.cliente;
        const saldoAnterior = parseFloat(cliente.saldoActual.toString());
        const montoPago = ticket.monto;
        const saldoNuevo = Math.max(0, saldoAnterior - montoPago);

        const userId = (session.user as any).id;

        // Ejecutar en una transacción
        await prisma.$transaction(async (tx: any) => {
            // 1. Crear el pago
            await tx.pago.create({
                data: {
                    clienteId: cliente.id,
                    cobradorId: userId,
                    ticketId: ticket.id,
                    monto: montoPago,
                    concepto: ticket.concepto || `Aplicado desde tesorería (Ref: ${ticket.referencia || ticket.folio || ticket.id})`,
                    tipoPago: 'regular',
                    fechaPago: ticket.fecha || new Date(),
                    metodoPago: 'TESORERIA MANUAL',
                    saldoAnterior,
                    saldoNuevo,
                    sincronizado: true
                }
            });

            // 2. Actualizar saldo del cliente
            await tx.cliente.update({
                where: { id: cliente.id },
                data: { saldoActual: saldoNuevo }
            });

            // 3. Marcar ticket como conciliado
            await tx.ticket.update({
                where: { id: ticket.id },
                data: { conciliado: true }
            });
        });

        return NextResponse.json({
            success: true,
            message: 'El pago ha sido aplicado al cliente correctamente.',
            saldoNuevo
        });
    } catch (error) {
        console.error('Error al aplicar pago de ticket:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor al aplicar pago' },
            { status: 500 }
        );
    }
}
