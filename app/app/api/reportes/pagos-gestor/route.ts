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
        const fechaDesde = searchParams.get('fechaDesde');
        const fechaHasta = searchParams.get('fechaHasta');
        const cobradorId = searchParams.get('cobradorId');
        const tipo = searchParams.get('tipo'); // 'todos', 'DQ', 'DP'

        const where: any = {};

        if (fechaDesde && fechaHasta) {
            where.fechaPago = {
                gte: new Date(fechaDesde),
                lte: new Date(fechaHasta),
            };
        }

        // Gestor Cobranza y Admins pueden filtrar por cualquier cobrador. Cobradores solo a si mismos
        const userRole = (session.user as any).role;
        const userId = (session.user as any).id;

        if (userRole === 'cobrador') {
            where.cobradorId = userId;
        } else if (cobradorId && cobradorId !== 'all') {
            where.cobradorId = cobradorId;
        }

        if (tipo && tipo !== 'todos') {
            where.cliente = {
                codigoCliente: {
                    startsWith: tipo,
                },
            };
        }

        const pagos = await prisma.pago.findMany({
            where,
            include: {
                cliente: {
                    select: { nombreCompleto: true, codigoCliente: true, direccionCompleta: true },
                },
                cobrador: {
                    select: { name: true, codigoGestor: true },
                },
            },
            orderBy: { fechaPago: 'asc' },
        });

        const resumen = {
            totalDP: 0,
            totalDQ: 0,
            totalMonto: 0,
            cantidadDP: 0,
            cantidadDQ: 0,
            totalCantidad: pagos.length
        };

        const detallado = pagos.map(p => {
            const monto = parseFloat(p.monto.toString());
            const isDP = p.cliente?.codigoCliente?.startsWith('DP');
            const isDQ = p.cliente?.codigoCliente?.startsWith('DQ');

            if (isDP) {
                resumen.totalDP += monto;
                resumen.cantidadDP++;
            } else if (isDQ) {
                resumen.totalDQ += monto;
                resumen.cantidadDQ++;
            }

            resumen.totalMonto += monto;

            return { ...p, monto };
        });

        return NextResponse.json({
            resumen,
            detallado
        });

    } catch (error) {
        console.error('Error al cargar reporte pagos gestor:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
