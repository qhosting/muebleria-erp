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

        // 3. Algoritmo de Sugerencia Inteligente (Scoring)
        const sugerencias = [];
        const movimientosDisponibles = [...movimientosPendientes];

        for (const ticket of ticketsPendientes) {
            let bestMatch = null;
            let bestPriority = 6;
            let razon = "";

            const monto = Number(ticket.monto);
            const contrato = (ticket.cliente?.codigoCliente || "").toUpperCase();
            const folio = (ticket.folio || "").toUpperCase();
            const nombre = (ticket.cliente?.nombreCompleto || "").toUpperCase().substring(0, 15);

            for (const mov of movimientosDisponibles) {
                // Solo sugerimos si el monto coincide exactamente
                if (Number(mov.abono) !== monto) continue;

                const concepto = (mov.concepto || "").toUpperCase();
                const descripcion = (mov.descripcionDetallada || "").toUpperCase();
                const general = (mov.descripcionGeneral || "").toUpperCase();
                const dataPool = `${concepto} ${descripcion} ${general}`;

                let currentPriority = 5; // Coincidencia de monto
                let currentRazon = "Monto exacto (Prioridad 5)";

                if (contrato && dataPool.includes(contrato)) {
                    currentPriority = 1;
                    currentRazon = "Econtrado por Contrato (Prioridad 1)";
                } else if (folio && dataPool.includes(folio)) {
                    currentPriority = 2;
                    currentRazon = "Encontrado por Folio (Prioridad 2)";
                } else if (nombre && dataPool.includes(nombre)) {
                    currentPriority = 3;
                    currentRazon = "Encontrado por Nombre (Prioridad 3)";
                }

                if (currentPriority < bestPriority) {
                    bestPriority = currentPriority;
                    bestMatch = mov;
                    razon = currentRazon;
                }
            }

            if (bestMatch && bestPriority <= 5) {
                sugerencias.push({
                    ticket,
                    movimiento: bestMatch,
                    prioridad: bestPriority,
                    razon: razon
                });

                // Remover para no duplicar sugerencias en este batch
                const idx = movimientosDisponibles.findIndex(m => m.id === bestMatch.id);
                if (idx > -1) movimientosDisponibles.splice(idx, 1);
            }
        }

        return NextResponse.json({
            tickets: ticketsPendientes,
            movimientos: movimientosDisponibles, // Ahora usamos los movimientos restantes
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
