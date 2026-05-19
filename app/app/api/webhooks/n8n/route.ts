import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

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
        const {
            action, // 'create', 'pending', 'resolve'
            contrato,
            monto,
            referencia,
            folio,
            fecha,
            hr,
            claverastreo,
            remitente,
            base64Data,
            tipoArchivo
        } = body;

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

        if (!codigoFinal) {
            return NextResponse.json({ error: "Contrato no detectado en cuerpo ni referencia" }, { status: 400 });
        }

        // 2. Buscar Cliente
        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente: codigoFinal }
        });

        if (!cliente) {
            return NextResponse.json({ error: `Cliente con contrato ${codigoFinal} no encontrado` }, { status: 404 });
        }

        // 3. Verificar Duplicado
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                OR: [
                    claverastreo && claverastreo !== 'null' ? { claveRastreo: claverastreo } : { id: 'none' },
                    {
                        clienteId: cliente.id,
                        monto: parseFloat(monto),
                        fecha: fecha ? new Date(fecha) : undefined,
                    }
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

        // 4. Procesar Fecha/Hora
        let fechaTicket = new Date();
        if (fecha) {
            fechaTicket = new Date(fecha);
            if (hr && hr !== 'null') {
                const [hours, minutes, seconds] = hr.split(':');
                fechaTicket.setHours(parseInt(hours) || 0);
                fechaTicket.setMinutes(parseInt(minutes) || 0);
                fechaTicket.setSeconds(parseInt(seconds) || 0);
            }
        }

        // 5. Encontrar Cobrador o Admin para asociar al Pago
        let cobradorId = cliente.cobradorAsignadoId;
        if (!cobradorId) {
            const firstAdmin = await prisma.user.findFirst({
                where: { role: "admin" }
            });
            cobradorId = firstAdmin?.id || "system-admin-id";
        }

        // 6. Ejecutar Creación de Ticket, Pago, Ajuste de Saldo y Conciliación Bancaria en una sola transacción Prisma
        const result = await prisma.$transaction(async (tx) => {
            // A. Crear Ticket
            const newTicket = await tx.ticket.create({
                data: {
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

            // B. Intentar Conciliación Inteligente con Movimientos Bancarios
            let movimientoBancario = null;
            if (claverastreo && claverastreo !== 'null') {
                movimientoBancario = await tx.movimientoBancario.findFirst({
                    where: {
                        claveRastreo: claverastreo,
                        OR: [
                            { ticketId: null },
                            { ticketId: newTicket.id }
                        ]
                    }
                });
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
                    concepto: movimientoBancario ? `TICKET ID: ${newTicket.id} / MOV. ID: ${movimientoBancario.id}` : `TICKET ID: ${newTicket.id} / PENDIENTE`,
                    tipoPago: "abono",
                    fechaPago: fechaTicket,
                    saldoAnterior: saldoAnterior,
                    saldoNuevo: saldoNuevo,
                    metodoPago: "BANCARIO",
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
                await tx.movimientoBancario.update({
                    where: { id: movimientoBancario.id },
                    data: {
                        ticketId: newTicket.id,
                        clienteId: cliente.id,
                        fechaIdentificado: new Date()
                    }
                });
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
