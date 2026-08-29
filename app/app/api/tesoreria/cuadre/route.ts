import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

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
                    select: { id: true, codigoCliente: true, nombreCompleto: true }
                },
                ticket: {
                    include: {
                        movimientosBanorte0330253963: true,
                        movimientosSantander22001022837: true,
                        movimientosSantander65505732541: true,
                    }
                }
            },
            orderBy: { fechaPago: 'asc' }
        });

        // 2. Obtener Tickets creados en el rango
        const whereTickets: any = {
            creadoEn: {
                gte: startDate,
                lte: endDate,
            }
        };

        if (cobradorId && cobradorId !== 'all') {
            whereTickets.OR = [
                { gestorId: cobradorId },
                { cliente: { cobradorAsignadoId: cobradorId } }
            ];
        }

        const ticketsAll = await prisma.ticket.findMany({
            where: whereTickets,
            include: {
                cliente: { select: { id: true, codigoCliente: true, nombreCompleto: true } },
                gestor: { select: { id: true, name: true, codigoGestor: true } },
                movimientosBanorte0330253963: true,
                movimientosSantander22001022837: true,
                movimientosSantander65505732541: true,
            }
        });

        // 3. Obtener Movimientos Bancarios en el rango
        const [m1, m2, m3] = await Promise.all([
            prisma.movimientoSantander22001022837.findMany({
                where: {
                    fechaOperacion: { gte: startDate, lte: endDate },
                    abono: { gt: 0 }
                }
            }),
            prisma.movimientoSantander65505732541.findMany({
                where: {
                    fechaOperacion: { gte: startDate, lte: endDate },
                    abono: { gt: 0 }
                }
            }),
            prisma.movimientoBanorte0330253963.findMany({
                where: {
                    fechaOperacion: { gte: startDate, lte: endDate },
                    abono: { gt: 0 }
                }
            })
        ]);

        const movimientosBancos: any[] = [
            ...m1.map(m => ({ ...m, cuentaDestino: '22001022837', bancoDestino: 'SANTANDER' })),
            ...m2.map(m => ({ ...m, cuentaDestino: '65505732541', bancoDestino: 'SANTANDER' })),
            ...m3.map(m => ({ ...m, cuentaDestino: '0330253963', bancoDestino: 'BANORTE' }))
        ];

        // --- PROCESAMIENTO ---

        const resumenPrefijos: Record<string, any> = {
            'DQ': { 
                actual: { ctas: 0, monto: 0, bancos: {} }, 
                anterior: { ctas: 0, monto: 0, bancos: {} }, 
                ticketsSinConciliar: { ctas: 0, monto: 0 },
                conciliados: { ctas: 0, monto: 0 }
            },
            'DP': { 
                actual: { ctas: 0, monto: 0, bancos: {} }, 
                anterior: { ctas: 0, monto: 0, bancos: {} }, 
                ticketsSinConciliar: { ctas: 0, monto: 0 },
                conciliados: { ctas: 0, monto: 0 }
            }
        };

        // Pagos agrupados por gestor
        const gestoresMap: Record<string, any> = {};

        const isBankMethod = (method: string, banco?: string | null, ticketId?: string | null) => {
            const m = (method || '').toLowerCase();
            return m.includes('banc') || 
                   m.includes('transf') || 
                   m.includes('depo') || 
                   Boolean(banco) || 
                   Boolean(ticketId);
        };

        // 4. Procesar todos los pagos para gestores y para resumen bancario
        pagosAll.forEach(pago => {
            const cid = pago.cobradorId;
            const cobradorNombre = pago.cobrador?.codigoGestor || pago.cobrador?.name || 'Desconocido';

            if (!gestoresMap[cid]) {
                gestoresMap[cid] = {
                    id: cid,
                    nombre: pago.cobrador?.name || 'Desconocido',
                    codigoGestor: pago.cobrador?.codigoGestor || '-',
                    cantidadPagos: 0,
                    totalCobrado: 0
                };
            }

            const abono = Number(pago.monto || 0);
            const mora = Number(pago.interesMoratorio || 0);
            const gcob = Number(pago.gastosCobranza || 0);
            const totalPago = abono + mora + gcob;

            gestoresMap[cid].cantidadPagos++;
            gestoresMap[cid].totalCobrado += totalPago;

            // Clasificar en resumen bancario DQ o DP si es bancario o si se registró en la ruta
            const codigo = pago.cliente?.codigoCliente || '';
            const pref = codigo.substring(0, 2).toUpperCase();

            if (resumenPrefijos[pref]) {
                const esBancario = isBankMethod(pago.metodoPago, pago.banco, pago.ticketId);
                
                if (esBancario) {
                    const isActual = new Date(pago.fechaPago) >= startDate;
                    const cat = isActual ? 'actual' : 'anterior';
                    
                    let bancoNombre = (pago.banco || '').trim().toUpperCase();
                    if (!bancoNombre) {
                        if (pago.ticket?.cuentaDestino?.includes('0330253963')) {
                            bancoNombre = 'BANORTE';
                        } else if (pago.ticket?.cuentaDestino?.includes('22001022837') || pago.ticket?.cuentaDestino?.includes('65505732541')) {
                            bancoNombre = 'SANTANDER';
                        } else {
                            bancoNombre = 'SANTANDER';
                        }
                    }

                    resumenPrefijos[pref][cat].ctas++;
                    resumenPrefijos[pref][cat].monto += totalPago;

                    if (!resumenPrefijos[pref][cat].bancos[bancoNombre]) {
                        resumenPrefijos[pref][cat].bancos[bancoNombre] = { ctas: 0, monto: 0 };
                    }
                    resumenPrefijos[pref][cat].bancos[bancoNombre].ctas++;
                    resumenPrefijos[pref][cat].bancos[bancoNombre].monto += totalPago;

                    if (pago.ticket?.conciliado) {
                        resumenPrefijos[pref].conciliados.ctas++;
                        resumenPrefijos[pref].conciliados.monto += totalPago;
                    }
                }
            }
        });

        // 5. Analizar tickets sin conciliar
        ticketsAll.forEach((ticket: any) => {
            const codigo = ticket.cliente?.codigoCliente || '';
            const pref = codigo.substring(0, 2).toUpperCase();
            if (resumenPrefijos[pref]) {
                const combinedMovs = [
                    ...(ticket.movimientosBanorte0330253963 || []),
                    ...(ticket.movimientosSantander22001022837 || []),
                    ...(ticket.movimientosSantander65505732541 || []),
                ];

                if (combinedMovs.length === 0 && !ticket.conciliado) {
                    resumenPrefijos[pref].ticketsSinConciliar.ctas++;
                    resumenPrefijos[pref].ticketsSinConciliar.monto += Number(ticket.monto || 0);
                }
            }
        });

        // 6. Abonos bancarios sin asignar a tickets
        const abonosSinAsignar = {
            ctas: movimientosBancos.filter((m: any) => !m.ticketId).length,
            monto: movimientosBancos.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0)
        };

        // 7. Formatear resumen para UI
        const calcResumen = (pref: string) => {
            const p = resumenPrefijos[pref];
            const totalC = p.actual.monto + p.anterior.monto;
            const totalCtas = p.actual.ctas + p.anterior.ctas;

            // Discrepancia: tickets sin conciliar o diferencia con banco
            const ticketsSinConciliarMonto = p.ticketsSinConciliar.monto;
            const ticketsSinConciliarCtas = p.ticketsSinConciliar.ctas;

            return {
                ...p,
                total: { ctas: totalCtas, monto: totalC },
                discrepancia: {
                    ctas: ticketsSinConciliarCtas,
                    monto: ticketsSinConciliarMonto
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

    } catch (error: any) {
        console.error('Error al obtener cuadre:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!await checkPermission(userRole, 'tesoreria')) {
            return NextResponse.json({ error: 'Solo administradores, gestores y dirección pueden finalizar el cuadre' }, { status: 403 });
        }

        // Reactivar todos los clientes con saldo pendiente
        const result = await prisma.cliente.updateMany({
            where: {
                saldoActual: { gt: 0 },
                statusCuenta: 'inactivo'
            },
            data: {
                statusCuenta: 'activo'
            }
        });

        return NextResponse.json({ 
            message: 'Cuadre finalizado y clientes reactivados',
            reactivados: result.count
        });

    } catch (error: any) {
        console.error('Error al finalizar cuadre:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
