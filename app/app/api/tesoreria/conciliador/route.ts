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

        // 1. Obtener Tickets no conciliados
        const ticketsPendientes = await prisma.ticket.findMany({
            where: { conciliado: false },
            include: {
                cliente: { select: { nombreCompleto: true, codigoCliente: true } },
                gestor: { select: { name: true } },
            },
            orderBy: { creadoEn: 'desc' },
            take: 100 // Límite por rendimiento
        });

        // 2. Obtener Movimientos Bancarios no conciliados
        const movimientosPendientes = await prisma.movimientoBancario.findMany({
            where: { ticketId: null },
            orderBy: { fechaOperacion: 'desc' },
            take: 100
        });

        // 3. Algoritmo de Sugerencia Básica
        const sugerencias = [];

        for (const ticket of ticketsPendientes) {
            const match = movimientosPendientes.find(mov => {
                // Criterio 1: Montos Exactos (Cargo en Ticket == Abono en Banco) o (Monto == Abono)
                const montosIguales = (ticket.monto === mov.abono);

                // Criterio 2: Coincidencia textual (Referencia, Concepto o Folio)
                const conceptoMatch = mov.concepto?.includes(ticket.referencia || 'N/A') ||
                    mov.descripcionGeneral?.includes(ticket.cliente?.codigoCliente || 'N/A');

                return montosIguales && conceptoMatch;
            });

            if (match) {
                sugerencias.push({
                    ticket,
                    movimiento: match,
                    certeza: 'Alta'
                });

                // Remover el movimiento encontrado de las posibles opciones futuras de este batch
                const index = movimientosPendientes.findIndex(m => m.id === match.id);
                if (index > -1) {
                    movimientosPendientes.splice(index, 1);
                }
            }
        }

        return NextResponse.json({
            tickets: ticketsPendientes,
            movimientos: movimientosPendientes,
            sugerencias
        });

    } catch (error) {
        console.error('Error al cargar datos del conciliador:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// Para ejecutar un Emparejamiento Manual
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { ticketId, movimientoId } = body;

        // Actualizamos ambos en una sola transacción
        await prisma.$transaction([
            prisma.ticket.update({
                where: { id: ticketId },
                data: { conciliado: true }
            }),
            prisma.movimientoBancario.update({
                where: { id: movimientoId },
                data: { ticketId: ticketId, fechaIdentificado: new Date() }
            })
        ]);

        return NextResponse.json({ success: true, message: 'Conciliación exitosa' });
    } catch (error) {
        console.error('Error al conciliar:', error);
        return NextResponse.json({ error: 'Error al forzar conciliación' }, { status: 500 });
    }
}
