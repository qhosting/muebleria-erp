import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { parseValidDate } from "@/lib/utils";

export async function GET(req: Request) {
    return NextResponse.json({ 
        error: "Method Not Allowed",
        message: "El webhook de n8n funciona mediante solicitudes POST. Si ves este mensaje en n8n, asegúrate de que el método en el nodo HTTP Request esté configurado como POST y de que la URL comience exactamente con 'https://' (con 's') y no termine con una diagonal '/' al final."
    }, { status: 405 });
}

/**
 * Webhook para recibir datos de tickets procesados por n8n (WhatsApp / IA)
 */
export async function POST(req: Request) {
    try {
        // 1. Validar Token de Seguridad (Opcional pero recomendado)
        // const authHeader = req.headers.get("authorization");
        // if (authHeader !== `Bearer ${process.env.N8N_WEBHOOK_SECRET}`) {
        //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        // }

        const body = await req.json();
        let action = body.action;
        let contrato = body.contrato || body.codigoCliente || body.cliente || body.contractId || body.metadata?.contrato;
        let monto = body.monto || body.montoTotal || body.amount || body.metadata?.monto;
        let referencia = body.referencia || body.ref || body.concept || body.metadata?.referencia;
        let folio = body.folio || body.ticketIdOrigen || body.idpag || body.legacyId || body.metadata?.folio;
        let legacyIdNum = parseInt(body.idpag || body.legacyId || body.ticketIdOrigen || '0') || null;
        let fecha = body.fecha || body.date || body.metadata?.fecha;
        let hr = body.hr || body.hora || body.time || body.metadata?.hr;
        let claverastreo = body.claverastreo || body.claveRastreo || body.clave_rastreo || body.trackingKey || body.metadata?.claverastreo;
        let remitente = body.remitente || body.telefono || body.phone || body.sender || body.metadata?.remitente;
        let base64Data = body.base64Data || body.base64 || body.image || body.metadata?.base64Data;
        let tipoArchivo = body.tipoArchivo || body.mimeType || body.metadata?.tipoArchivo;

        // Limpieza defensiva de posibles signos '=', '$', comas o espacios extras de las expresiones de n8n
        if (typeof contrato === "string") contrato = contrato.replace(/^=/, "").trim();
        if (typeof monto === "string") monto = monto.replace(/[\$=,]/g, "").trim();
        if (typeof referencia === "string") referencia = referencia.replace(/^=/, "").trim();
        if (typeof folio === "string") folio = folio.replace(/^=/, "").trim();
        if (typeof claverastreo === "string") claverastreo = claverastreo.replace(/^=/, "").trim();
        if (typeof remitente === "string") remitente = remitente.replace(/^=/, "").trim();
        if (typeof fecha === "string") fecha = fecha.replace(/^=/, "").trim();
        if (typeof hr === "string") hr = hr.replace(/^=/, "").trim();

        // --- ACCIÓN: INSPECCIONAR Y RECUPERAR TICKETS DE CLIENTE / BUZÓN ---
        if (action === "inspeccionar_cliente_tickets" || action === "diagnostico_cliente") {
            const codTarget = (body.contrato || body.codigoCliente || 'DQ2510106').trim().toUpperCase();
            const telTarget = (body.telefono || body.phone || '7208702915').replace(/\D/g, '').slice(-10);

            const [cliente, tickets, buzon, pendientes] = await Promise.all([
                prisma.cliente.findFirst({
                    where: {
                        OR: [
                            { codigoCliente: { equals: codTarget, mode: 'insensitive' } },
                            { telefono: { contains: telTarget } }
                        ]
                    },
                    include: { cobradorAsignado: true }
                }),
                prisma.ticket.findMany({
                    where: {
                        OR: [
                            { cliente: { codigoCliente: { equals: codTarget, mode: 'insensitive' } } },
                            { remitente: { contains: telTarget } }
                        ]
                    },
                    orderBy: { creadoEn: 'desc' }
                }),
                prisma.buzonTesoreria.findMany({
                    where: {
                        OR: [
                            { contractId: { equals: codTarget, mode: 'insensitive' } },
                            { telefono: { contains: telTarget } }
                        ]
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.ticketPendiente.findMany({
                    where: { remitente: { contains: telTarget } }
                })
            ]);

            // Si se solicita procesar de inmediato el buzón pendiente
            let procesadoResult: any = null;
            if (body.procesar === true && buzon.length > 0 && cliente) {
                const b = buzon[0];
                const meta: any = b.metadata || {};
                const montoVal = parseFloat(b.monto?.toString() || meta.monto || '0') || 0;
                const refVal = b.referencia || meta.referencia || null;
                const folioVal = meta.folio || null;
                const rastreoVal = meta.claverastreo || null;
                const fechaVal = meta.fecha ? new Date(meta.fecha) : new Date();

                // Crear Ticket y Pago
                const defaultUser = await prisma.user.findFirst({ where: { role: 'cobrador' } });
                const cobradorId: string = cliente.cobradorAsignadoId || cliente.cobradorAsignado?.id || defaultUser?.id || cliente.id;
                
                procesadoResult = await prisma.$transaction(async (tx) => {
                    const ticketNuevo = await tx.ticket.create({
                        data: {
                            clienteId: cliente.id,
                            gestorId: cobradorId,
                            monto: montoVal,
                            referencia: refVal,
                            folio: folioVal,
                            claveRastreo: rastreoVal,
                            fecha: fechaVal,
                            remitente: b.telefono || telTarget,
                            concepto: 'WHATSAPP_BUZON',
                            conciliado: false
                        }
                    });

                    const saldoAnterior = parseFloat(cliente.saldoActual.toString());
                    const saldoNuevo = Math.max(0, saldoAnterior - montoVal);

                    const pagoNuevo = await tx.pago.create({
                        data: {
                            clienteId: cliente.id,
                            cobradorId: cobradorId,
                            monto: montoVal,
                            saldoAnterior: saldoAnterior,
                            saldoNuevo: saldoNuevo,
                            metodoPago: 'BANCOS BOT',
                            numeroRecibo: `REC-BOT-${Date.now()}`,
                            fechaPago: new Date(),
                            ticketImpreso: true,
                            concepto: 'WHATSAPP_BUZON'
                        }
                    });

                    await tx.cliente.update({
                        where: { id: cliente.id },
                        data: {
                            saldoActual: saldoNuevo,
                            updatedAt: new Date()
                        }
                    });

                    await tx.buzonTesoreria.update({
                        where: { id: b.id },
                        data: {
                            estado: 'PROCESADO',
                            updatedAt: new Date()
                        }
                    });

                    return {
                        ticketId: ticketNuevo.id,
                        pagoId: pagoNuevo.id,
                        saldoAnterior,
                        saldoNuevo
                    };
                });
            }

            return NextResponse.json({
                cliente,
                ticketsCount: tickets.length,
                tickets,
                buzonCount: buzon.length,
                buzon,
                pendientesWhatsapp: pendientes,
                procesadoResult
            });
        }


        // --- ACCIÓN: BUSCAR CLIENTE POR TELÉFONO O CONTRATO (MUEBLERIA-ERP) ---
        if (action === "buscar_cliente") {
            const telRaw = (body.telefono || body.phone || remitente || '').replace(/\D/g, '');
            const cod = (body.contrato || body.codigoCliente || contrato || '').trim().toUpperCase();
            
            let cliente: any = null;
            if (cod) {
                cliente = await prisma.cliente.findFirst({
                    where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
                    include: { cobradorAsignado: true }
                });
            }
            if (!cliente && telRaw && telRaw.length >= 10) {
                const tel10 = telRaw.slice(-10);
                cliente = await prisma.cliente.findFirst({
                    where: {
                        OR: [
                            { telefono: { contains: tel10 } },
                            { telefonoTrabajo: { contains: tel10 } },
                            { telefono: { contains: telRaw } }
                        ]
                    },
                    include: { cobradorAsignado: true }
                });
            }

            if (cliente) {
                return NextResponse.json({
                    encontrado: true,
                    cod_cliente: cliente.codigoCliente,
                    codigoCliente: cliente.codigoCliente,
                    contrato: cliente.codigoCliente,
                    cliente: {
                        id: cliente.id,
                        codigoCliente: cliente.codigoCliente,
                        nombreCompleto: cliente.nombreCompleto,
                        telefono: cliente.telefono,
                        saldoActual: parseFloat(cliente.saldoActual.toString()),
                        cobrador: cliente.cobradorAsignado ? {
                            id: cliente.cobradorAsignado.id,
                            name: cliente.cobradorAsignado.name,
                            codigoGestor: cliente.cobradorAsignado.codigoGestor
                        } : null
                    }
                });
            }

            return NextResponse.json({
                encontrado: false,
                cod_cliente: null,
                mensaje: "Cliente no encontrado en muebleria-erp"
            });
        }

        // --- ACCIÓN: ACTUALIZAR FECHA / HORA DE TICKET ---
        if (action === "actualizar_fecha_ticket") {
            const ticketId = body.ticketId || body.id;
            const nuevaFechaStr = body.fecha; // Ej. "2026-08-29"
            const nuevaHoraStr = body.hr || body.hora; // Ej. "15:22:48"

            if (!ticketId || !nuevaFechaStr) {
                return NextResponse.json({ error: "ticketId y fecha son requeridos" }, { status: 400 });
            }

            const parsedDate = parseValidDate(nuevaFechaStr, nuevaHoraStr);

            const ticket = await prisma.ticket.update({
                where: { id: ticketId },
                data: {
                    fecha: parsedDate
                }
            });

            // Actualizar pagos asociados
            await prisma.pago.updateMany({
                where: { ticketId: ticketId },
                data: {
                    fechaPago: parsedDate
                }
            });

            return NextResponse.json({
                success: true,
                message: `Ticket ${ticketId} y sus pagos actualizados a fecha ${nuevaFechaStr} ${nuevaHoraStr || ''}`,
                ticket
            });
        }

        // --- ACCIÓN: ACTUALIZAR MONTO DE TICKET ---
        if (action === "actualizar_monto_ticket") {
            const ticketId = body.ticketId || body.id;
            const nuevoMontoNum = parseFloat(body.monto || body.nuevoMonto || monto || '0');

            if (!ticketId || isNaN(nuevoMontoNum) || nuevoMontoNum <= 0) {
                return NextResponse.json({ error: "ticketId y monto válido son requeridos" }, { status: 400 });
            }

            const ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
                include: { cliente: true, pagos: true }
            });

            if (!ticket) {
                return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
            }

            const montoAnterior = parseFloat(ticket.monto.toString());
            const diff = nuevoMontoNum - montoAnterior;

            const operations: any[] = [
                prisma.ticket.update({
                    where: { id: ticketId },
                    data: { monto: nuevoMontoNum }
                })
            ];

            // Si hay pagos vinculados, actualizar su monto y ajustar saldos
            if (ticket.pagos && ticket.pagos.length > 0) {
                for (const pago of ticket.pagos) {
                    const saldoAnt = parseFloat(pago.saldoAnterior.toString());
                    const saldoNvo = Math.max(0, saldoAnt - nuevoMontoNum);
                    operations.push(
                        prisma.pago.update({
                            where: { id: pago.id },
                            data: {
                                monto: nuevoMontoNum,
                                saldoNuevo: saldoNvo
                            }
                        })
                    );
                }
            }

            // Si el cliente existe, descontar la diferencia del saldo actual
            if (ticket.cliente) {
                const clienteSaldoActual = parseFloat(ticket.cliente.saldoActual.toString());
                const nuevoSaldoCliente = Math.max(0, clienteSaldoActual - diff);
                operations.push(
                    prisma.cliente.update({
                        where: { id: ticket.cliente.id },
                        data: { saldoActual: nuevoSaldoCliente }
                    })
                );
            }

            await prisma.$transaction(operations);

            return NextResponse.json({
                success: true,
                message: `Ticket ${ticketId} actualizado de $${montoAnterior.toFixed(2)} a $${nuevoMontoNum.toFixed(2)} correctamente`,
                montoAnterior,
                nuevoMonto: nuevoMontoNum,
                diferenciaAjustada: diff
            });
        }

        // --- ACCIÓN: LISTAR PAGOS Y TICKETS DE CLIENTE ---
        if (action === "listar_pagos_cliente") {
            const cod = (body.contrato || body.codigoCliente || contrato || '').trim().toUpperCase();
            const cliente = await prisma.cliente.findFirst({
                where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
                include: {
                    pagos: {
                        orderBy: { fechaPago: 'desc' }
                    },
                    tickets: {
                        orderBy: { fecha: 'desc' }
                    }
                }
            });

            return NextResponse.json({
                cliente: cliente ? {
                    id: cliente.id,
                    codigoCliente: cliente.codigoCliente,
                    nombre: cliente.nombreCompleto,
                    saldoActual: parseFloat(cliente.saldoActual.toString())
                } : null,
                pagos: cliente?.pagos || [],
                tickets: cliente?.tickets || []
            });
        }

        // --- ACCIÓN: INSERTAR PAGO DIRECTO ---
        if (action === "insertar_pago_directo") {
            const cod = (body.contrato || body.codigoCliente || contrato || '').trim().toUpperCase();
            const cliente = await prisma.cliente.findFirst({
                where: { codigoCliente: { equals: cod, mode: 'insensitive' } },
                include: { cobradorAsignado: true }
            });

            if (!cliente) {
                return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
            }

            const montoNum = parseFloat(monto || '0');
            const fechaParsed = parseValidDate(fecha, hr);
            const shortTicketId = Math.random().toString(36).substring(2, 10).toUpperCase();
            const saldoAnterior = parseFloat(cliente.saldoActual.toString());
            const saldoNuevo = Math.max(0, saldoAnterior - montoNum);

            let cobradorId = cliente.cobradorAsignadoId;
            if (!cobradorId) {
                const firstAdmin = await prisma.user.findFirst({ where: { role: "admin" } });
                cobradorId = firstAdmin?.id || "system-admin-id";
            }

            const result = await prisma.$transaction(async (tx) => {
                const newTicket = await tx.ticket.create({
                    data: {
                        id: shortTicketId,
                        cliente: { connect: { id: cliente.id } },
                        gestor: cobradorId ? { connect: { id: cobradorId } } : undefined,
                        monto: montoNum,
                        referencia: referencia || 'BANORTE',
                        folio: folio || null,
                        fecha: fechaParsed,
                        remitente: remitente || cliente.telefono,
                        concepto: `TICKET BANORTE (${referencia || 'colchon'})`,
                        conciliado: false
                    }
                });

                const newPago = await tx.pago.create({
                    data: {
                        clienteId: cliente.id,
                        cobradorId: cobradorId || '',
                        ticketId: newTicket.id,
                        monto: montoNum,
                        concepto: `Pago Ticket WhatsApp (${referencia || 'BANORTE'})`,
                        tipoPago: 'regular',
                        fechaPago: new Date(),
                        metodoPago: 'TRANSFERENCIA BANORTE',
                        saldoAnterior: saldoAnterior,
                        saldoNuevo: saldoNuevo,
                        sincronizado: false,
                        ticketImpreso: false
                    }
                });

                await tx.cliente.update({
                    where: { id: cliente.id },
                    data: {
                        saldoActual: saldoNuevo,
                        updatedAt: new Date()
                    }
                });

                return { newTicket, newPago, saldoNuevo };
            });

            return NextResponse.json({
                success: true,
                message: "Pago y ticket insertados con éxito",
                ticketId: result.newTicket.id,
                pagoId: result.newPago.id,
                saldoNuevo: result.saldoNuevo
            });
        }

        // --- ACCIÓN: VALIDAR Y SINCRONIZAR EXTRACTOS BANCARIOS (TEMPORALES) ---
        if (action === "validar_bancos_temporales") {
            const rawMovs = body.movimientos || [];
            const ejecutarInsercion = !!body.insertar;

            let total = rawMovs.length;
            let yaExistian = 0;
            let conciliadosPreviamente = 0;
            let noConciliados = 0;
            let faltantes: any[] = [];
            let insertados = 0;
            let errores = 0;

            for (const m of rawMovs) {
                try {
                    const cuenta = String(m.cuenta || '').replace(/\D/g, '');
                    const rastreo = m.claveRastreo || null;
                    const ref = m.referencia || null;
                    const abono = parseFloat(m.abono || '0') || 0;
                    const cargo = parseFloat(m.cargo || '0') || 0;
                    const fOperacion = m.fechaOperacion ? new Date(m.fechaOperacion) : new Date();

                    let prismaModel: any = null;
                    let cuentaNombre = '';

                    if (cuenta === '65505732541' || (!cuenta && m.banco === 'santander')) {
                        prismaModel = (prisma as any).movimientoSantander65505732541;
                        cuentaNombre = 'Santander 65505732541';
                    } else if (cuenta === '22001022837') {
                        prismaModel = (prisma as any).movimientoSantander22001022837;
                        cuentaNombre = 'Santander 22001022837';
                    } else if (cuenta === '0330253963' || (!cuenta && m.banco === 'banorte')) {
                        prismaModel = (prisma as any).movimientoBanorte0330253963;
                        cuentaNombre = 'Banorte 0330253963';
                    }

                    if (!prismaModel) {
                        errores++;
                        continue;
                    }

                    // Buscar si ya existe en la base de datos (SIN TOCAR NI MODIFICAR NADA)
                    let existing = null;
                    if (rastreo) {
                        existing = await prismaModel.findFirst({
                            where: { claveRastreo: rastreo }
                        });
                    }

                    if (!existing && (ref || abono > 0 || cargo > 0)) {
                        existing = await prismaModel.findFirst({
                            where: {
                                fechaOperacion: fOperacion,
                                abono: abono > 0 ? abono : 0,
                                cargo: cargo > 0 ? cargo : 0,
                                ...(ref ? { referencia: ref } : {})
                            }
                        });
                    }

                    if (existing) {
                        yaExistian++;
                        if (existing.ticketId || existing.conciliado) {
                            conciliadosPreviamente++;
                        } else {
                            noConciliados++;
                        }
                    } else {
                        faltantes.push({
                            cuenta: cuentaNombre,
                            fecha: m.fechaOperacion,
                            hora: m.horaOperacion,
                            abono,
                            cargo,
                            referencia: ref,
                            claveRastreo: rastreo,
                            concepto: m.concepto || m.descripcionGeneral
                        });

                        if (ejecutarInsercion) {
                            const rawHora = m.horaOperacion || null;
                            let hOp: Date | undefined = undefined;
                            if (rawHora) {
                                const hStr = String(rawHora);
                                if (hStr.includes(':')) {
                                    const parts = hStr.split(':');
                                    const hh = parts[0].padStart(2, '0');
                                    const mm = (parts[1] || '00').padStart(2, '0');
                                    const ss = (parts[2] || '00').slice(0, 2).padStart(2, '0');
                                    hOp = new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`);
                                }
                            }

                            await prismaModel.create({
                                data: {
                                    bancoOrigen: m.bancoOrigen || (cuenta === '0330253963' ? 'BANORTE' : 'SANTANDER'),
                                    fechaOperacion: fOperacion,
                                    horaOperacion: hOp && !isNaN(hOp.getTime()) ? hOp : undefined,
                                    descripcionGeneral: m.descripcionGeneral || m.concepto || '',
                                    cargo: cargo,
                                    abono: abono,
                                    saldo: parseFloat(m.saldo || '0') || 0,
                                    referencia: ref,
                                    claveRastreo: rastreo,
                                    concepto: m.concepto || null,
                                    descripcionDetallada: m.descripcionDetallada || null,
                                    clabeEmisor: m.clabeEmisor || null,
                                    cuentaEmisor: m.cuentaEmisor || null
                                }
                            });
                            insertados++;
                        }
                    }
                } catch (e: any) {
                    console.error('Error procesando mov temporal:', e);
                    errores++;
                }
            }

            return NextResponse.json({
                success: true,
                total,
                yaExistian,
                conciliadosPreviamente,
                noConciliados,
                faltantesCount: faltantes.length,
                faltantes: faltantes.slice(0, 50),
                insertados,
                errores
            });
        }

        // --- ACCIÓN: IMPORTAR EXTRACTO BANCARIO ---
        if (action === "importar_banco") {
            const banco = (body.banco || '').toLowerCase();
            const rawMovs = body.movimientos || body.movimiento;
            const movimientos = Array.isArray(rawMovs) ? rawMovs : (rawMovs && typeof rawMovs === 'object' ? [rawMovs] : []);
            const soloRevisar = !!(body.solo_revisar || body.dryRun || body.soloRevisar);

            let insertados = 0;
            let omitidos = 0;
            let existentesConciliados = 0;
            let existentesSinConciliar = 0;
            const noEncontrados: any[] = [];

            for (const m of movimientos) {
                const fOperacion = m.fecha ? new Date(m.fecha) : new Date();
                const desc = m.descripcion || m.concepto || '';
                const cargo = parseFloat(m.cargo || '0') || null;
                const abono = parseFloat(m.abono || m.monto || '0') || null;
                const ref = m.referencia || m.folio || null;
                const rastreo = m.claveRastreo || null;
                const saldo = m.saldo ? parseFloat(m.saldo) : null;

                const rawHora = m.hora || m.horaOperacion || m.time || null;
                let hOp: Date | undefined = undefined;
                if (rawHora) {
                    if (typeof rawHora === 'string' && rawHora.includes(':')) {
                        const parts = rawHora.split(':');
                        const hh = parts[0].padStart(2, '0');
                        const mm = (parts[1] || '00').padStart(2, '0');
                        const ss = (parts[2] || '00').slice(0, 2).padStart(2, '0');
                        hOp = new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`);
                    } else {
                        const parsed = new Date(rawHora);
                        if (!isNaN(parsed.getTime())) hOp = parsed;
                    }
                }

                const targetCuenta = String(m.cuenta || banco).replace(/\D/g, '');

                if (targetCuenta === '65505732541' || banco.includes('65505732541')) {
                    const exists = await prisma.movimientoSantander65505732541.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                ref ? { referencia: ref, abono: abono || undefined } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, cargo: cargo || undefined }
                            ]
                        }
                    });
                    if (!exists) {
                        noEncontrados.push({
                            cuenta: '65505732541',
                            fecha: fOperacion.toISOString().slice(0, 10),
                            hora: m.hora || null,
                            abono,
                            referencia: ref,
                            claveRastreo: rastreo,
                            concepto: m.concepto || desc,
                            nombreOrdenante: m.nombreOrdenante || null
                        });
                        if (!soloRevisar) {
                            await prisma.movimientoSantander65505732541.create({
                                data: {
                                    bancoOrigen: m.bancoEmisor || m.bancoOrigen || 'SANTANDER',
                                    fechaOperacion: fOperacion,
                                    horaOperacion: hOp && !isNaN(hOp.getTime()) ? hOp : undefined,
                                    descripcionGeneral: desc,
                                    concepto: m.concepto || desc,
                                    descripcionDetallada: m.descripcionDetallada || null,
                                    cargo,
                                    abono,
                                    saldo,
                                    referencia: ref,
                                    claveRastreo: rastreo,
                                    clabeEmisor: m.clabeEmisor || null,
                                    cuentaEmisor: m.cuentaEmisor || null,
                                }
                            });
                            insertados++;
                        }
                    } else {
                        omitidos++;
                        if (exists.ticketId) {
                            existentesConciliados++;
                        } else {
                            existentesSinConciliar++;
                        }
                    }
                } else if (targetCuenta === '22001022837' || banco.includes('22001022837') || (banco.includes('santander') && !banco.includes('65505732541'))) {
                    const exists = await prisma.movimientoSantander22001022837.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                ref ? { referencia: ref, abono: abono || undefined } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, cargo: cargo || undefined }
                            ]
                        }
                    });
                    if (!exists) {
                        noEncontrados.push({
                            cuenta: '22001022837',
                            fecha: fOperacion.toISOString().slice(0, 10),
                            hora: m.hora || null,
                            abono,
                            referencia: ref,
                            claveRastreo: rastreo,
                            concepto: m.concepto || desc,
                            nombreOrdenante: m.nombreOrdenante || null
                        });
                        if (!soloRevisar) {
                            await prisma.movimientoSantander22001022837.create({
                                data: {
                                    bancoOrigen: m.bancoEmisor || m.bancoOrigen || 'SANTANDER',
                                    fechaOperacion: fOperacion,
                                    horaOperacion: hOp && !isNaN(hOp.getTime()) ? hOp : undefined,
                                    descripcionGeneral: desc,
                                    concepto: m.concepto || desc,
                                    descripcionDetallada: m.descripcionDetallada || null,
                                    cargo,
                                    abono,
                                    saldo,
                                    referencia: ref,
                                    claveRastreo: rastreo,
                                    clabeEmisor: m.clabeEmisor || null,
                                    cuentaEmisor: m.cuentaEmisor || null,
                                }
                            });
                            insertados++;
                        }
                    } else {
                        omitidos++;
                        if (exists.ticketId) {
                            existentesConciliados++;
                        } else {
                            existentesSinConciliar++;
                        }
                    }
                } else if (banco.includes('banorte')) {
                    const exists = await prisma.movimientoBanorte0330253963.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                ref ? { referencia: ref, abono: abono || undefined } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, descripcionGeneral: desc }
                            ]
                        }
                    });
                    if (!exists) {
                        noEncontrados.push({
                            cuenta: '0330253963',
                            fecha: fOperacion.toISOString().slice(0, 10),
                            hora: m.hora || null,
                            abono,
                            referencia: ref,
                            claveRastreo: rastreo,
                            concepto: m.concepto || desc,
                            nombreOrdenante: m.nombreOrdenante || null
                        });
                        if (!soloRevisar) {
                            const hOp = m.hora ? new Date(`1970-01-01T${m.hora}.000Z`) : undefined;
                            await prisma.movimientoBanorte0330253963.create({
                                data: {
                                    bancoOrigen: m.bancoEmisor || 'BANORTE',
                                    fechaOperacion: fOperacion,
                                    horaOperacion: hOp && !isNaN(hOp.getTime()) ? hOp : undefined,
                                    descripcionGeneral: desc,
                                    concepto: m.concepto || desc,
                                    cargo,
                                    abono,
                                    saldo,
                                    referencia: ref,
                                    claveRastreo: rastreo,
                                }
                            });
                            insertados++;
                        }
                    } else {
                        omitidos++;
                        if (exists.ticketId) {
                            existentesConciliados++;
                        } else {
                            existentesSinConciliar++;
                        }
                    }
                } else {
                    const exists = await prisma.movimientoBancario.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, descripcionGeneral: desc }
                            ]
                        }
                    });
                    if (!exists) {
                        noEncontrados.push({
                            cuenta: banco.toUpperCase(),
                            fecha: fOperacion.toISOString().slice(0, 10),
                            hora: m.hora || null,
                            abono,
                            referencia: ref,
                            claveRastreo: rastreo,
                            concepto: desc
                        });
                        if (!soloRevisar) {
                            await prisma.movimientoBancario.create({
                                data: {
                                    bancoOrigen: banco.toUpperCase() || 'BANCO',
                                    fechaOperacion: fOperacion,
                                    descripcionGeneral: desc,
                                    cargo,
                                    abono,
                                    saldo,
                                    referencia: ref,
                                    claveRastreo: rastreo,
                                }
                            });
                            insertados++;
                        }
                    } else {
                        omitidos++;
                    }
                }
            }

            return NextResponse.json({ 
                success: true, 
                soloRevisar,
                total: movimientos.length,
                insertados, 
                omitidos,
                existentesConciliados,
                existentesSinConciliar,
                faltantesCount: noEncontrados.length,
                faltantes: noEncontrados
            });
        }

        // --- ACCIÓN: CONCILIAR SPEI AUTOMÁTICO ---
        if (action === "conciliar_spei") {
            const ticketsPendientes = await prisma.ticket.findMany({
                where: {
                    conciliado: false,
                    claveRastreo: { not: null }
                },
                include: { cliente: true }
            });

            const conciliados = [];

            for (const t of ticketsPendientes) {
                if (!t.claveRastreo) continue;
                const qClause = {
                    claveRastreo: t.claveRastreo,
                    OR: [{ ticketId: null }, { ticketId: t.id }]
                };

                let mov = await prisma.movimientoSantander22001022837.findFirst({ where: qClause });
                let tabla = 'santander';
                if (!mov) {
                    mov = await prisma.movimientoSantander65505732541.findFirst({ where: qClause });
                }
                if (!mov) {
                    mov = await prisma.movimientoBanorte0330253963.findFirst({ where: qClause });
                    tabla = 'banorte';
                }

                if (mov) {
                    await prisma.ticket.update({
                        where: { id: t.id },
                        data: { conciliado: true }
                    });
                    await prisma.pago.updateMany({
                        where: { ticketId: t.id },
                        data: { banco: tabla.toUpperCase(), sincronizado: true }
                    });
                    conciliados.push({
                        ticketId: t.id,
                        contrato: t.cliente?.codigoCliente,
                        nombre: t.cliente?.nombreCompleto,
                        telefono: t.cliente?.telefono || t.remitente,
                        monto: t.monto,
                        claveRastreo: t.claveRastreo,
                        banco: tabla.toUpperCase()
                    });
                }
            }

            return NextResponse.json({
                success: true,
                totalRevisados: ticketsPendientes.length,
                conciliadosCount: conciliados.length,
                conciliados
            });
        }

        // --- ACCIÓN: ELIMINAR REGISTROS BANCARIOS ANTERIORES A UNA FECHA ---
        if (action === "eliminar_bancos_anteriores" || action === "limpiar_bancos_antiguos") {
            const fechaStr = body.fecha || '2026-08-27';
            const fechaLimite = new Date(`${fechaStr}T00:00:00.000Z`);

            const [delS1, delS2, delB, delMb] = await Promise.all([
                prisma.movimientoSantander22001022837.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
                prisma.movimientoSantander65505732541.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
                prisma.movimientoBanorte0330253963.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
                prisma.movimientoBancario.deleteMany({ where: { fechaOperacion: { lt: fechaLimite } } }),
            ]);

            return NextResponse.json({
                success: true,
                message: `Registros bancarios anteriores al ${fechaStr} eliminados correctamente`,
                fechaLimite: fechaLimite.toISOString(),
                eliminados: {
                    santander_22001022837: delS1.count,
                    santander_65505732541: delS2.count,
                    banorte_0330253963: delB.count,
                    movimientos_bancarios_general: delMb.count,
                    total: delS1.count + delS2.count + delB.count + delMb.count
                }
            });
        }

        // --- ACCIÓN: CONCILIAR DEPÓSITOS EN EFECTIVO ---
        if (action === "conciliar_efectivo") {
            const ticketsEfectivo = await prisma.ticket.findMany({
                where: {
                    conciliado: false,
                    folio: { not: null }
                },
                include: { cliente: true }
            });

            const conciliadosEfectivo = [];

            for (const t of ticketsEfectivo) {
                if (!t.folio) continue;
                const qClause = {
                    OR: [
                        { numeroReferencia: { contains: t.folio } },
                        { descripcionGeneral: { contains: t.folio } }
                    ],
                    abono: t.monto
                };

                let mov = await prisma.movimientoSantander22001022837.findFirst({ where: qClause });
                let tabla = 'santander';
                if (!mov) {
                    mov = await prisma.movimientoSantander65505732541.findFirst({ where: qClause });
                }
                if (!mov) {
                    mov = await prisma.movimientoBanorte0330253963.findFirst({ where: qClause });
                    tabla = 'banorte';
                }

                if (mov) {
                    await prisma.ticket.update({
                        where: { id: t.id },
                        data: { conciliado: true }
                    });
                    await prisma.pago.updateMany({
                        where: { ticketId: t.id },
                        data: { banco: tabla.toUpperCase(), sincronizado: true }
                    });
                    conciliadosEfectivo.push({
                        ticketId: t.id,
                        contrato: t.cliente?.codigoCliente,
                        nombre: t.cliente?.nombreCompleto,
                        monto: t.monto,
                        folio: t.folio,
                        banco: tabla.toUpperCase()
                    });
                }
            }

            return NextResponse.json({
                success: true,
                totalRevisados: ticketsEfectivo.length,
                conciliadosCount: conciliadosEfectivo.length,
                conciliados: conciliadosEfectivo
            });
        }

        // --- ACCIÓN: CONSULTAR ESTADO DE TICKETS PENDIENTES ---
        if (action === "consultar_estado_tickets" || action === "tickets_pendientes_info") {
            const [pendientes, buzon, noConciliados, noConciliadosCount, mb1, mb2, mb3] = await Promise.all([
                prisma.ticketPendiente.findMany({
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, remitente: true, tipoArchivo: true, createdAt: true, updatedAt: true }
                }),
                prisma.buzonTesoreria.findMany({
                    where: { estado: 'PENDIENTE' },
                    orderBy: { fecha: 'desc' },
                    select: { id: true, telefono: true, contractId: true, monto: true, referencia: true, fecha: true, estado: true, metadata: true }
                }),
                prisma.ticket.findMany({
                    where: { conciliado: false },
                    orderBy: { creadoEn: 'desc' },
                    take: 20,
                    include: {
                        cliente: {
                            select: { codigoCliente: true, nombreCompleto: true, telefono: true }
                        }
                    }
                }),
                prisma.ticket.count({ where: { conciliado: false } }),
                prisma.movimientoSantander22001022837.count({ where: { ticketId: null, abono: { gt: 0 } } }),
                prisma.movimientoSantander65505732541.count({ where: { ticketId: null, abono: { gt: 0 } } }),
                prisma.movimientoBanorte0330253963.count({ where: { ticketId: null, abono: { gt: 0 } } })
            ]);

            return NextResponse.json({
                success: true,
                ticketPendienteWhatsapp: {
                    count: pendientes.length,
                    items: pendientes
                },
                buzonTesoreriaPendiente: {
                    count: buzon.length,
                    items: buzon
                },
                ticketsNoConciliados: {
                    total: noConciliadosCount,
                    ultimos: noConciliados.map(t => ({
                        id: t.id,
                        legacyId: t.legacyId,
                        contrato: t.cliente?.codigoCliente,
                        cliente: t.cliente?.nombreCompleto,
                        monto: t.monto,
                        referencia: t.referencia,
                        folio: t.folio,
                        claveRastreo: t.claveRastreo,
                        fecha: t.fecha,
                        creadoEn: t.creadoEn,
                        remitente: t.remitente
                    }))
                },
                movimientosBancariosSinConciliar: {
                    santander_22001022837: mb1,
                    santander_65505732541: mb2,
                    banorte_0330253963: mb3,
                    total: mb1 + mb2 + mb3
                }
            });
        }

        // --- ACCIÓN: OBTENER PAGOS PENDIENTES DE NOTIFICAR ---
        if (action === "pagos_pendientes_notificar") {
            const limitNum = parseInt(body.limit || '20') || 20;
            const pagos = await prisma.pago.findMany({
                where: {
                    ticketImpreso: false,
                    metodoPago: { not: 'BANCOS BOT' }
                },
                take: limitNum,
                include: {
                    cliente: true,
                    cobrador: true
                },
                orderBy: { fechaPago: 'asc' }
            });

            return NextResponse.json({
                success: true,
                count: pagos.length,
                pagos: pagos.map(p => ({
                    id: p.id,
                    contrato: p.cliente.codigoCliente,
                    nombreCliente: p.cliente.nombreCompleto,
                    telefono: p.cliente.telefono,
                    monto: parseFloat(p.monto.toString()),
                    saldoAnterior: parseFloat(p.saldoAnterior.toString()),
                    saldoNuevo: parseFloat(p.saldoNuevo.toString()),
                    numeroRecibo: p.numeroRecibo,
                    fechaPago: p.fechaPago.toISOString().slice(0, 10),
                    cobrador: p.cobrador.name
                }))
            });
        }

        // --- ACCIÓN: MARCAR PAGO NOTIFICADO O INVÁLIDO ---
        if (action === "marcar_pago_notificado") {
            const pagoId = body.pagoId || body.id;
            if (pagoId) {
                await prisma.pago.update({
                    where: { id: pagoId },
                    data: { ticketImpreso: true }
                });
            }
            return NextResponse.json({ success: true, message: "Pago marcado como notificado" });
        }

        if (action === "marcar_pago_invalido") {
            const pagoId = body.pagoId || body.id;
            if (pagoId) {
                await prisma.pago.update({
                    where: { id: pagoId },
                    data: { concepto: `${body.concepto || ''} [TEL_INVALIDO]`.trim() }
                });
            }
            return NextResponse.json({ success: true, message: "Pago marcado con teléfono inválido" });
        }

        // --- ACCIÓN: GUARDAR PENDIENTE ---
        if (action === "pending") {
            if (!remitente || !base64Data) {
                return NextResponse.json({ error: "Remitente y datos de imagen requeridos" }, { status: 400 });
            }

            await prisma.ticketPendiente.upsert({
                where: { remitente },
                update: {
                    base64Data,
                    tipoArchivo: tipoArchivo || "image/jpeg",
                    updatedAt: new Date()
                },
                create: {
                    remitente,
                    base64Data,
                    tipoArchivo: tipoArchivo || "image/jpeg"
                }
            });

            return NextResponse.json({ message: "Ticket guardado como pendiente" });
        }

        // --- ACCIÓN: RESOLVER PENDIENTE ---
        if (action === "resolve") {
            if (!remitente || !contrato) {
                return NextResponse.json({ error: "Remitente y contrato requeridos" }, { status: 400 });
            }

            const pendiente = await prisma.ticketPendiente.findUnique({
                where: { remitente }
            });

            if (!pendiente) {
                return NextResponse.json({ error: "No hay tickets pendientes para este remitente" }, { status: 404 });
            }

            // Retornamos la data para que n8n continúe con el procesamiento (IA)
            return NextResponse.json({
                base64Data: pendiente.base64Data,
                tipoArchivo: pendiente.tipoArchivo,
                contrato: contrato.toUpperCase()
            });
        }

        // --- ACCIÓN: CREAR TICKET (DIRECTO O FINAL) ---
        // --- AUTO-DETECCIÓN DE CONTRATO EN MUEBLERIA-ERP ---
        let codigoFinal = contrato && contrato !== 'null' ? contrato.toUpperCase() : null;
        
        if (!codigoFinal && referencia && referencia !== 'null') {
            const match = referencia.match(/[D][QP]\d+/i);
            if (match) codigoFinal = match[0].toUpperCase();
        }

        let cliente: any = codigoFinal ? await prisma.cliente.findFirst({
            where: { codigoCliente: { equals: codigoFinal, mode: 'insensitive' } },
            include: { cobradorAsignado: true }
        }) : null;

        // Fallback: Si no hay cliente por código, buscar por teléfono del remitente en muebleria-erp
        if (!cliente && remitente) {
            const telRaw = String(remitente).replace(/\D/g, '');
            if (telRaw.length >= 10) {
                const tel10 = telRaw.slice(-10);
                const clientePorTel = await prisma.cliente.findFirst({
                    where: {
                        OR: [
                            { telefono: { contains: tel10 } },
                            { telefonoTrabajo: { contains: tel10 } },
                            { telefono: { contains: telRaw } }
                        ]
                    },
                    include: { cobradorAsignado: true }
                });
                if (clientePorTel) {
                    cliente = clientePorTel;
                    codigoFinal = clientePorTel.codigoCliente;
                }
            }
        }

        // Si no se pudo detectar cliente o contrato, guardar en Cola de Tesorería (Buzón) para que no se pierda
        if (!cliente) {
            let uniqueHash = base64Data 
                ? crypto.createHash('md5').update(base64Data).digest('hex')
                : crypto.createHash('md5').update(`${remitente || 'noref'}-${monto || 0}-${claverastreo || 'norastreo'}-${Date.now()}`).digest('hex');

            await prisma.buzonTesoreria.upsert({
                where: { hash: uniqueHash },
                update: {
                    estado: 'PENDIENTE',
                    contractId: codigoFinal || null,
                    monto: parseFloat(monto || '0') || 0,
                    referencia: referencia !== 'null' ? referencia : null,
                    base64Data: base64Data || null,
                    metadata: { contrato: codigoFinal, monto, referencia, folio, fecha, hr, claverastreo, error: 'Cliente no encontrado o contrato por asignar' }
                },
                create: {
                    telefono: remitente || "N/A",
                    hash: uniqueHash,
                    base64Data: base64Data || null,
                    contractId: codigoFinal || null,
                    monto: parseFloat(monto || '0') || 0,
                    referencia: referencia !== 'null' ? referencia : null,
                    fecha: new Date(),
                    estado: 'PENDIENTE',
                    metadata: { contrato: codigoFinal, monto, referencia, folio, fecha, hr, claverastreo, error: 'Cliente no encontrado o contrato por asignar' }
                }
            });

            return NextResponse.json({
                message: "Ticket registrado en la Cola de Tesorería (Buzón Pendiente) para asignación manual",
                contrato: codigoFinal,
                pendiente: true,
                mensaje: `⚠️ Ticket guardado en *Cola de Tesorería*.\nContrato detectado: ${codigoFinal || 'Sin Contrato'}. Se puede conciliar manualmente desde el Dashboard.`
            });
        }

        // 3. Verificar Duplicado (Ventana de 15 minutos para evitar peticiones/webhooks concurrentes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const parsedSearchDate = (fecha && fecha !== 'null' && fecha !== 'undefined') ? new Date(fecha) : undefined;
        const safeSearchDate = (parsedSearchDate && !isNaN(parsedSearchDate.getTime())) ? parsedSearchDate : undefined;
        
        // Referencias estructuradas (excluyendo números de tarjeta / cuenta destino de la empresa como 1858, 2837, etc.)
        const companyAccounts = ['0228372', '22001022837', '65505732541', '0330253963', '1858', '2837', '5396', '0228'];
        const isCompanyAccountRef = companyAccounts.some(acc => referencia && String(referencia).includes(acc));
        // Solo considerar referencia única si tiene al menos 7 dígitos y no es cuenta/tarjeta destino común
        const isNumericRef = Boolean(referencia && referencia !== 'null' && /^\d{7,}$/.test(String(referencia).trim()) && !isCompanyAccountRef);
        const isNumericFolio = Boolean(folio && folio !== 'null' && /^\d{6,}$/.test(String(folio).trim()));
        const forzarCreacion = Boolean(body.forzar || body.force);
        const existingTicket = forzarCreacion ? null : await prisma.ticket.findFirst({
            where: {
                clienteId: cliente.id,
                OR: [
                    (legacyIdNum) ? { legacyId: legacyIdNum } : { id: 'none' },
                    (claverastreo && claverastreo !== 'null' && claverastreo.length >= 12) ? { claveRastreo: claverastreo } : { id: 'none' },
                    (isNumericRef && safeSearchDate) ? { referencia: String(referencia).trim(), fecha: safeSearchDate } : { id: 'none' },
                    (isNumericFolio && safeSearchDate) ? { folio: String(folio).trim(), fecha: safeSearchDate } : { id: 'none' },
                    {
                        monto: parseFloat(monto || '0'),
                        creadoEn: { gte: fifteenMinutesAgo }
                    }
                ]
            }
        });

        if (existingTicket) {
            // Si la fecha o hora enviada es válida, actualizar fecha del ticket existente y de su pago
            if (safeSearchDate || (hr && hr !== 'null')) {
                const combinedDate = parseValidDate(fecha, hr);
                if (combinedDate) {
                    await prisma.ticket.update({
                        where: { id: existingTicket.id },
                        data: {
                            fecha: combinedDate
                        }
                    });
                }
            }

            // Buscar el pago y saldo nuevo para enriquecer la respuesta
            const pagoAsociado = await prisma.pago.findFirst({
                where: { ticketId: existingTicket.id }
            });

            return NextResponse.json({
                message: "Ticket ya existe",
                ticketId: existingTicket.id,
                ticket_id: existingTicket.id,
                pagoId: pagoAsociado?.id || null,
                idPagoGenerado: pagoAsociado?.id || null,
                conciliado: existingTicket.conciliado,
                saldoNuevo: pagoAsociado ? parseFloat(pagoAsociado.saldoNuevo.toString()) : parseFloat(cliente.saldoActual.toString()),
                saldo_actual: pagoAsociado ? parseFloat(pagoAsociado.saldoNuevo.toString()) : parseFloat(cliente.saldoActual.toString()),
                ya_existe: true,
                yaExiste: true,
                remitente: remitente || existingTicket.remitente || cliente.telefono,
                contrato: codigoFinal,
                cod_cliente: codigoFinal,
                mensaje: `⚠️ Este comprobante ya existe con ID ${existingTicket.id}.\n\n📌 *Detalles del Ticket*\n- 🆔 ID: ${existingTicket.id}\n- 📄 Contrato: ${codigoFinal}\n- 📅 Fecha: ${fecha || 'N/A'}\n- ⏰ Hora: ${hr || 'N/A'}\n- 💰 Monto: $${parseFloat(monto).toFixed(2)}\n- 🔢 Referencia: ${referencia !== 'null' ? referencia : 'N/A'}\n- 📝 Folio: ${folio !== 'null' ? folio : 'N/A'}\n- 📦 Clave de rastreo: ${claverastreo !== 'null' ? claverastreo : 'N/A'}\n\n⚡ *TICKET EN PROCESO DE CONCILIACION* ⚡`
            });
        }

        // 4. Procesar Fecha/Hora: Si no hay fecha o es nula/inválida, se toma la fecha y hora actual del momento del envío
        const fechaTicket = parseValidDate(fecha, hr);

        // 5. Encontrar Cobrador o Admin para asociar al Pago
        let cobradorId = cliente.cobradorAsignadoId;
        if (!cobradorId) {
            const firstAdmin = await prisma.user.findFirst({
                where: { role: "admin" }
            });
            cobradorId = firstAdmin?.id || "system-admin-id";
        }
        let tipoPagoStr = "regular";

        // 6. Ejecutar Creación de Ticket, Pago, Ajuste de Saldo y Conciliación Bancaria en una sola transacción Prisma
        const result = await prisma.$transaction(async (tx) => {
            const shortTicketId = Math.random().toString(36).substring(2, 10).toUpperCase();

            // A. Crear Ticket con sintaxis universal Prisma
            const newTicket = await tx.ticket.create({
                data: {
                    id: shortTicketId,
                    legacyId: legacyIdNum || null,
                    cliente: { connect: { id: cliente.id } },
                    gestor: cobradorId ? { connect: { id: cobradorId } } : undefined,
                    monto: parseFloat(monto || '0') || 0,
                    referencia: referencia !== 'null' ? referencia : null,
                    folio: folio !== 'null' ? folio : null,
                    fecha: fechaTicket,
                    claveRastreo: claverastreo !== 'null' ? claverastreo : null,
                    remitente: remitente !== 'null' ? remitente : null,
                    concepto: "TICKET WHATSAPP (n8n)",
                    conciliado: false
                }
            });

            // B. Intentar Conciliación Inteligente con Movimientos Bancarios en las 3 tablas
            let movimientoBancario = null;
            let tablaOrigen = '';

            if (claverastreo && claverastreo !== 'null') {
                const queryClause = {
                    claveRastreo: claverastreo,
                    OR: [
                        { ticketId: null },
                        { ticketId: newTicket.id }
                    ]
                };

                let mov = await tx.movimientoSantander22001022837.findFirst({ where: queryClause });
                if (mov) {
                    movimientoBancario = mov;
                    tablaOrigen = 'movimientoSantander22001022837';
                } else {
                    mov = await tx.movimientoSantander65505732541.findFirst({ where: queryClause });
                    if (mov) {
                        movimientoBancario = mov;
                        tablaOrigen = 'movimientoSantander65505732541';
                    } else {
                        mov = await tx.movimientoBanorte0330253963.findFirst({ where: queryClause });
                        if (mov) {
                            movimientoBancario = mov;
                            tablaOrigen = 'movimientoBanorte0330253963';
                        }
                    }
                }
            }

            // C. Si se encontró el movimiento bancario, marcar ticket como conciliado
            if (movimientoBancario) {
                await tx.ticket.update({
                    where: { id: newTicket.id },
                    data: { conciliado: true }
                });
            }

            // D. Calcular saldos
            const saldoAnterior = cliente.saldoActual;
            const saldoNuevo = saldoAnterior.minus(parseFloat(monto || '0') || 0);

            // E. Crear Registro de Pago
            const newPago = await tx.pago.create({
                data: {
                    cliente: { connect: { id: cliente.id } },
                    cobrador: { connect: { id: cobradorId! } },
                    ticket: { connect: { id: newTicket.id } },
                    monto: parseFloat(monto || '0') || 0,
                    interesMoratorio: 0,
                    gastosCobranza: 0,
                    concepto: movimientoBancario ? `TKT: ${newTicket.id} / MOV: ${movimientoBancario.id.slice(-8)}` : `TKT: ${newTicket.id} / PENDIENTE`,
                    tipoPago: tipoPagoStr as any,
                    fechaPago: new Date(),
                    saldoAnterior: saldoAnterior,
                    saldoNuevo: saldoNuevo,
                    metodoPago: "BANCOS BOT",
                    sincronizado: true,
                    banco: movimientoBancario?.bancoOrigen || "TRANSFERENCIA"
                }
            });

            // F. Actualizar saldo del cliente
            await tx.cliente.update({
                where: { id: cliente.id },
                data: {
                    saldoActual: saldoNuevo
                }
            });

            // G. Vincular el movimiento bancario
            if (movimientoBancario) {
                const updateMovData = {
                    ticketId: newTicket.id,
                    clienteId: cliente.id,
                    fechaIdentificado: new Date()
                };

                if (tablaOrigen === 'movimientoSantander22001022837') {
                    await tx.movimientoSantander22001022837.update({
                        where: { id: movimientoBancario.id },
                        data: updateMovData
                    });
                } else if (tablaOrigen === 'movimientoSantander65505732541') {
                    await tx.movimientoSantander65505732541.update({
                        where: { id: movimientoBancario.id },
                        data: updateMovData
                    });
                } else if (tablaOrigen === 'movimientoBanorte0330253963') {
                    await tx.movimientoBanorte0330253963.update({
                        where: { id: movimientoBancario.id },
                        data: updateMovData
                    });
                }
            }

            // H. Eliminar de pendientes si existe
            if (remitente) {
                await tx.ticketPendiente.deleteMany({
                    where: { remitente }
                });
            }

            // I. Sincronizar con el Buzón de Tesorería (Cola de Comprobantes) para el Dashboard
            let uniqueHash = null;
            if (base64Data) {
                uniqueHash = crypto.createHash('md5').update(base64Data).digest('hex');
            } else {
                const uniqueStr = `${cliente.id}-${monto}-${referencia || 'noref'}-${fechaTicket.toISOString()}`;
                uniqueHash = crypto.createHash('md5').update(uniqueStr).digest('hex');
            }

            await tx.buzonTesoreria.upsert({
                where: { hash: uniqueHash },
                update: {
                    estado: movimientoBancario ? 'PROCESADO' : 'PENDIENTE',
                    contractId: codigoFinal,
                    monto: parseFloat(monto),
                    referencia: referencia !== 'null' ? referencia : null,
                    base64Data: base64Data || null,
                    metadata: {
                        contrato: codigoFinal,
                        monto: parseFloat(monto),
                        referencia: referencia,
                        folio: folio,
                        fecha: fecha,
                        hr: hr,
                        claverastreo: claverastreo
                    }
                },
                create: {
                    telefono: remitente || "N/A",
                    hash: uniqueHash,
                    base64Data: base64Data || null,
                    contractId: codigoFinal,
                    monto: parseFloat(monto),
                    referencia: referencia !== 'null' ? referencia : null,
                    fecha: fechaTicket,
                    estado: movimientoBancario ? 'PROCESADO' : 'PENDIENTE',
                    metadata: {
                        contrato: codigoFinal,
                        monto: parseFloat(monto),
                        referencia: referencia,
                        folio: folio,
                        fecha: fecha,
                        hr: hr,
                        claverastreo: claverastreo
                    }
                }
            });

            return {
                ticketId: newTicket.id,
                pagoId: newPago.id,
                conciliado: !!movimientoBancario,
                saldoNuevo: saldoNuevo.toNumber()
            };
        });

        const urlRecibo = `https://erp.mueblesdaso.com/public/recibo/${result.ticketId}`;

        return NextResponse.json({
            message: "Ticket y Pago procesados correctamente",
            ticketId: result.ticketId,
            ticket_id: result.ticketId,
            pagoId: result.pagoId,
            idPagoGenerado: result.pagoId,
            conciliado: result.conciliado,
            saldoNuevo: result.saldoNuevo,
            saldo_actual: result.saldoNuevo,
            urlRecibo,
            ya_existe: false,
            yaExiste: false,
            remitente: remitente || cliente.telefono,
            contrato: codigoFinal,
            cod_cliente: codigoFinal,
            mensaje: `✅ *¡COMPROBANTE REGISTRADO CON ÉXITO!*\n\n📌 *Detalles del Recibo*\n- 🆔 Folio Ticket: *${result.ticketId}*\n- 📄 Contrato: *${codigoFinal}*\n- 👤 Cliente: *${cliente.nombreCompleto}*\n- 💰 Abono: *$${parseFloat(monto).toFixed(2)}*\n- 💳 Saldo Anterior: *$${cliente.saldoActual.toFixed(2)}*\n- 💵 Saldo Nuevo: *$${result.saldoNuevo.toFixed(2)}*\n- 📅 Fecha: ${fecha || new Date().toISOString().slice(0, 10)}\n- ⏰ Hora: ${hr || new Date().toLocaleTimeString('es-MX')}\n- 📦 Rastreo SPEI: ${claverastreo !== 'null' ? claverastreo : 'N/A'}\n- 🏦 Estado: *${result.conciliado ? 'CONCILIADO EN BANCO' : 'EN PROCESO DE CONCILIACIÓN'}*\n\n📄 *Ver tu Recibo Oficial Digital:* \n👉 ${urlRecibo}\n\n_Mueblería Daso agradece su preferencia._`
        });

    } catch (error: any) {
        console.error("Error en Webhook n8n:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
