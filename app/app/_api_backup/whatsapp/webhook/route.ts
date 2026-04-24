
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { detectIntent } from '@/lib/ai-service';
import { sendWahaMessage, getWahaConfig, WahaConfig } from '@/lib/whatsapp';

// Cast prisma to any to handle new models not yet recognized by stale TS cache
const db = prisma as any;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // WAHA Webhook Payload structure
        const { event, payload, session } = body;

        // Solo procesamos mensajes entrantes que no sean nuestros
        if (event !== 'message' || !payload || payload.fromMe) {
            return NextResponse.json({ status: 'ignored' });
        }

        const from = payload.from.split('@')[0]; // Limpiar @c.us
        const messageBody = payload.body;

        if (!messageBody) {
            return NextResponse.json({ status: 'no_body' });
        }

        console.log(`📩 Mensaje recibido de ${from}: ${messageBody}`);

        // 1. Guardar mensaje del usuario en el historial
        await db.leadChat.create({
            data: {
                telefono: from,
                rol: 'user',
                mensaje: messageBody,
            }
        });

        // 2. Obtener historial reciente (últimos 10 mensajes)
        const history = await db.leadChat.findMany({
            where: { telefono: from },
            orderBy: { createdAt: 'asc' },
            take: 10
        });

        const historyText = history
            .map((h: any) => `${h.rol === 'user' ? 'Cliente' : 'Sofía'}: ${h.mensaje}`)
            .join('\n');

        // 3. Detectar intención con IA
        const aiResponse = await detectIntent(historyText, messageBody);

        // 4. Guardar respuesta de la IA en el historial
        await db.leadChat.create({
            data: {
                telefono: from,
                rol: 'assistant',
                mensaje: aiResponse.respuesta,
            }
        });

        // 5. Gestionar el Lead en la base de datos
        let lead = await prisma.lead.findFirst({
            where: { telefono: from }
        });

        const leadData: any = {
            nombre: lead?.nombre || `Prospecto ${from}`,
            telefono: from,
            intencion: aiResponse.intencion,
            urgencia: aiResponse.datos_extraidos.urgencia,
            resumenInterno: aiResponse.resumen_interno,
            respuestaIA: aiResponse.respuesta,
            datosExtraidos: aiResponse.datos_extraidos,
            origen: 'oficina' as const,
            estado: aiResponse.intencion === 'GENERAL' ? 'nuevo' : 'contactado'
        };

        if (lead) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: leadData
            });
        } else {
            lead = await prisma.lead.create({
                data: leadData
            });
        }

        // Vincular los chats al lead si no estaban vinculados
        await db.leadChat.updateMany({
            where: { telefono: from, leadId: null },
            data: { leadId: lead.id }
        });

        // 6. Enviar respuesta por WhatsApp
        const wahaConfig = await getWahaConfig(prisma);

        if (wahaConfig.apiUrl) {
            await sendWahaMessage(wahaConfig, from, aiResponse.respuesta);
            console.log(`🚀 Respuesta enviada a ${from}`);
        } else {
            console.warn('⚠️ WAHA_API_URL no configurada. No se envió respuesta.');
        }

        return NextResponse.json({ 
            status: 'success', 
            intent: aiResponse.intencion,
            leadId: lead.id
        });

    } catch (error: any) {
        console.error('❌ Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
