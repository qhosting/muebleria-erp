
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
        const fechaDesdeStr = searchParams.get('desde');
        const fechaHastaStr = searchParams.get('hasta');

        // Configuración de fechas predeterminadas (como en el PHP)
        // PHP: last Saturday to next Friday
        const now = new Date();
        const lastSaturday = new Date(now);
        lastSaturday.setDate(now.getDate() - (now.getDay() + 1) % 7);
        lastSaturday.setHours(0, 0, 0, 0);

        const nextFriday = new Date(lastSaturday);
        nextFriday.setDate(lastSaturday.getDate() + 6);
        nextFriday.setHours(23, 59, 59, 999);

        const since = fechaDesdeStr ? new Date(fechaDesdeStr) : lastSaturday;
        const until = fechaHastaStr ? new Date(fechaHastaStr) : nextFriday;

        // Ponemos since a inicio de día y until a fin de día si vienen de params
        if (fechaDesdeStr) since.setHours(0, 0, 0, 0);
        if (fechaHastaStr) until.setHours(23, 59, 59, 999);

        // Obtener todos los pagos en el rango que sean DQ
        const pagos: any[] = await prisma.pago.findMany({
            where: {
                fechaPago: {
                    gte: since,
                    lte: until,
                },
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
                    },
                },
            },
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
                };
            }

            const monto = Number(pago.monto);
            const mora = pago.tipoPago === 'moratorio' ? monto : 0; // En legacy parece que 'mora' es un campo, aquí discriminamos por tipoPago o podemos usar el campo mora si existiera

            resumenMap[cobradorId].cuentas++;
            resumenMap[cobradorId].totalMonto += monto;

            // Si el pago es de tipo moratorio, lo sumamos a mora (ajustar según lógica real vs legacy)
            if (pago.tipoPago === 'moratorio') {
                resumenMap[cobradorId].totalMora += monto;
            }

            // Clasificación Bancario vs Gestor (basado en metodoPago)
            if (['transferencia', 'cheque', 'deposito'].includes(pago.metodoPago.toLowerCase())) {
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
                desde: since.toISOString(),
                hasta: until.toISOString(),
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
        if (!session?.user || !['admin', 'gestor_cobranza'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { cobradorId, action } = await request.json();

        if (action === 'cerrar_caja') {
            await (prisma.user as any).update({
                where: { id: cobradorId },
                data: {
                    conciliado: true,
                    horaCierre: new Date(),
                },
            });
            return NextResponse.json({ success: true, fecha: new Date() });
        }

        if (action === 'abrir_caja') {
            await (prisma.user as any).update({
                where: { id: cobradorId },
                data: {
                    conciliado: false,
                    horaCierre: null,
                },
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

    } catch (error) {
        console.error('Error al cerrar caja gestor:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
