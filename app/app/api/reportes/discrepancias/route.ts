
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['admin', 'gestor_cobranza'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaDesde = new Date(searchParams.get('fechaDesde') || Date.now() - 30 * 24 * 60 * 60 * 1000);
        const fechaHasta = new Date(searchParams.get('fechaHasta') || Date.now());

        // 1. Tickets sin conciliación bancaria
        const ticketsSinBanco = await prisma.ticket.findMany({
            where: {
                conciliado: false,
                creadoEn: { gte: fechaDesde, lte: fechaHasta }
            },
            include: {
                cliente: { select: { nombreCompleto: true } },
                gestor: { select: { name: true } }
            },
            orderBy: { creadoEn: 'desc' }
        });

        // 2. Movimientos bancarios sin ticket asociado
        const bancosSinTicket = await prisma.movimientoBancario.findMany({
            where: {
                ticketId: null,
                fechaOperacion: { gte: fechaDesde, lte: fechaHasta },
                abono: { gt: 0 }
            },
            orderBy: { fechaOperacion: 'desc' }
        });

        // 3. Pagos reportados como bancarios pero sin vinculación a estado_de_cuenta
        const pagosBancariosHuefanos = await prisma.pago.findMany({
            where: {
                metodoPago: 'bancario',
                ticketId: null,
                fechaPago: { gte: fechaDesde, lte: fechaHasta }
            },
            include: {
                cliente: { select: { nombreCompleto: true } },
                cobrador: { select: { name: true } }
            }
        });

        return NextResponse.json({
            ticketsSinBanco,
            bancosSinTicket,
            pagosBancariosHuefanos,
            resumen: {
                totalTicketsSinBanco: ticketsSinBanco.length,
                montoTicketsSinBanco: ticketsSinBanco.reduce((sum, t) => sum + (t.monto || 0), 0),
                totalBancosSinTicket: bancosSinTicket.length,
                montoBancosSinTicket: bancosSinTicket.reduce((sum, b) => sum + (b.abono || 0), 0),
                totalPagosBancariosHuefanos: pagosBancariosHuefanos.length,
                montoPagosBancariosHuefanos: pagosBancariosHuefanos.reduce((sum, p) => sum + Number(p.monto), 0)
            }
        });

    } catch (error: any) {
        console.error('Error en reporte de discrepancias:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
