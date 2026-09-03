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
        const estado = (searchParams.get('estado') || 'PENDIENTE').toUpperCase();

        // Filtro de estado de conciliación
        const ticketWhere: any = {};
        const movWhere: any = { abono: { gt: 0 } };

        if (estado === 'PENDIENTE') {
            ticketWhere.conciliado = false;
            movWhere.ticketId = null;
        } else if (estado === 'CONCILIADO') {
            ticketWhere.conciliado = true;
            movWhere.ticketId = { not: null };
        } // Si es TODOS no agregamos restricción en conciliado / ticketId

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
                        metodoPago: { in: ['TESORERIA CONCILIADOR', 'SPEI AUTO CONCILIADO'] }
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
            }

            await prisma.$transaction(operations);

            return NextResponse.json({
                success: true,
                message: `Movimiento bancario desconciliado exitosamente${targetTicketId ? ` del ticket #${targetTicketId}` : ''}`
            });
        }

        // --- ACCIÓN: PREVISUALIZAR O AUTO-CONCILIAR SPEI (CLAVE DE RASTREO) ---
        if (action === 'preview_spei' || action === 'auto_spei' || action === 'confirm_spei' || action === 'conciliar_spei') {
            const isPreview = action === 'preview_spei';
            const approvedMatches = Array.isArray(body.matches) ? body.matches : null;

            // 1. Obtener tickets pendientes
            let ticketsPendientes = await prisma.ticket.findMany({
                where: {
                    conciliado: false,
                    OR: [
                        { claveRastreo: { not: null } },
                        { referencia: { not: null } },
                        { folio: { not: null } }
                    ]
                },
                include: { 
                    cliente: {
                        select: {
                            id: true,
                            codigoCliente: true,
                            nombreCompleto: true,
                            saldoActual: true,
                            cobradorAsignadoId: true
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

            for (const ticket of ticketsPendientes) {
                const montoTicket = parseFloat(ticket.monto.toString());
                const rawRastreo = (ticket.claveRastreo || '').trim().toUpperCase();
                const normRastreo = normalizar(rawRastreo);
                
                const contrato = (ticket.cliente?.codigoCliente || '').trim().toUpperCase();
                const normContrato = normalizar(contrato);

                const nombreCompleto = (ticket.cliente?.nombreCompleto || '').trim().toUpperCase();
                const palabrasNombre = nombreCompleto
                    .split(/\s+/)
                    .filter(w => w.length >= 4 && !['DE', 'DEL', 'LOS', 'LAS', 'SAN', 'SANTA', 'MARIA', 'JOSE'].includes(w));

                const rawRef = (ticket.referencia || '').trim().toUpperCase();
                const normRef = normalizar(rawRef);

                const rawFolio = (ticket.folio || '').trim().toUpperCase();
                const normFolio = normalizar(rawFolio);

                let matchMov: any = null;
                let razonMatch = '';
                let tipoMatch = 'SUGERENCIA';
                let scoreMatch = 999; // Menor es más prioritario

                // Si viene confirm_spei con un movimiento específico aprobado
                const specificApproved = approvedMatches?.find((m: any) => m.ticketId === ticket.id);

                if (specificApproved) {
                    matchMov = movimientosPool.find(m => m.tabla === specificApproved.tabla && String(m.id) === String(specificApproved.movimientoId));
                    if (matchMov) {
                        razonMatch = 'Aprobado por el usuario';
                        tipoMatch = 'APROBADO';
                        scoreMatch = 0;
                    }
                } else {
                    for (const mov of movimientosPool) {
                        const movKey = `${mov.tabla}__${mov.id}`;
                        if (usadosMovIds.has(movKey)) continue;

                        const movAbono = parseFloat(mov.abono?.toString() || '0');
                        const isMontoExact = Math.abs(montoTicket - movAbono) < 0.01;

                        const movClaveRastreo = (mov.claveRastreo || '').trim().toUpperCase();
                        const movRawText = `${mov.claveRastreo || ''} ${mov.concepto || ''} ${mov.descripcionDetallada || ''} ${mov.descripcionGeneral || ''} ${mov.referencia || ''} ${mov.cuentaEmisor || ''}`.toUpperCase();
                        const movNormText = normalizar(movRawText);

                        // 1. PRIORIDAD 1: Clave de Rastreo SPEI Exacta
                        if (normRastreo && normRastreo.length >= 6) {
                            const isSpeiMatch = 
                                (movClaveRastreo && (movClaveRastreo === rawRastreo || normalizar(movClaveRastreo) === normRastreo)) ||
                                movRawText.includes(rawRastreo) ||
                                movNormText.includes(normRastreo);

                            if (isSpeiMatch) {
                                matchMov = mov;
                                razonMatch = `Clave SPEI exacta: ${rawRastreo}`;
                                tipoMatch = 'SPEI_EXACTO';
                                scoreMatch = 1;
                                break; // SPEI exacto es match definitivo
                            }
                        }

                        // 2. PRIORIDAD 2: Código de Cliente / Contrato DP o DQ en banco
                        if (normContrato && normContrato.length >= 6 && scoreMatch > 2) {
                            const isContratoMatch = movRawText.includes(contrato) || movNormText.includes(normContrato);
                            if (isContratoMatch) {
                                matchMov = mov;
                                razonMatch = `Contrato ${contrato} detectado en la leyenda bancaria${isMontoExact ? ' (Monto exacto)' : ''}`;
                                tipoMatch = 'CONTRATO_DP_DQ';
                                scoreMatch = isMontoExact ? 2 : 2.5;
                                if (isMontoExact) break;
                            }
                        }

                        // 3. PRIORIDAD 3: Nombre del Cliente en concepto bancario
                        if (isMontoExact && palabrasNombre.length > 0 && scoreMatch > 3) {
                            // Coincidencia con nombre completo o al menos 2 palabras clave del cliente
                            const palabrasCoincidentes = palabrasNombre.filter(p => movRawText.includes(p));
                            if (movRawText.includes(nombreCompleto) || palabrasCoincidentes.length >= 2) {
                                matchMov = mov;
                                razonMatch = `Nombre "${palabrasCoincidentes.join(' ')}" detectado en banco con monto exacto`;
                                tipoMatch = 'NOMBRE_CLIENTE';
                                scoreMatch = 3;
                                continue;
                            }
                        }

                        // 4. PRIORIDAD 4: Folio o Referencia del Ticket
                        if (isMontoExact && scoreMatch > 4) {
                            if ((normFolio && normFolio.length >= 6 && movNormText.includes(normFolio)) ||
                                (normRef && normRef.length >= 6 && movNormText.includes(normRef))) {
                                matchMov = mov;
                                razonMatch = `Folio/Referencia (${rawFolio || rawRef}) encontrado en banco con monto exacto`;
                                tipoMatch = 'FOLIO_REFERENCIA';
                                scoreMatch = 4;
                                continue;
                            }
                        }

                        // 5. PRIORIDAD 5: Mismo monto exacto y fecha cercana (±48 horas)
                        if (isMontoExact && scoreMatch > 5) {
                            const ticketDate = ticket.fecha || ticket.creadoEn;
                            if (ticketDate && mov.fechaOperacion) {
                                const tDate = new Date(ticketDate);
                                const mDate = new Date(mov.fechaOperacion);
                                const diffHours = Math.abs(tDate.getTime() - mDate.getTime()) / (1000 * 60 * 60);
                                if (diffHours <= 48) {
                                    matchMov = mov;
                                    razonMatch = `Monto exacto ($${montoTicket.toFixed(2)}) y fecha cercana (${tDate.toISOString().slice(0, 10)})`;
                                    tipoMatch = 'MONTO_FECHA';
                                    scoreMatch = 5;
                                    continue;
                                }
                            }
                        }
                    }
                }

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
                            fechaOperacion: matchMov.fechaOperacion,
                            horaOperacion: matchMov.horaOperacion,
                            concepto: matchMov.concepto || matchMov.descripcionGeneral || matchMov.descripcionDetallada,
                            claveRastreo: matchMov.claveRastreo
                        }
                    };

                    matches.push(matchItem);

                    // Si no es previsualización, ejecutar la conciliación inmediatamente
                    if (!isPreview) {
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
                                data: { banco: matchMov.banco, sincronizado: true }
                            }));
                        }

                        await prisma.$transaction(operations);

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
