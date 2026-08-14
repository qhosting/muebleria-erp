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
        let folio = body.folio || body.metadata?.folio;
        let fecha = body.fecha || body.date || body.metadata?.fecha;
        let hr = body.hr || body.hora || body.time || body.metadata?.hr;
        let claverastreo = body.claverastreo || body.claveRastreo || body.clave_rastreo || body.trackingKey || body.metadata?.claverastreo;
        let remitente = body.remitente || body.telefono || body.phone || body.sender || body.metadata?.remitente;
        let base64Data = body.base64Data || body.base64 || body.image || body.metadata?.base64Data;
        let tipoArchivo = body.tipoArchivo || body.mimeType || body.metadata?.tipoArchivo;

        // Limpieza defensiva de posibles signos '=' o espacios extras de las expresiones de n8n
        if (typeof contrato === "string") contrato = contrato.replace(/^=/, "").trim();
        if (typeof monto === "string") monto = monto.replace(/^=/, "").trim();
        if (typeof referencia === "string") referencia = referencia.replace(/^=/, "").trim();
        if (typeof folio === "string") folio = folio.replace(/^=/, "").trim();
        if (typeof claverastreo === "string") claverastreo = claverastreo.replace(/^=/, "").trim();
        if (typeof remitente === "string") remitente = remitente.replace(/^=/, "").trim();
        if (typeof fecha === "string") fecha = fecha.replace(/^=/, "").trim();
        if (typeof hr === "string") hr = hr.replace(/^=/, "").trim();

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
                OR: [
                    (claverastreo && claverastreo !== 'null' && claverastreo.length >= 10) ? { claveRastreo: claverastreo } : { id: 'none' },
                    (referencia && referencia !== 'null') ? {
                        clienteId: cliente.id,
                        referencia: referencia
                    } : { id: 'none' },
                    (folio && folio !== 'null') ? {
                        clienteId: cliente.id,
                        folio: folio
                    } : { id: 'none' },
                    {
                        clienteId: cliente.id,
                        monto: parseFloat(monto || '0'),
                        creadoEn: { gte: fifteenMinutesAgo }
                    },
                    ...(safeSearchDate ? [{
                        clienteId: cliente.id,
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
                pagoId: pagoAsociado?.id || null,
                conciliado: existingTicket.conciliado,
                saldoNuevo: pagoAsociado ? parseFloat(pagoAsociado.saldoNuevo.toString()) : parseFloat(cliente.saldoActual.toString()),
                ya_existe: true,
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

            // A. Crear Ticket
            const newTicket = await tx.ticket.create({
                data: {
                    id: shortTicketId,
                    clienteId: cliente.id,
                    monto: parseFloat(monto),
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
            const saldoNuevo = saldoAnterior.minus(parseFloat(monto));

            // E. Crear Registro de Pago
            const newPago = await tx.pago.create({
                data: {
                    clienteId: cliente.id,
                    cobradorId: cobradorId!,
                    ticketId: newTicket.id,
                    monto: parseFloat(monto),
                    interesMoratorio: 0,
                    gastosCobranza: 0,
                    concepto: movimientoBancario ? `TKT: ${newTicket.id} / MOV: ${movimientoBancario.id.slice(-8)}` : `TKT: ${newTicket.id} / PENDIENTE`,
                    tipoPago: tipoPagoStr as any,
                    fechaPago: new Date(), // Los pagos de bot se insertan con la fecha actual del envio para coincidir con la semana de cobranza
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

        return NextResponse.json({
            message: "Ticket y Pago procesados correctamente",
            ticketId: result.ticketId,
            pagoId: result.pagoId,
            conciliado: result.conciliado,
            saldoNuevo: result.saldoNuevo,
            ya_existe: false,
            mensaje: `✅ ¡Comprobante EN PROCESO de VALIDACIÓN!\n\n📌 *Detalles del Ticket*\n- 🆔 ID: ${result.ticketId}\n- 📄 Contrato: ${codigoFinal}\n- 📅 Fecha: ${fecha || 'N/A'}\n- ⏰ Hora: ${hr || 'N/A'}\n- 💰 Monto: $${parseFloat(monto).toFixed(2)}\n- 🔢 Referencia: ${referencia !== 'null' ? referencia : 'N/A'}\n- 📝 Folio: ${folio !== 'null' ? folio : 'N/A'}\n- 📦 Clave de rastreo: ${claverastreo !== 'null' ? claverastreo : 'N/A'}\n\n⚡ *TICKET EN PROCESO DE CONCILIACION* ⚡`
        });

    } catch (error: any) {
        console.error("Error en Webhook n8n:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
