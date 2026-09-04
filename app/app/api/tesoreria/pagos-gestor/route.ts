
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { getCdmxDateRange } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const fechaDesdeStr = searchParams.get('desde');
        const fechaHastaStr = searchParams.get('hasta');

        let dateRange: { gte: Date; lte: Date };

        if (fechaDesdeStr || fechaHastaStr) {
            dateRange = getCdmxDateRange(fechaDesdeStr, fechaHastaStr);
        } else {
            // PHP: last Saturday to next Friday en CDMX
            const now = new Date();
            const lastSaturday = new Date(now);
            lastSaturday.setDate(now.getDate() - (now.getDay() + 1) % 7);
            const satStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(lastSaturday);
            
            const nextFriday = new Date(lastSaturday);
            nextFriday.setDate(lastSaturday.getDate() + 6);
            const friStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(nextFriday);

            dateRange = getCdmxDateRange(satStr, friStr);
        }

        // Obtener todos los pagos en el rango que sean DQ
        const pagos: any[] = await prisma.pago.findMany({
            where: {
                fechaPago: dateRange,
                cliente: {
                    codigoCliente: {
                        startsWith: 'DQ',
                    },
                },
            },
            include: {
                cobrador: {
                    select: {
                        id: true,
                        name: true,
                        codigoGestor: true,
                        conciliado: true,
                        horaCierre: true,
                    },
                },
            } as any,
        });

        // Agrupar por gestor
        const resumenMap: Record<string, any> = {};

        pagos.forEach((pago) => {
            const cobradorId = pago.cobradorId;
            const gestorCodigo = pago.cobrador?.codigoGestor || pago.cobrador?.name || 'S/N';

            if (!resumenMap[cobradorId]) {
                resumenMap[cobradorId] = {
                    cobradorId,
                    gestor: gestorCodigo,
                    cuentas: 0,
                    totalMonto: 0,
                    totalMora: 0,
                    bancario: 0,
                    gestorMonto: 0,
                    conciliado: pago.cobrador?.conciliado || false,
                    horaCierre: pago.cobrador?.horaCierre || null,
                };
            }

            const monto = Number(pago.monto);
            const interesMora = Number(pago.interesMoratorio || 0);
            const mora = interesMora > 0 ? interesMora : (pago.tipoPago === 'moratorio' ? monto : 0);

            resumenMap[cobradorId].cuentas++;
            resumenMap[cobradorId].totalMonto += monto;
            resumenMap[cobradorId].totalMora += mora;

            // Clasificación Bancario vs Gestor (basado en metodoPago conteniendo 'banc', 'bot', 'transf', o 'depo')
            const isBancario = (() => {
                const m = (pago.metodoPago || '').toLowerCase();
                return m.includes('banc') || m.includes('bot') || m.includes('transf') || m.includes('depo');
            })();
            if (isBancario) {
                resumenMap[cobradorId].bancario += monto;
            } else {
                resumenMap[cobradorId].gestorMonto += monto;
            }
        });

        const resumen = Object.values(resumenMap);

        // Totales generales
        const totales = resumen.reduce((acc, curr) => ({
            cuentas: acc.cuentas + curr.cuentas,
            totalMonto: acc.totalMonto + curr.totalMonto,
            totalMora: acc.totalMora + curr.totalMora,
            bancario: acc.bancario + curr.bancario,
            gestorMonto: acc.gestorMonto + curr.gestorMonto,
        }), { cuentas: 0, totalMonto: 0, totalMora: 0, bancario: 0, gestorMonto: 0 });

        return NextResponse.json({
            resumen,
            totales,
            filtros: {
                desde: dateRange.gte.toISOString(),
                hasta: dateRange.lte.toISOString(),
            }
        });

    } catch (error) {
        console.error('Error al obtener reporte gestor:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

// POST para cerrar caja de un gestor
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const hasPermission = await checkPermission(userRole, 'tesoreria') || await checkPermission(userRole, 'cobranza') || userRole === 'admin';
        if (!hasPermission) {
            return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
        }

        const { cobradorId, action } = await request.json();

        if (!cobradorId) {
            return NextResponse.json({ error: 'ID de cobrador requerido' }, { status: 400 });
        }

        if (action === 'cerrar_caja') {
            await prisma.user.update({
                where: { id: cobradorId },
                data: {
                    conciliado: true,
                    horaCierre: new Date(),
                },
            });
            return NextResponse.json({ success: true, fecha: new Date() });
        }

        if (action === 'abrir_caja') {
            await prisma.user.update({
                where: { id: cobradorId },
                data: {
                    conciliado: false,
                    horaCierre: null,
                },
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

    } catch (error: any) {
        console.error('Error al actualizar cierre de gestor:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
