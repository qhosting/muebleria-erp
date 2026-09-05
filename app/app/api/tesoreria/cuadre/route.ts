import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function toCdmxDateString(date: any): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Mexico_City',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(d);
}

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
                    select: { 
                        id: true, 
                        codigoCliente: true, 
                        nombreCompleto: true,
                        cuentasBancarias: true,
                        movimientosSantander22001022837: true,
                        movimientosSantander65505732541: true,
                        movimientosBanorte0330253963: true,
                    }
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

        const initBancosMap = () => ({
            'SANTANDER · 22001022837': { ctas: 0, monto: 0 },
            'SANTANDER · 65505732541': { ctas: 0, monto: 0 },
            'BANORTE · 0330253963': { ctas: 0, monto: 0 }
        });

        const resumenPrefijos: Record<string, any> = {
            'DQ': { 
                actual: { ctas: 0, monto: 0, bancos: initBancosMap() }, 
                anterior: { ctas: 0, monto: 0, bancos: initBancosMap() }, 
                ticketsSinConciliar: { ctas: 0, monto: 0 },
                conciliados: { ctas: 0, monto: 0 }
            },
            'DP': { 
                actual: { ctas: 0, monto: 0, bancos: initBancosMap() }, 
                anterior: { ctas: 0, monto: 0, bancos: initBancosMap() }, 
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

        // Resolver cuenta bancaria de la empresa (dashboard/tesoreria/bancos) para cada pago
        const resolveCuentaEmpresa = (pago: any): string => {
            const t = pago.ticket;
            // 1. Vinculación directa con movimientos bancarios del ticket
            if (t) {
                if ((t.movimientosSantander22001022837 || []).length > 0) return 'SANTANDER · 22001022837';
                if ((t.movimientosSantander65505732541 || []).length > 0) return 'SANTANDER · 65505732541';
                if ((t.movimientosBanorte0330253963 || []).length > 0) return 'BANORTE · 0330253963';

                // 2. Cuenta destino especificada en el ticket
                const cd = (t.cuentaDestino || '').toUpperCase();
                if (cd.includes('22001022837') || cd.includes('22837')) return 'SANTANDER · 22001022837';
                if (cd.includes('65505732541') || cd.includes('5732541') || cd.includes('541')) return 'SANTANDER · 65505732541';
                if (cd.includes('0330253963') || cd.includes('253963') || cd.includes('5396') || cd.includes('BANORTE')) return 'BANORTE · 0330253963';
            }

            // 3. Movimientos bancarios del cliente en el rango
            const c = pago.cliente;
            if (c) {
                const m1 = (c.movimientosSantander22001022837 || []).length;
                const m2 = (c.movimientosSantander65505732541 || []).length;
                const m3 = (c.movimientosBanorte0330253963 || []).length;
                if (m1 > 0 && m2 === 0 && m3 === 0) return 'SANTANDER · 22001022837';
                if (m2 > 0 && m1 === 0 && m3 === 0) return 'SANTANDER · 65505732541';
                if (m3 > 0 && m1 === 0 && m2 === 0) return 'BANORTE · 0330253963';

                // 4. Cuenta bancaria habitual del cliente
                const ctas = c.cuentasBancarias || [];
                const ctaHabitual = ctas.find((cb: any) => cb.esHabitual) || ctas[0];
                if (ctaHabitual) {
                    const ctaNum = ((ctaHabitual.cuentaEmpresa || '') + ' ' + (ctaHabitual.bancoEmpresa || '')).toUpperCase();
                    if (ctaNum.includes('22001022837') || ctaNum.includes('22837')) return 'SANTANDER · 22001022837';
                    if (ctaNum.includes('65505732541') || ctaNum.includes('541')) return 'SANTANDER · 65505732541';
                    if (ctaNum.includes('0330253963') || ctaNum.includes('5396') || ctaNum.includes('BANORTE')) return 'BANORTE · 0330253963';
                }
            }

            // 5. Especificación en pago.banco
            const b = (pago.banco || '').toUpperCase();
            if (b.includes('BANORTE') || b.includes('0330253963')) return 'BANORTE · 0330253963';
            if (b.includes('65505732541')) return 'SANTANDER · 65505732541';
            if (b.includes('SANTANDER') || b.includes('22001022837')) return 'SANTANDER · 22001022837';

            // 6. Cuenta bancaria principal por defecto de la empresa (Santander 22001022837)
            return 'SANTANDER · 22001022837';
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
                    const t = pago.ticket;
                    const movBancario = t?.movimientosSantander22001022837?.[0] 
                                     || t?.movimientosSantander65505732541?.[0] 
                                     || t?.movimientosBanorte0330253963?.[0];

                    const fechaDepositoBanco = movBancario?.fechaOperacion 
                        ? movBancario.fechaOperacion 
                        : (t?.fecha ? t.fecha : pago.fechaPago);

                    const startDateStr = dateStartParam || toCdmxDateString(startDate);
                    const fechaDepositoStr = toCdmxDateString(fechaDepositoBanco);
                    const isActual = fechaDepositoStr >= startDateStr;
                    const cat = isActual ? 'actual' : 'anterior';
                    
                    const bancoNombre = resolveCuentaEmpresa(pago);

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
            monto: movimientosBancos.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0),
            bancos: {
                'SANTANDER · 22001022837': {
                    ctas: m1.filter((m: any) => !m.ticketId).length,
                    monto: m1.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0)
                },
                'SANTANDER · 65505732541': {
                    ctas: m2.filter((m: any) => !m.ticketId).length,
                    monto: m2.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0)
                },
                'BANORTE · 0330253963': {
                    ctas: m3.filter((m: any) => !m.ticketId).length,
                    monto: m3.filter((m: any) => !m.ticketId).reduce((acc: number, curr: any) => acc + (curr.abono || 0), 0)
                }
            }
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
