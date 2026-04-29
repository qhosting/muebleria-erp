
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendWahaMessage, WahaConfig } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { config, phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Número de teléfono requerido' }, { status: 400 });
        }

        const wahaConfig: WahaConfig = {
            apiUrl: config.wahaApiUrl,
            session: config.wahaSessionName || 'default',
            apiKey: config.wahaApiKey
        };

        if (!wahaConfig.apiUrl) {
            return NextResponse.json({ error: 'URL de WAHA API no configurada' }, { status: 400 });
        }

        const messageBody = '✅ Prueba de conexión de WhatsApp VertexERP exitosa. Si recibes este mensaje, tu configuración es correcta.';

        await sendWahaMessage(wahaConfig, phone, messageBody);

        return NextResponse.json({
            success: true,
            message: 'Mensaje de prueba enviado correctamente'
        });

    } catch (error: any) {
        console.error('Error en API de test de WhatsApp:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
