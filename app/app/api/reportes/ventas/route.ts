import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaDesdeStr = searchParams.get('fechaDesde');
        const fechaHastaStr = searchParams.get('fechaHasta');

        const start = fechaDesdeStr ? new Date(fechaDesdeStr + 'T00:00:00.000Z') : startOfMonth(new Date());
        const end = fechaHastaStr ? new Date(fechaHastaStr + 'T23:59:59.999Z') : endOfMonth(new Date());

        // 1. Obtener todos los asesores (usuarios con rol vendedor o jefe_ventas)
        const asesores = await prisma.user.findMany({
            where: {
                role: {
                    in: ['vendedor', 'jefe_ventas']
                },
                isActive: true
            },
            select: {
                id: true,
                name: true
            }
        });

        // Si no hay asesores con rol de vendedor en la BD, obtenemos los que tengan presupuestos
        let targetUsers = asesores;
        if (targetUsers.length === 0) {
            const usersWithBudgets = await prisma.user.findMany({
                where: {
                    presupuestos: {
                        some: {}
                    }
                },
                select: {
                    id: true,
                    name: true
                }
            });
            targetUsers = usersWithBudgets;
        }

        // Si aún así está vacío, obtenemos todos los usuarios activos para mostrar algo
        if (targetUsers.length === 0) {
            targetUsers = await prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, name: true },
                take: 10
            });
        }

        const reportData = [];

        for (const user of targetUsers) {
            // 2. Obtener presupuesto de este asesor en el rango seleccionado
            const presupuestos = await prisma.presupuestoVenta.findMany({
                where: {
                    vendedorId: user.id,
                    fechaInicio: { lte: end },
                    fechaFin: { gte: start }
                }
            });

            // Sumar metas si hay múltiples presupuestos
            const pptoClientes = presupuestos.reduce((acc, p) => acc + (p.metaPiezas || 0), 0);
            const pptoMonto = presupuestos.reduce((acc, p) => acc + Number(p.metaMonto || 0), 0);

            // Calcular días del presupuesto
            let diasMes = 30; // default fallback
            if (presupuestos.length > 0) {
                const diffTime = Math.abs(presupuestos[0].fechaFin.getTime() - presupuestos[0].fechaInicio.getTime());
                diasMes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            } else {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                diasMes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            // 3. Obtener ventas reales en el rango
            const ventas = await prisma.cliente.findMany({
                where: {
                    vendedorId: user.id,
                    fechaVenta: {
                        gte: start,
                        lte: end
                    }
                },
                select: {
                    montoPago: true,
                    piezas: true
                }
            });

            const logroCl = ventas.reduce((acc, v) => acc + (v.piezas || 1), 0);
            const logroMonto = ventas.reduce((acc, v) => acc + Number(v.montoPago || 0), 0);

            const porcentajeCl = pptoClientes > 0 ? Math.round((logroCl / pptoClientes) * 100) : 0;
            const porcentajeMonto = pptoMonto > 0 ? Math.round((logroMonto / pptoMonto) * 100) : 0;

            // Solo agregamos al reporte si tiene metas o ventas en el periodo, o si es un vendedor oficial
            if (pptoClientes > 0 || pptoMonto > 0 || logroCl > 0 || logroMonto > 0 || targetUsers.length <= 10) {
                reportData.push({
                    asesor: user.name,
                    pptoClientes,
                    pptoMonto,
                    logroCl,
                    porcentajeCl,
                    logroMonto,
                    porcentajeMonto,
                    diasMes,
                    sm: ''
                });
            }
        }

        return NextResponse.json(reportData);
    } catch (error: any) {
        console.error('Error al generar reporte de ventas:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
