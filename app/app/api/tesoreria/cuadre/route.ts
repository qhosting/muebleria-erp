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
        const dateParam = searchParams.get('date');

        // Establecer fechas: medianoche a medianoche
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        if (dateParam) {
            startDate = new Date(dateParam);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(dateParam);
            endDate.setHours(23, 59, 59, 999);
        }

        // Grupos de pagos por cobrador en ese rango de fechas
        const pagosAgrupados = await prisma.pago.groupBy({
            by: ['cobradorId'],
            where: {
                fechaPago: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                monto: true,
            },
            _count: {
                id: true,
            },
        });

        // Obtener los nombres de los cobradores
        const userIds = pagosAgrupados.map((p) => p.cobradorId);
        let usuarios = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, codigoGestor: true },
        });

        const resumen = pagosAgrupados.map((pago) => {
            const usuario = usuarios.find((u) => u.id === pago.cobradorId);
            return {
                cobradorId: pago.cobradorId,
                nombre: usuario?.name || 'Desconocido',
                codigoGestor: usuario?.codigoGestor || '-',
                totalCobrado: pago._sum.monto || 0,
                cantidadPagos: pago._count.id || 0,
            };
        });

        // Calcular el total general
        const totalGeneral = resumen.reduce((acc, curr) => acc + Number(curr.totalCobrado), 0);

        return NextResponse.json({
            fecha: startDate.toISOString(),
            resumen,
            totalGeneral
        });

    } catch (error) {
        console.error('Error al obtener cuadre:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
