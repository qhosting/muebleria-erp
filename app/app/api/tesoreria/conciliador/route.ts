import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseValidDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const desde = searchParams.get('desde');
        const hasta = searchParams.get('hasta');

        // Filtro de fechas para tickets
        const ticketWhere: any = { conciliado: false };
        const movWhere: any = { ticketId: null, abono: { gt: 0 } };

        if (desde && hasta) {
            const dStart = new Date(`${desde}T00:00:00.000Z`);
            const dEnd = new Date(`${hasta}T23:59:59.999Z`);

            ticketWhere.OR = [
                { fecha: { gte: dStart, lte: dEnd } },
                { creadoEn: { gte: dStart, lte: dEnd } }
            ];

            movWhere.fechaOperacion = { gte: dStart, lte: dEnd };
        }

        // 1. Obtener Tickets no conciliados
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
            orderBy: { creadoEn: 'desc' },
            take: 200
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
                
                // Prioridad 1: Clave de Rastreo SPEI exacta
                if (rastreoTicket && rastreoTicket.length > 5 && dataPool.includes(rastreoTicket)) {
                    bestMatch = mov;
                    bestPriority = 1;
                    razon = `Coincidencia exacta por Clave de Rastreo (${rastreoTicket})`;
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

        return NextResponse.json({
            tickets: ticketsPendientes,
            movimientos: movimientosPendientes,
            sugerencias,
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

        const body = await request.json();
        const { ticketId, movimientoId, tabla, action } = body;

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

        // Si detectamos una nueva CLABE para este cliente, la guardamos/actualizamos
        if (ticket.clienteId && (clabeMatch || cuentaMatch)) {
            const clabe = clabeMatch ? clabeMatch[0] : null;
            if (clabe) {
                operations.push((prisma as any).cuentaBancariaCliente.upsert({
                    where: { clabe: clabe },
                    update: { 
                        clienteId: ticket.clienteId, 
                        nombreTitular: ticket.cliente?.nombreCompleto 
                    },
                    create: {
                        clabe: clabe,
                        clienteId: ticket.clienteId,
                        nombreTitular: ticket.cliente?.nombreCompleto,
                        banco: movimiento.bancoOrigen
                    }
                }));
            }
        }

        await prisma.$transaction(operations);

        return NextResponse.json({ success: true, message: 'Conciliación y aprendizaje exitosos' });
    } catch (error) {
        console.error('Error al conciliar:', error);
        return NextResponse.json({ error: 'Error al forzar conciliación' }, { status: 500 });
    }
}
