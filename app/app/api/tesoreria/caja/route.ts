import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const userId = (session.user as any).id;
        const lastSession = await (prisma as any).sesionCaja.findFirst({
            where: { userId },
            orderBy: { fecha: 'desc' }
        });

        return NextResponse.json(lastSession);
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener sesión' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await request.json();
        const { action, montoInicial, montoFinal, observaciones } = body;
        const userId = (session.user as any).id;

        if (action === 'abrir') {
            // Verificar si ya hay una abierta
            const abierta = await (prisma as any).sesionCaja.findFirst({
                where: { userId, estatus: 'abierto' }
            });
            if (abierta) return NextResponse.json({ error: 'Ya tienes una caja abierta' }, { status: 400 });

            const newSession = await (prisma as any).sesionCaja.create({
                data: {
                    userId,
                    apertura: new Date(),
                    montoInicial: montoInicial || 0,
                    estatus: 'abierto'
                }
            });
            return NextResponse.json(newSession);
        }

        if (action === 'cerrar') {
            const abierta = await (prisma as any).sesionCaja.findFirst({
                where: { userId, estatus: 'abierto' }
            });
            if (!abierta) return NextResponse.json({ error: 'No hay ninguna caja abierta para cerrar' }, { status: 400 });

            // Calcular total cobrado hoy (opcional)
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const pagosHoy = await prisma.pago.aggregate({
                where: {
                    cobradorId: userId,
                    fechaPago: { gte: hoy }
                },
                _sum: { monto: true }
            });

            const closedSession = await (prisma as any).sesionCaja.update({
                where: { id: abierta.id },
                data: {
                    cierre: new Date(),
                    montoFinal: montoFinal || 0,
                    totalCobrado: pagosHoy._sum.monto || 0,
                    estatus: 'cerrado',
                    observaciones: observaciones || ""
                }
            });
            return NextResponse.json(closedSession);
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    } catch (error) {
        console.error("Error en caja API:", error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
