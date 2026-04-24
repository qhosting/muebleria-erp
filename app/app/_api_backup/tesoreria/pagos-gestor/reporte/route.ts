
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
        const desde = searchParams.get('desde');
        const hasta = searchParams.get('hasta');
        const cobradorId = searchParams.get('cobradorId');

        const filter: any = {
            cliente: {
                codigoCliente: {
                    startsWith: 'DQ',
                },
            },
        };

        if (desde || hasta) {
            filter.fechaPago = {};
            if (desde) filter.fechaPago.gte = new Date(desde + 'T00:00:00');
            if (hasta) filter.fechaPago.lte = new Date(hasta + 'T23:59:59');
        }

        if (cobradorId && cobradorId !== 'all') {
            filter.cobradorId = cobradorId;
        }

        const pagos = await prisma.pago.findMany({
            where: filter,
            include: {
                cliente: {
                    select: {
                        codigoCliente: true,
                        nombreCompleto: true,
                        periodicidad: true,
                        diaPago: true,
                        telefono: true,
                    },
                },
                cobrador: {
                    select: {
                        name: true,
                        codigoGestor: true,
                    },
                },
            },
            orderBy: {
                fechaPago: 'desc',
            },
        });

        const pagosSerializados = pagos.map((p: any) => ({
            id: p.id,
            fechaPago: p.fechaPago,
            fechaHora: p.createdAt,
            codigoCliente: p.cliente.codigoCliente,
            nombreCliente: p.cliente.nombreCompleto,
            referencia: p.numeroRecibo || '-',
            monto: parseFloat(p.monto.toString()),
            agente: p.cobrador.codigoGestor || p.cobrador.name || 'S/N',
            concepto: p.concepto,
            periodicidad: p.cliente.periodicidad,
            diaCobro: p.cliente.diaPago,
            telefono: p.cliente.telefono,
            mora: p.tipoPago === 'moratorio' ? parseFloat(p.monto.toString()) : 0,
            tipo: p.metodoPago.toLowerCase() === 'bancario' ? 'BANCARIO' : 'GESTOR',
        }));

        return NextResponse.json({ pagos: pagosSerializados });

    } catch (error) {
        console.error('Error al obtener reporte detallado:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
