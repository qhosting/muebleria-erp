import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * API para limpiar pagos y tickets triplicados/duplicados y restaurar el saldo del cliente
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const codigoCliente = (body.codigoCliente || 'DP2605137').trim().toUpperCase();

        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente },
            include: {
                pagos: { orderBy: { createdAt: 'asc' } },
                tickets: { orderBy: { creadoEn: 'asc' } }
            }
        });

        if (!cliente) {
            return NextResponse.json({ error: `Cliente con contrato ${codigoCliente} no encontrado` }, { status: 404 });
        }

        // Buscar pagos del mismo monto creados con pocos minutos de diferencia
        const pagos = cliente.pagos;
        const duplicadosAEliminar: string[] = [];
        let montoTotalAEliminar = 0;

        // Agrupación inteligente de pagos duplicados
        for (let i = 0; i < pagos.length; i++) {
            const current = pagos[i];
            if (duplicadosAEliminar.includes(current.id)) continue;

            for (let j = i + 1; j < pagos.length; j++) {
                const next = pagos[j];
                if (duplicadosAEliminar.includes(next.id)) continue;

                // Mismo monto
                if (parseFloat(current.monto.toString()) === parseFloat(next.monto.toString())) {
                    const diffMinutes = Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) / (1000 * 60);
                    // Creados con menos de 60 minutos de diferencia
                    if (diffMinutes <= 60) {
                        duplicadosAEliminar.push(next.id);
                        montoTotalAEliminar += parseFloat(next.monto.toString());
                    }
                }
            }
        }

        if (duplicadosAEliminar.length === 0) {
            return NextResponse.json({
                success: true,
                message: `No se encontraron pagos duplicados para el contrato ${codigoCliente}.`,
                duplicadosEliminados: 0
            });
        }

        const saldoAnterior = parseFloat(cliente.saldoActual.toString());
        const saldoNuevo = saldoAnterior + montoTotalAEliminar;

        // Ejecutar la limpieza en transacción
        await prisma.$transaction(async (tx) => {
            // 1. Eliminar pagos duplicados
            await tx.pago.deleteMany({
                where: { id: { in: duplicadosAEliminar } }
            });

            // 2. Restaurar saldo del cliente
            await tx.cliente.update({
                where: { id: cliente.id },
                data: { saldoActual: saldoNuevo }
            });
        });

        return NextResponse.json({
            success: true,
            message: `Limpieza de pagos duplicados exitosa para contrato ${codigoCliente}.`,
            cliente: {
                codigoCliente: cliente.codigoCliente,
                nombreCompleto: cliente.nombreCompleto,
                saldoAnterior,
                saldoNuevo
            },
            duplicadosEliminados: duplicadosAEliminar.length,
            montoReajustado: montoTotalAEliminar,
            pagosEliminadosIds: duplicadosAEliminar
        });

    } catch (error: any) {
        console.error('Error al limpiar pagos duplicados:', error);
        return NextResponse.json({ error: error.message || 'Error al procesar limpieza de duplicados' }, { status: 500 });
    }
}
