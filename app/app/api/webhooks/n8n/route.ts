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

        // --- ACCIÓN: BUSCAR CLIENTE POR TELÉFONO O CÓDIGO ---
        if (action === "buscar_cliente") {
            const telRaw = (body.telefono || body.phone || remitente || '').replace(/\D/g, '');
            const cod = (body.contrato || body.codigoCliente || contrato || '').trim().toUpperCase();
            
            let cliente = null;
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
                            { telefonoTrabajo: { contains: tel10 } }
                        ]
                    },
                    include: { cobradorAsignado: true }
                });

                // Si no está en BD local, buscar en ContPAQi API en vivo por teléfono
                if (!cliente) {
                    try {
                        for (const emp of ['DQ', 'DP']) {
                            const cRes = await fetch(`http://vortex520.qhosting.net:5000/api/Documentos/cliente/${tel10}?empresa=${emp}`, {
                                headers: {
                                    'Accept': 'application/json',
                                    'X-API-Key': 'VERTEX123_CONTPAQI_ERP_2024',
                                    'X-Company-Id': emp,
                                    'X-Contpaqi-Empresa': emp
                                }
                            });
                            if (cRes.ok) {
                                const docs = await cRes.json();
                                if (Array.isArray(docs) && docs.length > 0) {
                                    const firstDoc = docs[0];
                                    const codCli = firstDoc.codigoCliente || (firstDoc.serie && firstDoc.folio ? `${firstDoc.serie}${firstDoc.folio}` : null) || firstDoc.referencia;
                                    if (codCli) {
                                        return NextResponse.json({
                                            encontrado: true,
                                            cod_cliente: codCli,
                                            cliente: {
                                                id: codCli,
                                                codigoCliente: codCli,
                                                nombreCompleto: firstDoc.razonSocial || 'Cliente ContPAQi',
                                                telefono: tel10,
                                                saldoActual: 0,
                                                cobrador: null
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    } catch (err: any) {
                        console.log('Error buscando cliente en ContPAQi por tel:', err.message);
                    }
                }
            }

            if (!cliente) {
                return NextResponse.json({ encontrado: false, message: "Cliente no encontrado" });
            }

            return NextResponse.json({
                encontrado: true,
                cod_cliente: cliente.codigoCliente,
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

        // --- ACCIÓN: IMPORTAR EXTRACTO BANCARIO ---
        if (action === "importar_banco") {
            const banco = (body.banco || '').toLowerCase();
            const movimientos = Array.isArray(body.movimientos) ? body.movimientos : [];

            let insertados = 0;
            let omitidos = 0;

            for (const m of movimientos) {
                const fOperacion = m.fecha ? new Date(m.fecha) : new Date();
                const desc = m.descripcion || m.concepto || '';
                const cargo = parseFloat(m.cargo || '0') || null;
                const abono = parseFloat(m.abono || m.monto || '0') || null;
                const ref = m.referencia || m.folio || null;
                const rastreo = m.claveRastreo || null;
                const saldo = m.saldo ? parseFloat(m.saldo) : null;

                if (banco.includes('santander')) {
                    const exists = await prisma.movimientoSantander22001022837.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                ref ? { numeroReferencia: ref, abono: abono || undefined } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, descripcionGeneral: desc }
                            ]
                        }
                    });
                    if (!exists) {
                        await prisma.movimientoSantander22001022837.create({
                            data: {
                                fechaOperacion: fOperacion,
                                descripcionGeneral: desc,
                                cargo,
                                abono,
                                saldoFinalCalculado: saldo,
                                numeroReferencia: ref,
                                claveRastreo: rastreo,
                            }
                        });
                        insertados++;
                    } else {
                        omitidos++;
                    }
                } else if (banco.includes('banorte')) {
                    const exists = await prisma.movimientoBanorte0330253963.findFirst({
                        where: {
                            OR: [
                                rastreo ? { claveRastreo: rastreo } : { id: 'none' },
                                ref ? { numeroReferencia: ref, abono: abono || undefined } : { id: 'none' },
                                { fechaOperacion: fOperacion, abono: abono || undefined, descripcionGeneral: desc }
                            ]
                        }
                    });
                    if (!exists) {
                        await prisma.movimientoBanorte0330253963.create({
                            data: {
                                fechaOperacion: fOperacion,
                                descripcionGeneral: desc,
                                cargo,
                                abono,
                                saldoFinalCalculado: saldo,
                                numeroReferencia: ref,
                                claveRastreo: rastreo,
                            }
                        });
                        insertados++;
                    } else {
                        omitidos++;
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
                        await prisma.movimientoBancario.create({
                            data: {
                                bancoOrigen: banco.toUpperCase() || 'BANCO',
                                fechaOperacion: fOperacion,
                                descripcionGeneral: desc,
                                cargo,
                                abono,
                                saldoFinalCalculado: saldo,
                                numeroReferencia: ref,
                                claveRastreo: rastreo,
                            }
                        });
                        insertados++;
                    } else {
                        omitidos++;
                    }
                }
            }

            return NextResponse.json({ success: true, insertados, omitidos });
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
        // --- AUTO-DETECCIÓN DE CONTRATO ---
        let codigoFinal = contrato && contrato !== 'null' ? contrato.toUpperCase() : null;
        
        if (!codigoFinal && referencia && referencia !== 'null') {
            const match = referencia.match(/[D][QP]\d+/i);
            if (match) codigoFinal = match[0].toUpperCase();
        }

        // Si no se pudo detectar cliente o contrato, guardar en Cola de Tesorería (Buzón) para que no se pierda
        const cliente = codigoFinal ? await prisma.cliente.findUnique({
            where: { codigoCliente: codigoFinal },
            include: { cobradorAsignado: true }
        }) : null;

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

        const existingTicket = await prisma.ticket.findFirst({
            where: {
                clienteId: cliente.id,
                OR: [
                    (legacyIdNum) ? { legacyId: legacyIdNum } : { id: 'none' },
                    (claverastreo && claverastreo !== 'null' && claverastreo.length >= 10) ? { claveRastreo: claverastreo } : { id: 'none' },
                    (referencia && referencia !== 'null') ? { referencia: referencia } : { id: 'none' },
                    (folio && folio !== 'null') ? { folio: folio } : { id: 'none' },
                    {
                        monto: parseFloat(monto || '0'),
                        creadoEn: { gte: fifteenMinutesAgo }
                    },
                    ...(safeSearchDate ? [{
                        monto: parseFloat(monto || '0'),
                        fecha: safeSearchDate
                    }] : [])
                ]
            }
        });

        if (existingTicket) {
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

        // Consultar saldo en vivo de ContPAQi API si está disponible
        let saldoContpaqiInfo = "";
        try {
            const empresaCod = codigoFinal.startsWith('DP') ? 'DP' : 'DQ';
            const contpaqiRes = await fetch(`http://vortex520.qhosting.net:5000/api/Documentos/cliente/${codigoFinal}?empresa=${empresaCod}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-API-Key': 'VERTEX123_CONTPAQI_ERP_2024',
                    'X-Company-Id': empresaCod,
                    'X-Contpaqi-Empresa': empresaCod
                }
            });
            if (contpaqiRes.ok) {
                const docs = await contpaqiRes.json();
                if (Array.isArray(docs)) {
                    const saldoPendiente = docs
                        .filter((d: any) => d.cancelado === 0)
                        .reduce((acc: number, d: any) => acc + (d.pendiente !== undefined ? d.pendiente : (d.total || 0)), 0);
                    saldoContpaqiInfo = `\n- 💼 Saldo ContPAQi: *$${saldoPendiente.toFixed(2)}*`;
                }
            }
        } catch (e: any) {
            console.log("Aviso: ContPAQi API no respondió para saldo en vivo:", e.message);
        }

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
            mensaje: `✅ *¡COMPROBANTE REGISTRADO CON ÉXITO!*\n\n📌 *Detalles del Recibo*\n- 🆔 Folio Ticket: *${result.ticketId}*\n- 📄 Contrato: *${codigoFinal}*\n- 👤 Cliente: *${cliente.nombreCompleto}*\n- 💰 Abono: *$${parseFloat(monto).toFixed(2)}*\n- 💳 Saldo Anterior: *$${cliente.saldoActual.toFixed(2)}*\n- 💵 Saldo Nuevo: *$${result.saldoNuevo.toFixed(2)}*${saldoContpaqiInfo}\n- 📅 Fecha: ${fecha || new Date().toISOString().slice(0, 10)}\n- ⏰ Hora: ${hr || new Date().toLocaleTimeString('es-MX')}\n- 📦 Rastreo SPEI: ${claverastreo !== 'null' ? claverastreo : 'N/A'}\n- 🏦 Estado: *${result.conciliado ? 'CONCILIADO EN BANCO' : 'EN PROCESO DE CONCILIACIÓN'}*\n\n📄 *Ver tu Recibo Oficial Digital:* \n👉 ${urlRecibo}\n\n_Mueblería Daso agradece su preferencia._`
        });

    } catch (error: any) {
        console.error("Error en Webhook n8n:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
