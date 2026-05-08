
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { detectIntent, extractTicketFromImage } from '@/lib/ai-service';
import { sendWahaMessage, getWahaConfig, getWahaMedia } from '@/lib/whatsapp';

// Cast prisma to any for flexibility with dynamically loaded models/fields
const db = prisma as any;

/**
 * WEBHOOK PRINCIPAL PARA WHATSAPP (WAHA API)
 * Gestiona dos flujos: Tesorería (Pagos) y Oficina (Leads/Ventas)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { event, payload, session } = body;

        // Solo procesamos mensajes entrantes de otros
        if (event !== 'message' || !payload) {
            return NextResponse.json({ status: 'ignored' });
        }

        // 1. DETECCIÓN DE HUMANO: Si el mensaje lo envió el dueño de la cuenta (móvil/web)
        // Pausamos el bot para este cliente específico por 30 minutos usando REDIS
        if (payload.fromMe === true) {
            const to = (payload.to || payload.chatId || '').split('@')[0];
            if (to && to.length > 5 && !to.includes('status')) {
                try {
                    // Guardar en Redis con expiración de 30 minutos (1800 segundos)
                    await redis.set(`bot_pause:${to}`, 'true', 'EX', 1800);
                    console.log(`✋ [${session}] Humano detectado respondiendo a ${to}. Bot pausado por 30 min (Redis).`);
                } catch (redisError) {
                    console.error('❌ Error guardando pausa en Redis:', redisError);
                }
            }
            return NextResponse.json({ status: 'human_detected_pause' });
        }

        let from = payload.from.split('@')[0]; // Número de teléfono sin @c.us
        
        // 2. Fallbacks de identificación (NOWEB / LID)
        const remoteJidAlt = payload._data?.key?.remoteJidAlt;
        if (remoteJidAlt) {
            from = remoteJidAlt.split('@')[0];
        } else if (from === '183785962352805' || from.includes('lid')) {
            const alternate = (payload.author || payload.participant || payload.chatId || '').split('@')[0];
            if (alternate && !alternate.includes('183785962352805') && !alternate.includes('lid') && alternate.length > 5) {
                from = alternate;
            }
        }

        // 3. VERIFICAR SI EL BOT ESTÁ PAUSADO PARA ESTE NÚMERO (Usando Redis)
        try {
            const isPaused = await redis.get(`bot_pause:${from}`);
            if (isPaused) {
                console.log(`⏳ [${session}] Bot pausado para ${from} vía Redis (Humano atendiendo).`);
                return NextResponse.json({ status: 'bot_paused' });
            }
        } catch (redisError) {
            console.error('❌ Error consultando pausa en Redis:', redisError);
        }

        // Obtener configuración global de notificaciones
        const configRecord = await prisma.configuracionSistema.findUnique({
            where: { clave: 'sistema' }
        });
        const notif = (configRecord?.notificaciones as any) || {};

        // 4. Verificar Blacklist dinámica (configurada en dashboard)
        const blacklistRaw = notif.whatsappBlacklist || '';
        const blacklist = blacklistRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
        
        if (blacklist.some((id: string) => from === id || payload.from.includes(id))) {
            console.log(`🚫 [${session}] Mensaje ignorado por Lista Negra: ${from} / ${payload.from}`);
            return NextResponse.json({ status: 'ignored_blacklist' });
        }

        // 2. Ignorar Grupos (Opcional: puedes añadir una condición para permitir ciertos grupos)
        if (payload.from.endsWith('@g.us')) {
            console.log(`👥 [${session}] Ignorando mensaje de grupo: ${payload.from}`);
            return NextResponse.json({ status: 'ignored_group' });
        }

        const messageBody = (payload.body || '').trim();
        const messageType = payload.type; // 'chat', 'image', etc.

        // Función para normalizar números (quitar prefijos de México 52/521)
        const normalize = (num: string) => num.replace(/^521/, '52').replace(/\D/g, '');
        const fromNorm = normalize(from);

        // Blacklist de seguridad interna (Anti-bucle)
        const botNumbers = [
            '524272061791', 
            '524429800772', 
            '183785962352805', // WABA ID detectado en logs
            '5214429800772'
        ];
        
        if (botNumbers.some(bn => normalize(bn) === fromNorm || bn === from)) {
            console.log(`ℹ️ [${session}] Anti-bucle: El bot ${from} intentó hablarse a sí mismo. Ignorado.`);
            return NextResponse.json({ status: 'ignored_self' });
        }

        // DEBUG: Ver todos los mensajes para diagnosticar el ID inusual
        console.log(`📩 [${session}] Mensaje de ${from} (${payload.from}). Body: ${messageBody.slice(0, 50)}`);
        if (from === '183785962352805' || from.length > 15) {
            console.log(`🔍 [DEBUG] PAYLOAD COMPLETO (ID INUSUAL):`, JSON.stringify(payload, null, 2));
        }

        // RUTA 1: TESORERÍA (PROCESAMIENTO DE PAGOS)
        // Solo si la sesión es específicamente de tesorería
        const isTesoreria = session === 'tesoreria' || 
                           (notif.tesoreriaWahaSession && session === notif.tesoreriaWahaSession) ||
                           (process.env.WAHA_SESSION_TESORERIA && session === process.env.WAHA_SESSION_TESORERIA);

        if (isTesoreria) {
            return await handleTesoreria(from, payload, session, notif.tesoreriaAgentName || 'Asistente de Tesorería');
        }

        // RUTA 2: OFICINA (LEADS / VENTAS / SOFÍA)
        return await handleOficina(from, payload, session, notif.leadsAgentName || 'Sofía (Ventas)', notif.openaiApiKey);

    } catch (error: any) {
        console.error('❌ Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Lógica para BotTesoreria: Recepción de tickets y conciliación
 */
async function handleTesoreria(from: string, payload: any, session: string, agentName: string) {
    const config = await getWahaConfig(prisma, 'tesoreria');
    const welcomeMsg = `Hola! 👋 Soy ${agentName}. Para registrar un pago, por favor envía la *foto de tu comprobante*.`;

    // 1. Identificación Automática del Cliente por Número de Teléfono (Busqueda robusta)
    const normalize = (num: string) => num.replace(/^521/, '52').replace(/\D/g, '');
    const fromNorm = normalize(from);
    const last10 = fromNorm.slice(-10);

    const cliente = await prisma.cliente.findFirst({
        where: {
            OR: [
                { telefono: from },
                { telefono: fromNorm },
                { telefono: { contains: last10 } }
            ]
        }
    });

    // 2. Manejo de IMÁGENES (Comprobantes de pago)
    if (payload.type === 'image' || payload.hasMedia) {
        // En WAHA, el caption puede venir en 'caption' o en 'body'
        let caption = (payload.caption || '').trim().toUpperCase();
        if (!caption && payload.body && payload.body.length < 100) {
            caption = payload.body.trim().toUpperCase();
        }

        const isContractId = /^(DQ|DP)\d{7}$/.test(caption);
        let contractId = isContractId ? caption : (cliente?.codigoCliente || null);
        
        // El contenido de la imagen (Base64)
        let imageBase64 = payload.media?.data || (payload.body?.length > 500 ? payload.body : null);

        // Si no hay data pero hay URL, intentamos descargarla
        if (!imageBase64 && payload.media?.url) {
            console.log(`📥 [Media] Intentando descargar imagen desde URL: ${payload.media.url}`);
            imageBase64 = await getWahaMedia(config, payload.media.url);
        }

        if (!imageBase64) {
            console.warn(`⚠️ [${session}] Imagen recibida sin datos Base64. (Body length: ${payload.body?.length || 0})`);
            await sendWahaMessage(config, from, "⚠️ No pude procesar la imagen. Por favor, asegúrate de enviarla como *Foto* y no como archivo, o intenta enviarla de nuevo.");
            return NextResponse.json({ status: 'missing_media_data' });
        }

        // Generar hash para evitar duplicados (Cola de Tickets)
        const imageHash = crypto.createHash('md5').update(imageBase64).digest('hex');

        // 1. Verificar duplicados en el Buzón (Evita re-procesar el mismo comprobante)
        const existeBuzon = await db.buzonTesoreria.findUnique({
            where: { hash: imageHash }
        });

        if (existeBuzon) {
            await sendWahaMessage(config, from, "⚠️ Este comprobante ya ha sido recibido y está en proceso de validación. No es necesario enviarlo de nuevo.");
            return NextResponse.json({ status: 'duplicate_in_queue' });
        }

        // Intentamos procesar con IA para ver si el contrato está DENTRO de la imagen
        try {
            await sendWahaMessage(config, from, "⏳ Analizando comprobante... un momento por favor.");
        } catch (msgError: any) {
            console.warn('⚠️ No se pudo enviar mensaje de espera a WAHA:', msgError.message);
        }
        
        const extracted = await extractTicketFromImage(imageBase64);

        // Si la IA encontró un contrato y no teníamos uno, lo usamos
        if (!contractId && extracted.contrato) {
            contractId = extracted.contrato.trim().toUpperCase();
            console.log(`🔍 Contrato detectado por IA dentro de la imagen: ${contractId}`);
        }

        // 2. Registrar en la Cola (Buzón de Tesorería) para historial de 30 días
        const buzonEntry = await db.buzonTesoreria.create({
            data: {
                telefono: from,
                hash: imageHash,
                base64Data: imageBase64,
                contractId: contractId,
                monto: parseFloat(extracted.monto) || 0,
                referencia: extracted.referencia,
                fecha: extracted.fecha ? new Date(extracted.fecha) : new Date(),
                metadata: extracted,
                estado: 'PENDIENTE'
            }
        });

        // Si aún no hay contrato identificado, guardamos como pendiente
        if (!contractId || !/^(DQ|DP)\d{7}$/.test(contractId)) {
            await db.ticketPendiente.upsert({
                where: { remitente: from },
                update: { 
                    base64Data: imageBase64,
                    tipoArchivo: payload.media?.mimetype || 'image/jpeg',
                    updatedAt: new Date()
                },
                create: {
                    remitente: from,
                    base64Data: imageBase64,
                    tipoArchivo: payload.media?.mimetype || 'image/jpeg'
                }
            });

            await sendWahaMessage(config, from, "✅ Imagen recibida. No logré identificar tu número de contrato automáticamente. 🧐 Por favor, envía ahora tu *Número de Cliente* (ej: DQ1234567) para procesar tu pago.");
            return NextResponse.json({ status: 'pending_contract' });
        }

        // Si tenemos contrato (por caption, por teléfono o por IA), finalizamos el proceso
        const response = await finalizeTicketCreation(from, extracted, contractId, config);

        // Si el ticket se creó con éxito, marcamos la entrada del buzón como procesada
        if (response && (response.ok || response.status === 200)) {
            await db.buzonTesoreria.update({
                where: { id: buzonEntry.id },
                data: { estado: 'PROCESADO' }
            });
        }

        return response;
    }

    // 3. Manejo de TEXTO (Posible número de contrato para un pendiente)
    const text = (payload.body || '').trim().toUpperCase();
    const isContractId = /^(DQ|DP)\d{7}$/.test(text);

    if (isContractId) {
        const pendiente = await db.ticketPendiente.findUnique({
            where: { remitente: from }
        });

        if (pendiente) {
            const extracted = await extractTicketFromImage(pendiente.base64Data);
            const response = await finalizeTicketCreation(from, extracted, text, config);
            // Limpiar el pendiente una vez procesado
            await db.ticketPendiente.delete({ where: { remitente: from } });
            return response;
        }
    }

    // 4. Respuesta por defecto o seguimiento
    if (isContractId) {
        // Si envió un contrato pero no hay imagen pendiente
        await sendWahaMessage(config, from, `✅ He recibido el contrato *${text}*. Ahora, por favor envía la *foto de tu comprobante* para completar el registro.`);
        return NextResponse.json({ status: 'waiting_receipt_after_contract' });
    }

    // Respuesta de bienvenida general (solo si no es imagen ni contrato)
    await sendWahaMessage(config, from, welcomeMsg);
    return NextResponse.json({ status: 'waiting_receipt' });
}

/**
 * Finaliza la creación del ticket y la conciliación una vez obtenidos los datos y el contrato
 */
async function finalizeTicketCreation(from: string, extracted: any, contractId: string, config: any) {
    try {
        // Buscar el ID interno del cliente por su código
        const clienteRecord = await prisma.cliente.findUnique({
            where: { codigoCliente: contractId }
        });

        if (!clienteRecord) {
            await sendWahaMessage(config, from, `❌ No encontré el cliente con contrato *${contractId}*. Por favor verifica el número.`);
            return NextResponse.json({ status: 'client_not_found' });
        }

        // Crear el Ticket en la base de datos
        const ticket = await prisma.ticket.create({
            data: {
                clienteId: clienteRecord.id,
                monto: parseFloat(extracted.monto) || 0,
                referencia: extracted.referencia,
                folio: extracted.folio,
                fecha: extracted.fecha ? new Date(extracted.fecha) : new Date(),
                claveRastreo: extracted.claverastreo,
                remitente: from,
                concepto: 'TICKET WHATSAPP',
                conciliado: false
            }
        });

        // Intentar Conciliación Inteligente
        const movimiento = await prisma.movimientoBancario.findFirst({
            where: {
                OR: [
                    ...(extracted.claverastreo ? [{ claveRastreo: extracted.claverastreo }] : []),
                    { 
                        abono: parseFloat(extracted.monto),
                        fechaOperacion: extracted.fecha ? new Date(extracted.fecha) : undefined,
                        ticketId: null
                    }
                ]
            }
        });

        let mensajeFinal = `✅ ¡Comprobante EN PROCESO de VALIDACIÓN!\n\n📌 *Detalles del Ticket*\n- 🆔 ID: ${ticket.id}\n- 📄 Contrato: ${contractId}\n- 💰 Monto: $${extracted.monto}\n- 🔢 Referencia: ${extracted.referencia || 'N/A'}`;
        
        if (movimiento) {
            // Si hay coincidencia, conciliar inmediatamente y CREAR EL PAGO
            await prisma.$transaction(async (tx) => {
                // 1. Vincular movimiento y ticket
                await tx.movimientoBancario.update({
                    where: { id: movimiento.id },
                    data: { ticketId: ticket.id, clienteId: clienteRecord.id, fechaIdentificado: new Date() }
                });

                // 2. Marcar ticket como conciliado
                await tx.ticket.update({
                    where: { id: ticket.id },
                    data: { conciliado: true }
                });

                // 3. CREAR EL PAGO AUTOMÁTICO (BOT)
                const saldoAnterior = parseFloat(clienteRecord.saldoActual.toString());
                const montoPago = parseFloat(extracted.monto);
                const saldoNuevo = Math.max(0, saldoAnterior - montoPago);

                await tx.pago.create({
                    data: {
                        clienteId: clienteRecord.id,
                        cobradorId: clienteRecord.cobradorAsignadoId || 'system', // O un ID de sistema
                        ticketId: ticket.id,
                        monto: montoPago,
                        concepto: `PAGO AUTOMÁTICO BOT (WHATSAPP) - Ref: ${extracted.referencia || 'N/A'}`,
                        tipoPago: 'regular',
                        fechaPago: extracted.fecha ? new Date(extracted.fecha) : new Date(),
                        metodoPago: 'bancario_bot',
                        saldoAnterior,
                        saldoNuevo,
                        sincronizado: true
                    }
                });

                // 4. Actualizar saldo del cliente
                await tx.cliente.update({
                    where: { id: clienteRecord.id },
                    data: { saldoActual: saldoNuevo }
                });
            });
            
            mensajeFinal += `\n\n⚡ *CONCILIADO AUTOMÁTICAMENTE* ⚡\n💰 Pago aplicado a tu saldo.`;
        } else {
            mensajeFinal += `\n\n⚡ *PENDIENTE DE CONCILIACIÓN BANCARIA* ⚡`;
        }

        try {
            await sendWahaMessage(config, from, mensajeFinal);
        } catch (msgError: any) {
            console.error('❌ No se pudo enviar mensaje final a WAHA:', msgError.message);
        }
        return NextResponse.json({ status: 'success', ticketId: ticket.id });

    } catch (error: any) {
        console.error("Error finalizando ticket:", error);
        try {
            await sendWahaMessage(config, from, "❌ Lo siento, hubo un error al procesar la información. Por favor intenta de nuevo o contacta a soporte.");
        } catch (msgError: any) {
            console.error('❌ No se pudo enviar mensaje de error a WAHA:', msgError.message);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Lógica para BotOficina: Sofia AI y Leads
 */
async function handleOficina(from: string, payload: any, session: string, agentName: string, openaiKey?: string) {
    const messageBody = payload.body || '';
    if (!messageBody) return NextResponse.json({ status: 'no_body' });

    // 1. Guardar mensaje del usuario en el historial
    await db.leadChat.create({
        data: { telefono: from, rol: 'user', mensaje: messageBody }
    });

    // 2. Obtener historial reciente
    const history = await db.leadChat.findMany({
        where: { telefono: from },
        orderBy: { createdAt: 'asc' },
        take: 10
    });

    const historyText = history
        .map((h: any) => `${h.rol === 'user' ? 'Cliente' : agentName}: ${h.mensaje}`)
        .join('\n');

    // 3. Detectar intención con IA
    const aiResponse = await detectIntent(historyText, messageBody, agentName, openaiKey);

    // 4. Guardar respuesta de la IA
    const chat = await db.leadChat.create({
        data: { telefono: from, rol: 'assistant', mensaje: aiResponse.respuesta }
    });

    // 5. Gestionar el Lead
    let lead = await db.lead.findFirst({ where: { telefono: from } });
    
    if (!lead) {
        lead = await db.lead.create({
            data: {
                nombre: `Prospecto ${from}`,
                telefono: from,
                estado: 'nuevo',
                notas: `Captado por IA (${agentName}). Interés: ${aiResponse.datos_extraidos.producto || 'Ventas General'}`,
                vendedorId: null
            }
        });

        // NOTIFICAR A ADMINISTRADORES POR PUSH
        try {
            const { notifyByRole } = await import('@/lib/notifications');
            await notifyByRole('admin', '🔥 Nuevo Lead Captado', `Un nuevo cliente (${from}) está interesado en: ${aiResponse.datos_extraidos.producto || 'productos'}.`, '/dashboard/ventas');
        } catch (nError) {
            console.error('Error enviando notificación de lead:', nError);
        }
    } else {
        // Actualizar notas con el nuevo interés si aplica
        await db.lead.update({
            where: { id: lead.id },
            data: {
                notas: `${lead.notas}\n[${new Date().toLocaleDateString()}] Nuevo contacto: ${aiResponse.datos_extraidos.producto || 'Conversación'}`
            }
        });
    }

    // Vincular chat al lead
    await db.leadChat.updateMany({ 
        where: { telefono: from, leadId: null }, 
        data: { leadId: lead.id } 
    });

    // 6. Enviar respuesta por WhatsApp
    const wahaConfig = await getWahaConfig(prisma, 'leads');
    
    // Si la sesión del webhook es diferente a la de leads configurada, 
    // intentamos usar la sesión que recibió el mensaje para responder
    if (session && session !== wahaConfig.session) {
        console.log(`🔄 [Oficina] Usando sesión de origen (${session}) en lugar de la configurada (${wahaConfig.session})`);
        wahaConfig.session = session;
    }

    if (wahaConfig.apiUrl) {
        try {
            await sendWahaMessage(wahaConfig, from, aiResponse.respuesta);
        } catch (msgError: any) {
            console.error('❌ No se pudo enviar respuesta de Sofia a WAHA:', msgError.message);
        }
    }

    return NextResponse.json({ status: 'success', intent: aiResponse.intencion });
}

