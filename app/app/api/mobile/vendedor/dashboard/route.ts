
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const user = session.user as any;
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        // 1. Obtener presupuesto y avance
        const presupuesto = await prisma.presupuestoVenta.findFirst({
            where: {
                vendedorId: user.id,
                fechaInicio: { lte: now },
                fechaFin: { gte: now }
            }
        });

        // 2. Ventas de hoy
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);
        
        const db = prisma as any;
        const ventasHoy = await db.venta.findMany({
            where: {
                vendedorId: user.id,
                createdAt: { gte: hoyInicio }
            }
        });

        const totalVentasHoy = ventasHoy.reduce((acc: number, v: any) => acc + Number(v.total), 0);

        // 3. Leads activos
        const leadsActivos = await prisma.lead.count({
            where: {
                vendedorId: user.id,
                estado: { not: 'convertido' }
            }
        });

        // 4. Prospectos recientes
        const prospectosRecientes = await prisma.lead.findMany({
            where: {
                vendedorId: user.id,
                estado: { not: 'convertido' }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return NextResponse.json({
            stats: {
                ventasHoy: totalVentasHoy,
                leadsActivos: leadsActivos,
                metaAlcanzada: presupuesto ? Math.round((Number(presupuesto.logradoMonto) / Number(presupuesto.metaMonto)) * 100) : 0
            },
            prospectos: prospectosRecientes.map(l => ({
                id: l.id,
                nombre: l.nombre,
                productoInteres: l.productoInteres,
                estado: l.estado,
                canal: l.canal
            }))
        });

    } catch (error: any) {
        console.error('Error en vendedor dashboard API:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
