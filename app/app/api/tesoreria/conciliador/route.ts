import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseValidDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const BANCOS_CLABE: Record<string, string> = {
    '002': 'BANAMEX',
    '012': 'BBVA MEXICO',
    '014': 'SANTANDER',
    '021': 'HSBC',
    '030': 'BANCO DEL BAJIO',
    '036': 'INBURSA',
    '042': 'MIFEL',
    '044': 'SCOTIABANK',
    '058': 'BANREGIO',
    '062': 'AFIRME',
    '072': 'BANORTE',
    '127': 'BANCO AZTECA',
    '137': 'BANCOPPEL',
    '138': 'NU MEXICO',
    '638': 'NU MEXICO',
    '140': 'CONSUBANCO',
    '143': 'CIBANCO',
    '646': 'STP',
    '722': 'SPIN BY OXXO',
    '728': 'SPIN BY OXXO'
};

const CUENTAS_EMPRESA_EXCLUIDAS = new Set([
    '22001022837',
    '65505732541',
    '0330253963',
    '072197003302539638'
]);

function extractDatosOrdenante(mov: any, ticket: any) {
    let clabe: string | null = null;
    let cuenta: string | null = null;
    let banco: string | null = mov?.bancoOrigen || null;
    let nombreTitular: string | null = null;

    const dataPool = `${mov?.clabeEmisor || ''} ${mov?.cuentaEmisor || ''} ${mov?.concepto || ''} ${mov?.descripcionDetallada || ''} ${mov?.descripcionGeneral || ''}`;

    // CLABE de 18 dígitos
    const clabeDirect = mov?.clabeEmisor && String(mov.clabeEmisor).trim().length === 18 ? String(mov.clabeEmisor).trim() : null;
    const clabeMatch = (dataPool.match(/\b\d{18}\b/) || [])[0] || null;
    clabe = clabeDirect || clabeMatch;

    if (clabe && CUENTAS_EMPRESA_EXCLUIDAS.has(clabe)) {
        clabe = null;
    }

    // Cuenta de 10-16 dígitos
    const cuentaDirect = mov?.cuentaEmisor && String(mov.cuentaEmisor).trim().length >= 10 ? String(mov.cuentaEmisor).trim() : null;
    const cuentaMatch = (dataPool.match(/(?:CLABE\/Cta|Cta|Cuenta|CLABE):\s*(\d{10,18})/i) || [])[1] || (dataPool.match(/\b\d{10,16}\b/) || [])[0] || null;
    cuenta = cuentaDirect || cuentaMatch;
    if (cuenta === clabe) cuenta = null;

    if (cuenta && CUENTAS_EMPRESA_EXCLUIDAS.has(cuenta)) {
        cuenta = null;
    }

    // Identificar banco por CLABE si no viene
    if (clabe && clabe.length === 18) {
        const prefijo = clabe.slice(0, 3);
        if (BANCOS_CLABE[prefijo]) {
            banco = BANCOS_CLABE[prefijo];
        }
    }

    // Nombre titular / ordenante
    if (mov?.descripcionDetallada) {
        const mOrigen = mov.descripcionDetallada.match(/Origen:\s*([^(|]+)(?:\s*\(([^)]+)\))?/i);
        if (mOrigen && mOrigen[1].trim()) {
            nombreTitular = mOrigen[1].trim();
            if (!banco && mOrigen[2]) banco = mOrigen[2].trim();
        }
        if (!nombreTitular) {
            const mTitular = mov.descripcionDetallada.match(/Titular:\s*([^,|]+)/i);
            if (mTitular && mTitular[1].trim()) nombreTitular = mTitular[1].trim();
        }
    }

    // Limpiar 'DEL CLIENTE' o prefijos similares
    if (nombreTitular) {
        nombreTitular = nombreTitular.replace(/^DEL CLIENTE\s+/i, '').trim();
    }

    // Validar si nombreTitular contiene la empresa
    if (nombreTitular && (nombreTitular.toUpperCase().includes('DASO') || nombreTitular.toUpperCase().includes('MUEBLERO'))) {
        nombreTitular = null;
    }

    // Validar ticket.remitente (rechazar LIDs de whatsapp como 12345@lid o números telefónicos)
    if (!nombreTitular && ticket?.remitente) {
        const rem = ticket.remitente.trim();
        const esLidOPhone = rem.includes('@') || /^\+?\d{10,15}$/.test(rem);
        if (!esLidOPhone && rem.length >= 3) {
            nombreTitular = rem;
        }
    }

    // Si aún no hay titular, usar el nombre del cliente
    if (!nombreTitular && ticket?.cliente?.nombreCompleto) {
        nombreTitular = ticket.cliente.nombreCompleto.trim();
    }

    return { clabe, cuenta, banco, nombreTitular };
}

async function guardarCuentaCliente(prismaTx: any, clienteId: string, datos: { clabe: string | null, cuenta: string | null, banco: string | null, nombreTitular: string | null }) {
    if (!clienteId) return;
    const { clabe, cuenta, banco, nombreTitular } = datos;
    if (!clabe && !cuenta && !nombreTitular) return;

    try {
        if (clabe) {
            await (prismaTx as any).cuentaBancariaCliente.upsert({
                where: { clabe },
                update: {
                    clienteId,
                    cuenta: cuenta || undefined,
                    banco: banco || undefined,
                    nombreTitular: nombreTitular || undefined,
                    updatedAt: new Date()
                },
                create: {
                    clabe,
                    cuenta: cuenta || null,
                    banco: banco || null,
                    nombreTitular: nombreTitular || null,
                    clienteId
                }
            });
        } else if (cuenta) {
            const existing = await (prismaTx as any).cuentaBancariaCliente.findFirst({
                where: { clienteId, cuenta }
            });
            if (existing) {
                await (prismaTx as any).cuentaBancariaCliente.update({
                    where: { id: existing.id },
                    data: {
                        banco: banco || undefined,
                        nombreTitular: nombreTitular || undefined,
                        updatedAt: new Date()
                    }
                });
            } else {
                await (prismaTx as any).cuentaBancariaCliente.create({
                    data: {
                        clienteId,
                        cuenta,
                        banco: banco || null,
                        nombreTitular: nombreTitular || null
                    }
                });
            }
        }
    } catch (err) {
        console.error('Error guardando cuenta bancaria de cliente:', err);
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any)?.role;
        const allowedRoles = ['admin', 'gestor_cobranza', 'direccion', 'reporte_cobranza'];
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Permisos insuficientes para acceder al conciliador de tesorería' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const desde = searchParams.get('desde');
        const hasta = searchParams.get('hasta');
        const estado = (searchParams.get('estado') || 'PENDIENTE').toUpperCase();
        const cobradorId = searchParams.get('cobradorId') || searchParams.get('cobrador');
        const ordenParam = (searchParams.get('orden') || 'asc').toLowerCase();
        const sortDirection = ordenParam === 'desc' ? 'desc' : 'asc';

        // Filtro de estado de conciliación
        const FECHA_MINIMA_OPERATIVA = new Date('2026-07-29T00:00:00.000Z');
        const ticketWhere: any = {};
        const movWhere: any = { abono: { gt: 0 } };

        if (estado === 'PENDIENTE') {
            ticketWhere.conciliado = false;
            movWhere.ticketId = null;
        } else if (estado === 'CONCILIADO') {
            ticketWhere.conciliado = true;
            movWhere.ticketId = { not: null };
        } // Si es TODOS no agregamos restricción en conciliado / ticketId

        // 🛡️ Regla de migración: Tickets anteriores al 29/07/2026 provienen de migración y no se consideran pendientes ni operativos
        const baseMigracionFilter = [
            { fecha: { gte: FECHA_MINIMA_OPERATIVA } },
            { AND: [{ fecha: null }, { creadoEn: { gte: FECHA_MINIMA_OPERATIVA } }] }
        ];

        const andConditions: any[] = [{ OR: baseMigracionFilter }];

        if (cobradorId && cobradorId !== 'TODOS') {
            andConditions.push({
                OR: [
                    { gestorId: cobradorId },
                    { cliente: { cobradorAsignadoId: cobradorId } }
                ]
            });
        }

        if (desde && hasta) {
            const dStart = new Date(`${desde}T00:00:00.000Z`);
            const dEnd = new Date(`${hasta}T23:59:59.999Z`);

            const dateFilter = [
                { fecha: { gte: dStart, lte: dEnd } },
                { creadoEn: { gte: dStart, lte: dEnd } }
            ];

            andConditions.push({ OR: dateFilter });
            movWhere.fechaOperacion = { gte: dStart, lte: dEnd };
        }

        ticketWhere.AND = andConditions;

        // 1. Obtener Tickets ordenados por más antiguos primero (asc)
        const ticketsPendientes = await prisma.ticket.findMany({
            where: ticketWhere,
            include: {
                cliente: { 
                    select: { 
                        id: true,
                        nombreCompleto: true, 
                        codigoCliente: true,
                        saldoActual: true,
                        cobradorAsignado: {
                            select: {
                                name: true,
                                codigoGestor: true
                            }
                        },
                        // @ts-ignore
                        cuentasBancarias: true 
                    } 
                } as any,
                gestor: { 
                    select: { 
                        name: true,
                        codigoGestor: true 
                    } 
                },
                pagos: {
                    select: {
                        id: true,
                        monto: true,
                        fechaPago: true
                    }
                }
            },
            orderBy: [
                { fecha: sortDirection },
                { creadoEn: sortDirection }
            ],
            take: 200
        });

        // Asegurar ordenamiento estricto por fecha más antigua primero (o más reciente si desc)
        ticketsPendientes.sort((a, b) => {
            const timeA = new Date(a.fecha || a.creadoEn).getTime();
            const timeB = new Date(b.fecha || b.creadoEn).getTime();
            return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
        });

        // 2. Obtener Movimientos Bancarios no conciliados de las 3 tablas
        const [m1, m2, m3] = await Promise.all([
            prisma.movimientoSantander22001022837.findMany({
                where: movWhere,
                orderBy: { fechaOperacion: 'desc' },
                take: 200
            }),
            prisma.movimientoSantander65505732541.findMany({
                where: movWhere,
                orderBy: { fechaOperacion: 'desc' },
                take: 200
            }),
            prisma.movimientoBanorte0330253963.findMany({
                where: movWhere,
                orderBy: { fechaOperacion: 'desc' },
                take: 200
            })
        ]);

        const movimientosPendientes = [
            ...m1.map(m => ({ ...m, tabla: 'movimientoSantander22001022837', cuentaDestino: '22001022837', bancoDestino: 'SANTANDER' })),
            ...m2.map(m => ({ ...m, tabla: 'movimientoSantander65505732541', cuentaDestino: '65505732541', bancoDestino: 'SANTANDER' })),
            ...m3.map(m => ({ ...m, tabla: 'movimientoBanorte0330253963', cuentaDestino: '0330253963', bancoDestino: 'BANORTE' }))
        ];

        // Ordenamos descendente por fecha de operación
        movimientosPendientes.sort((a, b) => b.fechaOperacion.getTime() - a.fechaOperacion.getTime());

        // 3. Obtener Catálogo de Cuentas para búsqueda inversa
        const cuentasConocidas = await (prisma as any).cuentaBancariaCliente.findMany({
            include: { cliente: { select: { id: true, nombreCompleto: true, codigoCliente: true } } }
        });

        // 4. Algoritmo de Sugerencia Inteligente (Scoring)
        const sugerencias = [];
        const movimientosDisponibles = [...movimientosPendientes];

        // Función auxiliar para normalizar cadenas (remueve acentos, mayúsculas, etc.)
        const normalizarTexto = (text: string) => {
            if (!text) return "";
            return text
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        };

        for (const ticket of ticketsPendientes) {
            let bestMatch: any = null;
            let bestPriority = 10;
            let razon = "";

            const monto = Number(ticket.monto);
            const contrato = (ticket.cliente?.codigoCliente || "").toUpperCase();
            const normalizedContrato = contrato.replace(/[^A-Z0-9]/g, "");
            
            const nombre = normalizarTexto(ticket.cliente?.nombreCompleto || "");
            const nombreSubstr = nombre.substring(0, 15);
            
            const cuentaTicket = ticket.cuentaOrigen ? ticket.cuentaOrigen.trim() : null;
            const refTicket = (ticket.referencia || "").replace(/^0+/, "").trim().toUpperCase();
            const folioTicket = (ticket.folio || "").replace(/^0+/, "").trim().toUpperCase();
            const rastreoTicket = ticket.claveRastreo ? ticket.claveRastreo.trim().toUpperCase() : null;

            for (const mov of movimientosDisponibles) {
                const abono = Number(mov.abono);
                const desc = normalizarTexto(`${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''}`);
                const dataPool = `${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''}`.toUpperCase();

                const isMontoExact = Math.abs(monto - abono) < 0.01;
                // 🛡️ Regla estricta de auditoría: El monto del depósito bancario debe coincidir exactamente con el ticket
                if (!isMontoExact) continue;
                
                // Prioridad 1: Clave de Rastreo SPEI exacta (con monto exacto garantizado)
                if (rastreoTicket && rastreoTicket.length > 5 && dataPool.includes(rastreoTicket)) {
                    bestMatch = mov;
                    bestPriority = 1;
                    razon = `Coincidencia exacta por Clave de Rastreo (${rastreoTicket}) y Monto ($${monto.toFixed(2)})`;
                    break;
                }

                // Prioridad 2: Cuenta bancaria / CLABE registrada previamente para este cliente
                if (isMontoExact && (cuentaTicket || (ticket.cliente as any)?.cuentasBancarias?.length > 0)) {
                    const cuentasCliente = [
                        cuentaTicket,
                        ...((ticket.cliente as any)?.cuentasBancarias?.map((c: any) => c.clabe || c.cuenta) || [])
                    ].filter(Boolean);

                    const coincideCuenta = cuentasCliente.some(c => c && dataPool.includes(c.trim()));
                    if (coincideCuenta && bestPriority > 2) {
                        bestMatch = mov;
                        bestPriority = 2;
                        razon = `Mismo monto ($${monto.toFixed(2)}) y cuenta bancaria/CLABE recurrente del cliente`;
                        continue;
                    }
                }

                // Prioridad 3: Contrato explícito en el concepto y monto exacto
                if (isMontoExact && normalizedContrato && normalizedContrato.length >= 5 && dataPool.replace(/[^A-Z0-9]/g, "").includes(normalizedContrato)) {
                    if (bestPriority > 3) {
                        bestMatch = mov;
                        bestPriority = 3;
                        razon = `Mismo monto ($${monto.toFixed(2)}) y Contrato ${contrato} en el concepto bancario`;
                        continue;
                    }
                }

                // Prioridad 4: Folio o Referencia numérica en el movimiento y monto exacto
                if (isMontoExact) {
                    if (folioTicket && folioTicket.length >= 4 && dataPool.includes(folioTicket)) {
                        if (bestPriority > 4) {
                            bestMatch = mov;
                            bestPriority = 4;
                            razon = `Mismo monto ($${monto.toFixed(2)}) y Folio/Autorización ${folioTicket}`;
                            continue;
                        }
                    }
                    if (refTicket && refTicket.length >= 4 && dataPool.includes(refTicket)) {
                        if (bestPriority > 4) {
                            bestMatch = mov;
                            bestPriority = 4;
                            razon = `Mismo monto ($${monto.toFixed(2)}) y Referencia ${refTicket}`;
                            continue;
                        }
                    }
                }

                // Prioridad 5: Nombre del cliente en el concepto bancario y monto exacto
                if (isMontoExact && nombreSubstr.length >= 6 && desc.includes(nombreSubstr)) {
                    if (bestPriority > 5) {
                        bestMatch = mov;
                        bestPriority = 5;
                        razon = `Mismo monto ($${monto.toFixed(2)}) y nombre "${nombreSubstr}" en el movimiento`;
                        continue;
                    }
                }

                // Prioridad 6: Solo coincidencia de monto exacto y misma fecha
                if (isMontoExact && bestPriority > 6) {
                    const ticketDate = ticket.fecha || ticket.creadoEn;
                    if (ticketDate && mov.fechaOperacion) {
                        const tDate = new Date(ticketDate);
                        const mDate = new Date(mov.fechaOperacion);
                        const diffHours = Math.abs(tDate.getTime() - mDate.getTime()) / (1000 * 60 * 60);
                        if (diffHours <= 36) {
                            bestMatch = mov;
                            bestPriority = 6;
                            razon = `Mismo monto ($${monto.toFixed(2)}) y fecha cercana (${tDate.toISOString().split('T')[0]})`;
                            continue;
                        }
                    }
                }
            }

            if (bestMatch) {
                sugerencias.push({
                    ticket,
                    movimiento: bestMatch,
                    razon,
                    prioridad: bestPriority
                });
            }
        }

        // 5. Obtener lista de todos los cobradores / gestores
        const cobradores = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'cobrador' },
                    { codigoGestor: { not: null } },
                    { clientesAsignados: { some: {} } },
                    { tickets: { some: {} } }
                ]
            },
            select: {
                id: true,
                name: true,
                codigoGestor: true,
                email: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json({
            tickets: ticketsPendientes,
            movimientos: movimientosPendientes,
            sugerencias,
            cobradores,
            cuentasConocidas: cuentasConocidas.length
        });

    } catch (error) {
        console.error('Error al cargar datos del conciliador:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

// Para ejecutar un Emparejamiento Manual, Aprendizaje o Descartar Ticket
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const userRole = (session.user as any)?.role;
        const allowedPostRoles = ['admin', 'gestor_cobranza', 'direccion'];
        if (!allowedPostRoles.includes(userRole)) {
            return NextResponse.json({ error: 'Permisos insuficientes para realizar operaciones de tesorería' }, { status: 403 });
        }

        const body = await request.json();
        const { ticketId, movimientoId, tabla, action } = body;

        if (action === 'eliminar' || body.eliminar) {
            if (!ticketId) return NextResponse.json({ error: 'ID de ticket requerido' }, { status: 400 });
            await prisma.pago.deleteMany({
                where: { ticketId }
            });
            await prisma.ticket.delete({
                where: { id: ticketId }
            });
            return NextResponse.json({ success: true, message: 'Ticket eliminado exitosamente' });
        }

        if (action === 'descartar' || body.descartar) {
            if (!ticketId) return NextResponse.json({ error: 'ID de ticket requerido' }, { status: 400 });
            await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    conciliado: true,
                    concepto: 'TICKET DESCARTADO EN CONCILIADOR'
                }
            });
            return NextResponse.json({ success: true, message: 'Ticket descartado exitosamente' });
        }

        // --- ACCIÓN: CONCILIAR MANUALMENTE COMO MIGRACIÓN (SIN MOVIMIENTO BANCARIO) ---
        if (action === 'conciliar_migracion' || action === 'migracion') {
            if (!ticketId) return NextResponse.json({ error: 'ID de ticket requerido' }, { status: 400 });

            const ticket: any = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { cliente: true, pagos: true }
            });

            if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });

            const operations: any[] = [
                prisma.ticket.update({
                    where: { id: ticketId },
                    data: {
                        conciliado: true,
                        concepto: ticket.concepto ? `${ticket.concepto} (MIGRACIÓN MANUAL)` : 'TICKET CONCILIADO MIGRACIÓN MANUAL'
                    }
                })
            ];

            // 1. Si el ticket ya tenía pagos registrados (ej. por el bot con 'PENDIENTE')
            if (ticket.pagos && ticket.pagos.length > 0) {
                for (const p of ticket.pagos) {
                    const nuevoConcepto = p.concepto 
                        ? p.concepto.replace(/PENDIENTE/gi, 'MIGRACION') 
                        : `TKT: ${ticketId} / MIGRACION`;
                    operations.push(prisma.pago.update({
                        where: { id: p.id },
                        data: {
                            concepto: nuevoConcepto.includes('MIGRACION') ? nuevoConcepto : `TKT: ${ticketId} / MIGRACION`,
                            sincronizado: true
                        }
                    }));
                }
            } else if (ticket.clienteId && ticket.cliente) {
                // 2. Si el ticket no tenía pago previo, creamos el pago de migración y aplicamos al saldo
                const saldoAnterior = parseFloat(ticket.cliente.saldoActual.toString());
                const montoPago = parseFloat(ticket.monto.toString());
                const saldoNuevo = Math.max(0, saldoAnterior - montoPago);

                const userId = (session.user as any)?.id;
                const cobradorId = userId || ticket.cliente.cobradorAsignadoId || 'system';
                const fechaPagoFinal = parseValidDate(ticket.fecha || ticket.creadoEn || new Date());

                operations.push(prisma.pago.create({
                    data: {
                        clienteId: ticket.cliente.id,
                        cobradorId: cobradorId,
                        ticketId: ticket.id,
                        monto: montoPago,
                        concepto: `TKT: ${ticket.id} / MIGRACION`,
                        tipoPago: 'regular',
                        fechaPago: fechaPagoFinal,
                        metodoPago: 'MIGRACION MANUAL',
                        saldoAnterior,
                        saldoNuevo,
                        sincronizado: true,
                        banco: 'MIGRACION'
                    }
                }));

                operations.push(prisma.cliente.update({
                    where: { id: ticket.cliente.id },
                    data: { saldoActual: saldoNuevo }
                }));
            }

            await prisma.$transaction(operations);

            return NextResponse.json({
                success: true,
                message: `Ticket #${ticketId} conciliado exitosamente como MIGRACIÓN`
            });
        }

        // --- ACCIÓN: DESCONCILIAR MOVIMIENTO BANCARIO DEL TICKET ---
        if (action === 'desconciliar' || action === 'desvincular') {
            const targetMovId = movimientoId || body.id;
            if (!targetMovId) return NextResponse.json({ error: 'ID de movimiento bancario requerido' }, { status: 400 });

            let movimiento: any = null;
            let tablaOrigen = tabla;

            if (tablaOrigen === 'movimientoSantander22001022837') {
                movimiento = await prisma.movimientoSantander22001022837.findUnique({ where: { id: targetMovId } });
            } else if (tablaOrigen === 'movimientoSantander65505732541') {
                movimiento = await prisma.movimientoSantander65505732541.findUnique({ where: { id: targetMovId } });
            } else if (tablaOrigen === 'movimientoBanorte0330253963') {
                movimiento = await prisma.movimientoBanorte0330253963.findUnique({ where: { id: targetMovId } });
            } else {
                movimiento = await prisma.movimientoSantander22001022837.findUnique({ where: { id: targetMovId } });
                if (movimiento) tablaOrigen = 'movimientoSantander22001022837';
                else {
                    movimiento = await prisma.movimientoSantander65505732541.findUnique({ where: { id: targetMovId } });
                    if (movimiento) tablaOrigen = 'movimientoSantander65505732541';
                    else {
                        movimiento = await prisma.movimientoBanorte0330253963.findUnique({ where: { id: targetMovId } });
                        if (movimiento) tablaOrigen = 'movimientoBanorte0330253963';
                    }
                }
            }

            if (!movimiento) return NextResponse.json({ error: 'Movimiento bancario no encontrado' }, { status: 404 });

            const targetTicketId = movimiento.ticketId || ticketId;
            const operations: any[] = [];

            // 1. Desvincular el movimiento bancario
            const clearMovData = {
                ticketId: null,
                clienteId: null,
                fechaIdentificado: null
            };

            if (tablaOrigen === 'movimientoSantander22001022837') {
                operations.push(prisma.movimientoSantander22001022837.update({
                    where: { id: targetMovId },
                    data: clearMovData
                }));
            } else if (tablaOrigen === 'movimientoSantander65505732541') {
                operations.push(prisma.movimientoSantander65505732541.update({
                    where: { id: targetMovId },
                    data: clearMovData
                }));
            } else if (tablaOrigen === 'movimientoBanorte0330253963') {
                operations.push(prisma.movimientoBanorte0330253963.update({
                    where: { id: targetMovId },
                    data: clearMovData
                }));
            }

            // 2. Si hay ticket asociado, desmarcarlo como no conciliado
            if (targetTicketId) {
                operations.push(prisma.ticket.update({
                    where: { id: targetTicketId },
                    data: { conciliado: false }
                }));

                // 3. Revisar si hay un pago generado únicamente por el conciliador para revertir el saldo
                const pagoConciliado = await prisma.pago.findFirst({
                    where: {
                        ticketId: targetTicketId,
                        metodoPago: { in: ['TESORERIA CONCILIADOR', 'SPEI AUTO CONCILIADO', 'MIGRACION MANUAL'] }
                    },
                    include: { cliente: true }
                });

                if (pagoConciliado && pagoConciliado.cliente) {
                    const saldoActual = parseFloat(pagoConciliado.cliente.saldoActual.toString());
                    const montoPago = parseFloat(pagoConciliado.monto.toString());
                    const saldoRevertido = saldoActual + montoPago;

                    operations.push(prisma.cliente.update({
                        where: { id: pagoConciliado.clienteId },
                        data: { saldoActual: saldoRevertido }
                    }));

                    operations.push(prisma.pago.delete({
                        where: { id: pagoConciliado.id }
                    }));
                }

                // 4. Si el ticket tenía pagos previos (ej. registrados por el bot), actualizar concepto a PENDIENTE
                operations.push(prisma.pago.updateMany({
                    where: {
                        ticketId: targetTicketId,
                        NOT: { metodoPago: { in: ['TESORERIA CONCILIADOR', 'SPEI AUTO CONCILIADO', 'MIGRACION MANUAL'] } }
                    },
                    data: {
                        concepto: `TKT: ${targetTicketId} / PENDIENTE`
                    }
                }));
            }

            await prisma.$transaction(operations);

            return NextResponse.json({
                success: true,
                message: `Movimiento bancario desconciliado exitosamente${targetTicketId ? ` del ticket #${targetTicketId}` : ''}`
            });
        }

        // --- ACCIÓN: REGENERAR CUENTAS HABITUALES DE BANCOS ---
        if (action === 'regenerar_cuentas') {
            const [m1, m2, m3] = await Promise.all([
                prisma.movimientoSantander22001022837.findMany({
                    where: { OR: [{ ticketId: { not: null } }, { clienteId: { not: null } }] },
                    include: { ticket: { include: { cliente: true } }, cliente: true }
                }),
                prisma.movimientoSantander65505732541.findMany({
                    where: { OR: [{ ticketId: { not: null } }, { clienteId: { not: null } }] },
                    include: { ticket: { include: { cliente: true } }, cliente: true }
                }),
                prisma.movimientoBanorte0330253963.findMany({
                    where: { OR: [{ ticketId: { not: null } }, { clienteId: { not: null } }] },
                    include: { ticket: { include: { cliente: true } }, cliente: true }
                })
            ]);

            const allReconciled = [
                ...m1.map(m => ({ ...m, tabla: 'movimientoSantander22001022837' })),
                ...m2.map(m => ({ ...m, tabla: 'movimientoSantander65505732541' })),
                ...m3.map(m => ({ ...m, tabla: 'movimientoBanorte0330253963' }))
            ];

            const cuentasMap = new Map<string, any>();

            for (const mov of allReconciled) {
                const cliente = mov.ticket?.cliente || mov.cliente;
                const clienteId = cliente?.id;
                if (!clienteId) continue;

                const ticket = mov.ticket || { cliente };
                const datos = extractDatosOrdenante(mov, ticket);

                if (!datos.clabe && !datos.cuenta) continue;

                const key = datos.clabe ? `CLABE__${datos.clabe}` : `CTA__${clienteId}__${datos.cuenta}`;

                if (!cuentasMap.has(key)) {
                    cuentasMap.set(key, {
                        clienteId,
                        clabe: datos.clabe,
                        cuenta: datos.cuenta,
                        banco: datos.banco,
                        nombreTitular: datos.nombreTitular
                    });
                } else {
                    const existing = cuentasMap.get(key);
                    if (!existing.nombreTitular && datos.nombreTitular) existing.nombreTitular = datos.nombreTitular;
                    if (!existing.banco && datos.banco) existing.banco = datos.banco;
                    if (datos.cuenta && !existing.cuenta) existing.cuenta = datos.cuenta;
                }
            }

            // Transacción: limpiar y repoblar con cuentas limpias y validadas
            const records = Array.from(cuentasMap.values()).map((c: any) => ({
                clienteId: c.clienteId,
                clabe: c.clabe || null,
                cuenta: c.cuenta || null,
                banco: c.banco || null,
                nombreTitular: c.nombreTitular || null
            }));

            await prisma.$transaction([
                (prisma as any).cuentaBancariaCliente.deleteMany({}),
                (prisma as any).cuentaBancariaCliente.createMany({
                    data: records
                })
            ]);

            return NextResponse.json({
                success: true,
                message: `Se regeneraron exitosamente ${cuentasMap.size} cuentas bancarias habituales de clientes.`,
                totalCuentas: cuentasMap.size
            });
        }

        // --- ACCIÓN: PREVISUALIZAR O AUTO-CONCILIAR SPEI (CLAVE DE RASTREO) ---
        if (action === 'preview_spei' || action === 'auto_spei' || action === 'confirm_spei' || action === 'conciliar_spei') {
            const isPreview = action === 'preview_spei';
            const approvedMatches = Array.isArray(body.matches) ? body.matches : null;

            const FECHA_MINIMA_OPERATIVA = new Date('2026-07-29T00:00:00.000Z');

            // 1. Obtener tickets pendientes (solo operativos a partir del 29/07/2026)
            let ticketsPendientes = await prisma.ticket.findMany({
                where: {
                    conciliado: false,
                    OR: [
                        { fecha: { gte: FECHA_MINIMA_OPERATIVA } },
                        { AND: [{ fecha: null }, { creadoEn: { gte: FECHA_MINIMA_OPERATIVA } }] }
                    ]
                },
                include: { 
                    cliente: {
                        select: {
                            id: true,
                            codigoCliente: true,
                            nombreCompleto: true,
                            saldoActual: true,
                            cobradorAsignadoId: true,
                            cuentasBancarias: true
                        }
                    }, 
                    pagos: true 
                }
            });

            // Si es confirm_spei con lista aprobada, filtrar solo los tickets aprobados
            if (action === 'confirm_spei' && approvedMatches) {
                const approvedTicketIds = new Set(approvedMatches.map((m: any) => m.ticketId));
                ticketsPendientes = ticketsPendientes.filter(t => approvedTicketIds.has(t.id));
            }

            // 2. Obtener movimientos bancarios no conciliados
            const [m1, m2, m3] = await Promise.all([
                prisma.movimientoSantander22001022837.findMany({
                    where: { ticketId: null, abono: { gt: 0 } },
                    orderBy: { fechaOperacion: 'desc' }
                }),
                prisma.movimientoSantander65505732541.findMany({
                    where: { ticketId: null, abono: { gt: 0 } },
                    orderBy: { fechaOperacion: 'desc' }
                }),
                prisma.movimientoBanorte0330253963.findMany({
                    where: { ticketId: null, abono: { gt: 0 } },
                    orderBy: { fechaOperacion: 'desc' }
                })
            ]);

            const movimientosPool = [
                ...m1.map(m => ({ ...m, tabla: 'movimientoSantander22001022837', banco: 'SANTANDER', cuentaDestino: '22001022837' })),
                ...m2.map(m => ({ ...m, tabla: 'movimientoSantander65505732541', banco: 'SANTANDER', cuentaDestino: '65505732541' })),
                ...m3.map(m => ({ ...m, tabla: 'movimientoBanorte0330253963', banco: 'BANORTE', cuentaDestino: '0330253963' }))
            ];

            const matches: any[] = [];
            const conciliados: any[] = [];
            const usadosMovIds = new Set<string>();

            const normalizar = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

            // Lista negra de referencias genéricas bancarias (no usar para match por folio/ref)
            const REFERENCIAS_GENERICAS = new Set([
                '1408260', '0000000', '000000', '123456', '1234567', '0000123', '0000001', '9999999',
                '00000', '11111', '0121800', '0126800', '0126850', '0123200', '0026809', '7229690'
            ]);

            const matchedPairs: { ticket: any; matchMov: any; tipoMatch: string; razonMatch: string }[] = [];

            if (action === 'confirm_spei' && approvedMatches) {
                // Modo confirmación: procesar solo los matches explícitamente aprobados
                for (const ticket of ticketsPendientes) {
                    const specificApproved = approvedMatches.find((m: any) => m.ticketId === ticket.id);
                    if (!specificApproved) continue;

                    const matchMov = movimientosPool.find(m => m.tabla === specificApproved.tabla && String(m.id) === String(specificApproved.movimientoId));
                    if (matchMov) {
                        const montoTicket = parseFloat(ticket.monto.toString());
                        const movAbono = parseFloat(matchMov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) < 0.01) {
                            matchedPairs.push({
                                ticket,
                                matchMov,
                                tipoMatch: specificApproved.tipoMatch || 'APROBADO',
                                razonMatch: 'Aprobado por el usuario (Monto verificado)'
                            });
                        } else {
                            console.warn(`[AUDITORIA] Bloqueado match en confirm_spei: Monto ticket $${montoTicket} != Depósito $${movAbono}`);
                        }
                    }
                }
            } else {
                // Modo escaneo / preview: Matching Multi-Tier con Prioridad Global
                const matchedTicketIds = new Set<string>();

                const registrarMatch = (ticket: any, mov: any, tipoMatch: string, razonMatch: string) => {
                    matchedTicketIds.add(ticket.id);
                    usadosMovIds.add(`${mov.tabla}__${mov.id}`);
                    matchedPairs.push({ ticket, matchMov: mov, tipoMatch, razonMatch });
                };

                // --- TIER 1: Clave de Rastreo SPEI Exacta ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const rawRastreo = (ticket.claveRastreo || '').trim().toUpperCase();
                    const normRastreo = normalizar(rawRastreo);
                    if (!normRastreo || normRastreo.length < 6) continue;
                    const montoTicket = parseFloat(ticket.monto.toString());

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;

                        const movClaveRastreo = (mov.claveRastreo || '').trim().toUpperCase();
                        const movRawText = `${mov.claveRastreo || ''} ${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''} ${mov.referencia || ''} ${mov.cuentaEmisor || ''}`.toUpperCase();
                        const movNormText = normalizar(movRawText);

                        if ((movClaveRastreo && (movClaveRastreo === rawRastreo || normalizar(movClaveRastreo) === normRastreo)) ||
                            movRawText.includes(rawRastreo) || movNormText.includes(normRastreo)) {
                            registrarMatch(ticket, mov, 'SPEI_EXACTO', `Clave SPEI exacta: ${rawRastreo}`);
                            break;
                        }
                    }
                }

                // --- TIER 2: Código de Cliente / Contrato DP o DQ en la leyenda bancaria ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const contrato = (ticket.cliente?.codigoCliente || '').trim().toUpperCase();
                    const normContrato = normalizar(contrato);
                    if (!normContrato || normContrato.length < 5) continue;
                    const montoTicket = parseFloat(ticket.monto.toString());

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;

                        const movRawText = `${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''} ${mov.referencia || ''}`.toUpperCase();
                        const movNormText = normalizar(movRawText);

                        if (movRawText.includes(contrato) || movNormText.includes(normContrato)) {
                            registrarMatch(ticket, mov, 'CONTRATO_DP_DQ', `Código de cliente ${contrato} detectado en concepto bancario`);
                            break;
                        }
                    }
                }

                // --- TIER 3: Cuenta Bancaria o CLABE Habitual del Cliente ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const cuentasCliente = (ticket.cliente as any)?.cuentasBancarias || [];
                    if (cuentasCliente.length === 0) continue;
                    const montoTicket = parseFloat(ticket.monto.toString());

                    const clabesCliente = cuentasCliente.map((c: any) => c.clabe).filter(Boolean);
                    const cuentasNumCliente = cuentasCliente.map((c: any) => c.cuenta).filter(Boolean);

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;

                        const movRawText = `${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''} ${mov.referencia || ''} ${mov.cuentaEmisor || ''} ${mov.clabeEmisor || ''}`.toUpperCase();
                        const movClabe = mov.clabeEmisor || (movRawText.match(/\b\d{18}\b/) || [])[0];
                        const movCta = mov.cuentaEmisor || (movRawText.match(/\b\d{10,16}\b/) || [])[0];

                        if ((movClabe && clabesCliente.includes(movClabe)) || (movCta && cuentasNumCliente.includes(movCta))) {
                            registrarMatch(ticket, mov, 'CUENTA_HABITUAL_CLIENTE', `Cuenta/CLABE habitual (${movClabe || movCta}) del cliente detectada`);
                            break;
                        }
                    }
                }

                // --- TIER 4: Nombre del Cliente en concepto bancario ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const nombreCompleto = (ticket.cliente?.nombreCompleto || '').trim().toUpperCase();
                    const palabrasNombre = nombreCompleto
                        .split(/\s+/)
                        .filter((w: string) => w.length >= 4 && !['DE', 'DEL', 'LOS', 'LAS', 'SAN', 'SANTA', 'MARIA', 'JOSE'].includes(w));
                    if (palabrasNombre.length === 0) continue;
                    const montoTicket = parseFloat(ticket.monto.toString());

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;

                        const movRawText = `${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''}`.toUpperCase();
                        const palabrasCoincidentes = palabrasNombre.filter((p: string) => movRawText.includes(p));

                        if (movRawText.includes(nombreCompleto) || palabrasCoincidentes.length >= 2) {
                            registrarMatch(ticket, mov, 'NOMBRE_CLIENTE', `Nombre "${palabrasCoincidentes.join(' ')}" detectado en banco`);
                            break;
                        }
                    }
                }

                // --- TIER 5: Folio o Referencia del Ticket (filtrando números genéricos) ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const rawRef = (ticket.referencia || '').trim().toUpperCase();
                    const normRef = normalizar(rawRef);
                    const rawFolio = (ticket.folio || '').trim().toUpperCase();
                    const normFolio = normalizar(rawFolio);

                    const refValida = normRef && normRef.length >= 6 && !REFERENCIAS_GENERICAS.has(normRef);
                    const folioValido = normFolio && normFolio.length >= 6 && !REFERENCIAS_GENERICAS.has(normFolio);
                    if (!refValida && !folioValido) continue;

                    const montoTicket = parseFloat(ticket.monto.toString());

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;

                        const movRawText = `${mov.referencia || ''} ${mov.concepto || ''} ${mov.descripcionDetallada || ''}`.toUpperCase();
                        const movNormText = normalizar(movRawText);

                        if ((refValida && movNormText.includes(normRef)) || (folioValido && movNormText.includes(normFolio))) {
                            registrarMatch(ticket, mov, 'FOLIO_REFERENCIA', `Folio/Referencia coincidente (${rawFolio || rawRef})`);
                            break;
                        }
                    }
                }

                // --- TIER 6: Monto Exacto + Fecha Cercana (<= 3 días) ---
                for (const ticket of ticketsPendientes) {
                    if (matchedTicketIds.has(ticket.id)) continue;
                    const montoTicket = parseFloat(ticket.monto.toString());
                    const fechaTktDate = ticket.fecha || ticket.creadoEn;
                    if (!fechaTktDate) continue;
                    const fechaTkt = new Date(fechaTktDate).getTime();

                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;
                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) >= 0.01) continue;
                        if (!mov.fechaOperacion) continue;

                        const fechaMov = new Date(mov.fechaOperacion).getTime();
                        const diffDias = Math.abs(fechaMov - fechaTkt) / (1000 * 60 * 60 * 24);

                        if (diffDias <= 3) {
                            const fStr = new Date(mov.fechaOperacion).toISOString().slice(0, 10);
                            registrarMatch(ticket, mov, 'MONTO_FECHA', `Monto exacto ($${montoTicket.toFixed(2)}) y fecha cercana (${fStr})`);
                            break;
                        }
                    }
                }
            }

            for (const { ticket, matchMov, tipoMatch, razonMatch } of matchedPairs) {
                const montoTicket = parseFloat(ticket.monto.toString());
                if (matchMov) {
                    usadosMovIds.add(`${matchMov.tabla}__${matchMov.id}`);

                    const matchItem = {
                        matchKey: `${ticket.id}__${matchMov.tabla}__${matchMov.id}`,
                        ticketId: ticket.id,
                        movimientoId: matchMov.id,
                        tabla: matchMov.tabla,
                        banco: matchMov.banco,
                        cuentaDestino: matchMov.cuentaDestino,
                        razon: razonMatch,
                        tipoMatch: tipoMatch,
                        ticket: {
                            id: ticket.id,
                            contrato: ticket.cliente?.codigoCliente || 'N/A',
                            nombre: ticket.cliente?.nombreCompleto || 'Desconocido',
                            monto: parseFloat(ticket.monto.toString()),
                            fecha: ticket.fecha || ticket.creadoEn,
                            claveRastreo: ticket.claveRastreo || ticket.referencia || ticket.folio,
                            folio: ticket.folio,
                            referencia: ticket.referencia,
                            tienePago: ticket.pagos && ticket.pagos.length > 0
                        },
                        movimiento: {
                            id: matchMov.id,
                            tabla: matchMov.tabla,
                            banco: matchMov.banco,
                            cuentaDestino: matchMov.cuentaDestino,
                            abono: parseFloat(matchMov.abono.toString()),
                            saldo: matchMov.saldo ? parseFloat(matchMov.saldo.toString()) : null,
                            fechaOperacion: matchMov.fechaOperacion,
                            horaOperacion: matchMov.horaOperacion,
                            concepto: matchMov.concepto || matchMov.descripcionGeneral || matchMov.descripcionDetallada,
                            descripcionGeneral: matchMov.descripcionGeneral,
                            descripcionDetallada: matchMov.descripcionDetallada,
                            referencia: matchMov.referencia,
                            claveRastreo: matchMov.claveRastreo,
                            cuentaEmisor: matchMov.cuentaEmisor || matchMov.clabeEmisor
                        }
                    };

                    matches.push(matchItem);

                    // Si no es previsualización, ejecutar la conciliación inmediatamente
                    if (!isPreview) {
                        const movAbono = parseFloat(matchMov.abono?.toString() || '0');
                        if (Math.abs(montoTicket - movAbono) > 0.01) {
                            console.error(`[AUDITORIA ERROR] Intento de conciliación con montos distintos bloqueado: Ticket ${ticket.id} ($${montoTicket}) vs Movimiento ($${movAbono})`);
                            continue;
                        }

                        const operations: any[] = [
                            prisma.ticket.update({
                                where: { id: ticket.id },
                                data: { conciliado: true }
                            })
                        ];

                        const updateMovData: any = {
                            ticketId: ticket.id,
                            clienteId: ticket.clienteId || null,
                            fechaIdentificado: new Date()
                        };

                        if (matchMov.tabla === 'movimientoSantander22001022837') {
                            operations.push(prisma.movimientoSantander22001022837.update({
                                where: { id: matchMov.id },
                                data: updateMovData
                            }));
                        } else if (matchMov.tabla === 'movimientoSantander65505732541') {
                            operations.push(prisma.movimientoSantander65505732541.update({
                                where: { id: matchMov.id },
                                data: updateMovData
                            }));
                        } else if (matchMov.tabla === 'movimientoBanorte0330253963') {
                            operations.push(prisma.movimientoBanorte0330253963.update({
                                where: { id: matchMov.id },
                                data: updateMovData
                            }));
                        }

                        if ((!ticket.pagos || ticket.pagos.length === 0) && ticket.clienteId && ticket.cliente) {
                            const saldoAnterior = parseFloat(ticket.cliente.saldoActual.toString());
                            const montoPago = parseFloat(ticket.monto.toString());
                            const saldoNuevo = Math.max(0, saldoAnterior - montoPago);

                            const userId = (session.user as any)?.id;
                            const cobradorId = userId || ticket.cliente.cobradorAsignadoId || 'system';
                            const fechaPagoFinal = parseValidDate(ticket.fecha || matchMov.fechaOperacion);

                            operations.push(prisma.pago.create({
                                data: {
                                    clienteId: ticket.cliente.id,
                                    cobradorId: cobradorId,
                                    ticketId: ticket.id,
                                    monto: montoPago,
                                    concepto: ticket.concepto || `TKT: ${ticket.id} / Auto Conciliación SPEI`,
                                    tipoPago: 'regular',
                                    fechaPago: fechaPagoFinal,
                                    metodoPago: 'SPEI AUTO CONCILIADO',
                                    saldoAnterior,
                                    saldoNuevo,
                                    sincronizado: true,
                                    banco: matchMov.banco
                                }
                            }));

                            operations.push(prisma.cliente.update({
                                where: { id: ticket.cliente.id },
                                data: { saldoActual: saldoNuevo }
                            }));
                        } else if (ticket.pagos && ticket.pagos.length > 0) {
                            operations.push(prisma.pago.updateMany({
                                where: { ticketId: ticket.id },
                                data: {
                                    concepto: `TKT: ${ticket.id} / CONCILIADO`,
                                    banco: matchMov.banco,
                                    sincronizado: true
                                }
                            }));
                        }

                        await prisma.$transaction(operations);

                        // Guardar/Actualizar la cuenta y titular/remitente habitual del cliente
                        if (ticket.clienteId) {
                            const datosOrdenante = extractDatosOrdenante(matchMov, ticket);
                            await guardarCuentaCliente(prisma, ticket.clienteId, datosOrdenante);
                        }

                        conciliados.push({
                            ticketId: ticket.id,
                            contrato: ticket.cliente?.codigoCliente || 'N/A',
                            nombre: ticket.cliente?.nombreCompleto || 'Desconocido',
                            monto: ticket.monto,
                            claveRastreo: ticket.claveRastreo || ticket.referencia || ticket.folio,
                            banco: matchMov.banco,
                            cuentaDestino: matchMov.cuentaDestino,
                            movimientoId: matchMov.id,
                            conceptoBancario: matchMov.concepto || matchMov.descripcionGeneral
                        });
                    }
                }
            }

            // Si era preview, retornar coincidencias detectadas para que el usuario las apruebe/rechace
            if (isPreview) {
                return NextResponse.json({
                    success: true,
                    isPreview: true,
                    totalRevisados: ticketsPendientes.length,
                    matchesCount: matches.length,
                    matches
                });
            }

            return NextResponse.json({
                success: true,
                message: conciliados.length > 0 
                    ? `¡${conciliados.length} ticket(s) conciliado(s) exitosamente mediante SPEI!`
                    : 'No se encontraron tickets pendientes con clave de rastreo SPEI coincidentes.',
                totalRevisados: ticketsPendientes.length,
                conciliadosCount: conciliados.length,
                conciliados
            });
        }

        const ticket: any = await prisma.ticket.findUnique({ 
            where: { id: ticketId },
            include: { cliente: true, pagos: true }
        });

        let movimiento: any = null;
        let tablaOrigen = tabla;

        if (tablaOrigen === 'movimientoSantander22001022837') {
            movimiento = await prisma.movimientoSantander22001022837.findUnique({ where: { id: movimientoId } });
        } else if (tablaOrigen === 'movimientoSantander65505732541') {
            movimiento = await prisma.movimientoSantander65505732541.findUnique({ where: { id: movimientoId } });
        } else if (tablaOrigen === 'movimientoBanorte0330253963') {
            movimiento = await prisma.movimientoBanorte0330253963.findUnique({ where: { id: movimientoId } });
        } else {
            // Búsqueda fallback en las 3 tablas
            movimiento = await prisma.movimientoSantander22001022837.findUnique({ where: { id: movimientoId } });
            if (movimiento) {
                tablaOrigen = 'movimientoSantander22001022837';
            } else {
                movimiento = await prisma.movimientoSantander65505732541.findUnique({ where: { id: movimientoId } });
                if (movimiento) {
                    tablaOrigen = 'movimientoSantander65505732541';
                } else {
                    movimiento = await prisma.movimientoBanorte0330253963.findUnique({ where: { id: movimientoId } });
                    if (movimiento) {
                        tablaOrigen = 'movimientoBanorte0330253963';
                    }
                }
            }
        }

        if (!ticket || !movimiento) return NextResponse.json({ error: 'Datos no encontrados' }, { status: 404 });

        // 🛡️ Regla estricta de auditoría: El abono bancario debe coincidir exactamente con el monto del ticket
        const movAbono = parseFloat(movimiento.abono?.toString() || '0');
        const ticketMonto = parseFloat(ticket.monto?.toString() || '0');
        if (Math.abs(movAbono - ticketMonto) > 0.01) {
            return NextResponse.json({
                error: `No se puede conciliar: El depósito bancario ($${movAbono.toFixed(2)}) no coincide con el ticket ($${ticketMonto.toFixed(2)}). Los montos deben ser exactamente iguales.`
            }, { status: 400 });
        }

        // Intentar extraer CLABE/Cuenta del movimiento para el "Catálogo Inteligente"
        const dataPool = `${movimiento.concepto || ''} ${movimiento.descripcionDetallada || ''} ${movimiento.descripcionGeneral || ''}`.toUpperCase();
        const clabeMatch = dataPool.match(/\d{18}/);
        const cuentaMatch = dataPool.match(/\d{10,11}/);

        const updateMovimientoData: any = {
            ticketId: ticketId, 
            clienteId: ticket.clienteId,
            fechaIdentificado: new Date(),
            clabeEmisor: clabeMatch ? clabeMatch[0] : (movimiento.clabeEmisor || null),
            cuentaEmisor: cuentaMatch ? cuentaMatch[0] : (movimiento.cuentaEmisor || null)
        };

        const operations: any[] = [
            prisma.ticket.update({
                where: { id: ticketId },
                data: { conciliado: true }
            })
        ];

        // Si el ticket no tenía un pago previamente registrado, se inserta el pago y se actualiza el saldo del cliente
        if ((!ticket.pagos || ticket.pagos.length === 0) && ticket.clienteId && ticket.cliente) {
            const saldoAnterior = parseFloat(ticket.cliente.saldoActual.toString());
            const montoPago = parseFloat(ticket.monto.toString());
            const saldoNuevo = Math.max(0, saldoAnterior - montoPago);

            const userId = (session.user as any)?.id;
            const cobradorId = userId || ticket.cliente.cobradorAsignadoId || 'system';

            const fechaPagoFinal = parseValidDate(ticket.fecha || movimiento.fechaOperacion);

            operations.push(prisma.pago.create({
                data: {
                    clienteId: ticket.cliente.id,
                    cobradorId: cobradorId,
                    ticketId: ticket.id,
                    monto: montoPago,
                    concepto: ticket.concepto || `TKT: ${ticket.id} / Conciliación Bancaria`,
                    tipoPago: 'regular',
                    fechaPago: fechaPagoFinal,
                    metodoPago: 'TESORERIA CONCILIADOR',
                    saldoAnterior,
                    saldoNuevo,
                    sincronizado: true,
                    banco: movimiento.bancoOrigen || 'CONCILIACION'
                }
            }));

            operations.push(prisma.cliente.update({
                where: { id: ticket.cliente.id },
                data: { saldoActual: saldoNuevo }
            }));
        } else if (ticket.pagos && ticket.pagos.length > 0) {
            operations.push(prisma.pago.updateMany({
                where: { ticketId: ticket.id },
                data: {
                    concepto: `TKT: ${ticket.id} / CONCILIADO`,
                    banco: movimiento.bancoOrigen || 'CONCILIACION',
                    sincronizado: true
                }
            }));
        }

        if (tablaOrigen === 'movimientoSantander22001022837') {
            operations.push(prisma.movimientoSantander22001022837.update({
                where: { id: movimientoId },
                data: updateMovimientoData
            }));
        } else if (tablaOrigen === 'movimientoSantander65505732541') {
            operations.push(prisma.movimientoSantander65505732541.update({
                where: { id: movimientoId },
                data: updateMovimientoData
            }));
        } else if (tablaOrigen === 'movimientoBanorte0330253963') {
            operations.push(prisma.movimientoBanorte0330253963.update({
                where: { id: movimientoId },
                data: updateMovimientoData
            }));
        }

        await prisma.$transaction(operations);

        // Guardar/Actualizar la cuenta y titular/remitente habitual del cliente
        if (ticket.clienteId) {
            const datosOrdenante = extractDatosOrdenante(movimiento, ticket);
            await guardarCuentaCliente(prisma, ticket.clienteId, datosOrdenante);
        }

        return NextResponse.json({ success: true, message: 'Conciliación y aprendizaje exitosos' });
    } catch (error) {
        console.error('Error al conciliar:', error);
        return NextResponse.json({ error: 'Error al forzar conciliación' }, { status: 500 });
    }
}
