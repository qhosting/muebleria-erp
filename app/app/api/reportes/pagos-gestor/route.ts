import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCdmxDateRange } from '@/lib/utils';

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
            where.fechaPago = getCdmxDateRange(fechaDesde, fechaHasta);
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
                    select: {
                        nombreCompleto: true,
                        codigoCliente: true,
                        direccionCompleta: true,
                        periodicidad: true,
                        diaPago: true,
                        telefono: true
                    },
                },
                cobrador: {
                    select: { name: true, codigoGestor: true },
                },
                ticket: {
                    select: { id: true, folio: true, referencia: true, claveRastreo: true }
                }
            },
            orderBy: { fechaPago: 'desc' },
        });

        const resumen = {
            totalDP: 0,
            totalDQ: 0,
            totalMonto: 0,
            totalMoratorio: 0,
            totalMoratorioDP: 0,
            totalMoratorioDQ: 0,
            montoPuroDP: 0,
            montoPuroDQ: 0,
            montoPuroTotal: 0,
            cantidadDP: 0,
            cantidadDQ: 0,
            totalCantidad: pagos.length
        };

        const detallado = pagos.map(p => {
            const monto = parseFloat(p.monto?.toString() || '0');
            let interesMoratorio = p.interesMoratorio ? parseFloat(p.interesMoratorio.toString()) : 0;
            if ((!interesMoratorio || isNaN(interesMoratorio) || interesMoratorio <= 0) && p.tipoPago === 'moratorio') {
                interesMoratorio = monto;
            }
            if (isNaN(interesMoratorio)) interesMoratorio = 0;
            const gastosCobranza = p.gastosCobranza ? parseFloat(p.gastosCobranza.toString()) : 0;
            const isDP = p.cliente?.codigoCliente?.startsWith('DP');
            const isDQ = p.cliente?.codigoCliente?.startsWith('DQ');

            const totalPago = monto + interesMoratorio;

            if (isDP) {
                resumen.totalDP += totalPago;
                resumen.totalMoratorioDP += interesMoratorio;
                resumen.montoPuroDP += monto;
                resumen.cantidadDP++;
            } else if (isDQ) {
                resumen.totalDQ += totalPago;
                resumen.totalMoratorioDQ += interesMoratorio;
                resumen.montoPuroDQ += monto;
                resumen.cantidadDQ++;
            }

            resumen.totalMonto += totalPago;
            resumen.totalMoratorio += interesMoratorio;
            resumen.montoPuroTotal += monto;

            return { ...p, monto, interesMoratorio, gastosCobranza, totalPago };
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
