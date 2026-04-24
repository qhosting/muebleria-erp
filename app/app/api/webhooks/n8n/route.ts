import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
        if (!contrato || !monto) {
            return NextResponse.json({ error: "Contrato y monto son requeridos" }, { status: 400 });
        }

        // 2. Buscar Cliente
        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente: contrato.toUpperCase() }
        });

        if (!cliente) {
            return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
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
            return NextResponse.json({
                message: "Ticket ya existe",
                ticketId: existingTicket.id,
                ya_existe: true
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

        // 5. Crear Ticket y eliminar de pendientes si existe
        const result = await prisma.$transaction(async (tx) => {
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

            // Si fue una resolución, eliminamos el pendiente
            if (remitente) {
                await tx.ticketPendiente.deleteMany({
                    where: { remitente }
                });
            }

            return newTicket;
        });

        return NextResponse.json({
            message: "Ticket registrado correctamente",
            ticketId: result.id,
            ya_existe: false
        });

    } catch (error: any) {
        console.error("Error en Webhook n8n:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
