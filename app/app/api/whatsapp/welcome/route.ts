
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendWahaMessage, WahaConfig } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { clientes } = await req.json();

        if (!Array.isArray(clientes) || clientes.length === 0) {
            return NextResponse.json({ error: 'Lista de clientes vacía' }, { status: 400 });
        }

        // Obtener configuración de WAHA
        const configRecord = await prisma.configuracionSistema.findUnique({
            where: { clave: 'sistema' }
        });

        if (!configRecord) {
            return NextResponse.json({ error: 'Configuración de sistema no encontrada' }, { status: 500 });
        }

        const notificaciones = configRecord.notificaciones as any;

        if (!notificaciones.whatsappEnabled) {
            return NextResponse.json({ error: 'WhatsApp no está habilitado en la configuración' }, { status: 400 });
        }

        const wahaConfig: WahaConfig = {
            apiUrl: notificaciones.wahaApiUrl || process.env.WAHA_API_URL,
            session: notificaciones.wahaSession || process.env.WAHA_SESSION || 'default',
            apiKey: notificaciones.wahaApiKey || process.env.WAHA_API_KEY
        };

        if (!wahaConfig.apiUrl) {
            return NextResponse.json({ error: 'URL de WAHA API no configurada' }, { status: 400 });
        }

        let sentCount = 0;
        let failedCount = 0;
        const results = [];

        // Procesar mensajes con un pequeño delay
        for (const cliente of clientes) {
            if (!cliente.telefono) {
                failedCount++;
                continue;
            }

            const isDQ = cliente.codigoCliente?.startsWith('DQ');

            // Plantilla de mensaje (DQ por ahora, DP placeholder)
            const template = `¡Bienvenid@ a Colchones DASO! 🎉 Agradecemos tu preferencia.

Para tu comodidad, aquí te compartimos los datos para realizar tus pagos de forma segura.

*Datos para Pago por SPEI o Depósito en Efectivo*
- *Titular:* GRUPO MUEBLERO DASO
- *Banco:* SANTANDER
- *Tarjeta:* 5579089000121858
- *Número de Cuenta:* 65505732541
- *CLABE Interbancaria (SPEI):* \`014680655057325418\`
- ❗️ *Referencia o Concepto:* \`${cliente.codigoCliente}\` *(Es muy importante que uses siempre tu número de cuenta asignado)*

*¿Qué Hacer Después de Pagar?*
📲 Envía una foto de tu comprobante de pago por WhatsApp al número:
*4424793320*

⚠️ *Nota Importante sobre tu Comprobante*
- *Para transferencias (SPEI):* Asegúrate de que la *Clave de Rastreo* sea completamente visible en la imagen.
- *Para depósitos en efectivo:* Envía una foto del *ticket completo*, sin tachaduras ni alteraciones.`;

            try {
                // Delay de 5 segundos entre mensajes (solo si es más de uno)
                if (sentCount > 0) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                await sendWahaMessage(wahaConfig, cliente.telefono, template);
                sentCount++;
                results.push({ cliente: cliente.codigoCliente, status: 'sent' });
            } catch (error: any) {
                console.error(`Error enviando a ${cliente.codigoCliente}:`, error.message);
                failedCount++;
                results.push({ cliente: cliente.codigoCliente, status: 'failed', error: error.message });
            }
        }

        return NextResponse.json({
            success: true,
            sent: sentCount,
            failed: failedCount,
            results
        });

    } catch (error: any) {
        console.error('Error en API de bienvenida:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
