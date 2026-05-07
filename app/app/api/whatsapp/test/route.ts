
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

        if (!config.wahaApiUrl) {
            return NextResponse.json({ error: 'URL de WAHA API no configurada' }, { status: 400 });
        }

        const sessionsToTest = [];
        
        // 1. Sesión Principal / Global
        sessionsToTest.push({
            apiUrl: config.wahaApiUrl,
            session: config.wahaSessionName || 'default',
            apiKey: config.wahaApiKey,
            label: 'Principal'
        });

        // 2. Sesión Leads (solo si es diferente a la principal)
        if (config.leadsWahaSession && config.leadsWahaSession !== config.wahaSessionName) {
            sessionsToTest.push({
                apiUrl: config.leadsWahaApiUrl || config.wahaApiUrl,
                session: config.leadsWahaSession,
                apiKey: config.leadsWahaApiKey || config.wahaApiKey,
                label: 'Ventas/Leads'
            });
        }

        // 3. Sesión Tesorería (solo si es diferente a la principal)
        if (config.tesoreriaWahaSession && config.tesoreriaWahaSession !== config.wahaSessionName) {
            sessionsToTest.push({
                apiUrl: config.tesoreriaWahaApiUrl || config.wahaApiUrl,
                session: config.tesoreriaWahaSession,
                apiKey: config.tesoreriaWahaApiKey || config.wahaApiKey,
                label: 'Tesorería'
            });
        }

        const results = [];
        const errors = [];

        for (const s of sessionsToTest) {
            try {
                const messageBody = `✅ Prueba de conexión WAHA (${s.label}) exitosa.\nSesión: ${s.session}`;
                await sendWahaMessage(s, phone, messageBody);
                results.push(s.label);
            } catch (err: any) {
                console.error(`Error probando sesión ${s.label}:`, err.message);
                errors.push(`${s.label}: ${err.message}`);
            }
        }

        if (errors.length > 0 && results.length === 0) {
            return NextResponse.json({ 
                error: 'Fallaron todas las pruebas de conexión', 
                details: errors 
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Pruebas completadas. Éxito en: ${results.join(', ')}`,
            failed: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Error en API de test de WhatsApp:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
