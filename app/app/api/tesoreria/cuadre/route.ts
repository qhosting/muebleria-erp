
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
        const dateStartParam = searchParams.get('desde');
        const dateEndParam = searchParams.get('hasta');
        const cobradorId = searchParams.get('cobradorId');

        // Configuración de fechas (Medianoche a fin de día)
        const now = new Date();
        let startDate = new Date(now);
        startDate.setDate(now.getDate() - (now.getDay() + 1) % 7); // Last Saturday
        startDate.setHours(0, 0, 0, 0);

        let endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6); // Next Friday
        endDate.setHours(23, 59, 59, 999);

        if (dateStartParam) {
            startDate = new Date(dateStartParam + 'T00:00:00');
        }
        if (dateEndParam) {
            endDate = new Date(dateEndParam + 'T23:59:59');
        }

        const wherePagos: any = {
            fechaPago: {
                gte: startDate,
                lte: endDate,
            },
        };
        if (cobradorId && cobradorId !== 'all') {
            wherePagos.cobradorId = cobradorId;
        }

        // 1. Obtener pagos para desglose por gestor
        const pagosAll = await prisma.pago.findMany({
            where: wherePagos,
            include: {
                cobrador: {
                    select: { id: true, name: true, codigoGestor: true }
                },
                cliente: {
                    select: { codigoCliente: true }
                }
            }
        });

        // 2. Obtener Tickets creados en el rango (para Tickets sin conciliar)
        const whereTickets: any = {
            creadoEn: {
                gte: startDate,
                lte: endDate,
            }
        };
        if (cobradorId && cobradorId !== 'all') {
            whereTickets.gestorId = cobradorId;
        }

        const ticketsAll: any[] = await (prisma as any).ticket.findMany({
            where: whereTickets,
            include: {
                cliente: { select: { codigoCliente: true } },
                movimientos: true
            }
        });

        // 3. Obtener Movimientos Bancarios en el rango (para Abonos sin asignar)
        const movimientosBancos: any[] = await (prisma as any).movimientoBancario.findMany({
            where: {
                fechaOperacion: {
                    gte: startDate,
                    lte: endDate,
                },
                abono: { gt: 0 }
            }
        });

        // --- PROCESAMIENTO ---

        const resumenPrefijos: Record<string, any> = {
            'DQ': { actual: { ctas: 0, monto: 0, bancos: {} }, anterior: { ctas: 0, monto: 0, bancos: {} }, ticketsSinConciliar: { ctas: 0, monto: 0 } },
            'DP': { actual: { ctas: 0, monto: 0, bancos: {} }, anterior: { ctas: 0, monto: 0, bancos: {} }, ticketsSinConciliar: { ctas: 0, monto: 0 } }
        };

        // Pagos agrupados por gestor
        const gestoresMap: Record<string, any> = {};

        pagosAll.forEach(pago => {
            const cid = pago.cobradorId;
            if (!gestoresMap[cid]) {
                gestoresMap[cid] = {
                    id: cid,
                    nombre: pago.cobrador?.name || 'Desconocido',
                    codigoGestor: pago.cobrador?.codigoGestor || '-',
                    cantidadPagos: 0,
                    totalCobrado: 0
                };
            }
            gestoresMap[cid].cantidadPagos++;
            gestoresMap[cid].totalCobrado += Number(pago.monto);

            // Resumen Bancario (Solo pagos vinculados a tickets que tienen movimiento bancario)
            // En legacy: join pagos -> ticket -> estado_de_cuenta
            // Aquí: Pago ya tiene ticketId si fue de un ticket
        });

        // Para el resumen DQ/DP Solo Bancos usaremos los tickets que tienen movimientos
        // Legacy logic: Categoria ACTUAL if ec.fecha_operacion >= startDate
        ticketsAll.forEach((ticket: any) => {
            const pref = ticket.cliente.codigoCliente?.substring(0, 2).toUpperCase();
            if (resumenPrefijos[pref]) {
                if (ticket.movimientos.length > 0) {
                    ticket.movimientos.forEach((mov: any) => {
                        const isActual = mov.fechaOperacion >= startDate;
                        const cat = isActual ? 'actual' : 'anterior';
                        const banco = mov.bancoOrigen?.toUpperCase() || 'DESCONOCIDO';

                        resumenPrefijos[pref][cat].ctas++;
                        resumenPrefijos[pref][cat].monto += (mov.abono || 0);

                        if (!resumenPrefijos[pref][cat].bancos[banco]) {
                            resumenPrefijos[pref][cat].bancos[banco] = { ctas: 0, monto: 0 };
                        }
                        resumenPrefijos[pref][cat].bancos[banco].ctas++;
                        resumenPrefijos[pref][cat].bancos[banco].monto += (mov.abono || 0);
                    });
                } else {
                    // Tickets sin conciliar
                    resumenPrefijos[pref].ticketsSinConciliar.ctas++;
                    resumenPrefijos[pref].ticketsSinConciliar.monto += (ticket.monto || 0);
                }
            }
        });

        const abonosSinAsignar = {
            ctas: movimientosBancos.filter((m: any) => !m.ticketId).length,
            monto: movimientosBancos.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0)
        };

        // Formatear resumen para UI
        const calcResumen = (pref: string) => {
            const p = resumenPrefijos[pref];
            const totalC = p.actual.monto + p.anterior.monto;
            const totalCtas = p.actual.ctas + p.anterior.ctas;

            // Discrepancia: En legacy es (Pagos Bancarios Detalle - Pagos Bancarios Resumen)
            // Aquí simplificamos o usamos la misma lógica si tenemos los pagos bancarios "pendientes"
            const pagosBancariosDetalle = pagosAll.filter(pg =>
                pg.cliente.codigoCliente?.startsWith(pref) &&
                pg.metodoPago.toLowerCase() === 'bancario'
            ).reduce((acc, curr) => acc + Number(curr.monto), 0);

            const pagosBancariosDetalleCtas = pagosAll.filter(pg =>
                pg.cliente.codigoCliente?.startsWith(pref) &&
                pg.metodoPago.toLowerCase() === 'bancario'
            ).length;

            return {
                ...p,
                total: { ctas: totalCtas, monto: totalC },
                discrepancia: {
                    ctas: pagosBancariosDetalleCtas - totalCtas,
                    monto: pagosBancariosDetalle - totalC
                }
            };
        };

        return NextResponse.json({
            resumenDQ: calcResumen('DQ'),
            resumenDP: calcResumen('DP'),
            otrasDiscrepancias: { abonosSinAsignar },
            gestores: Object.values(gestoresMap),
            totalGeneral: Object.values(gestoresMap).reduce((acc: any, curr: any) => acc + curr.totalCobrado, 0)
        });

    } catch (error) {
        console.error('Error al obtener cuadre:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
