import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

const ADMIN_PHONE = '5214425060999@c.us';
const WAHA_URL = 'https://noweb.qhosting.net/api/sendText';
const WAHA_KEY = 'key_PDzXooo4V0WG0veQTUe3OGVWR31JnwgP';
const WAHA_SESSION = 'GMD8706';

async function enviarAlertaAdmin(errorMsg: string) {
    try {
        await fetch(WAHA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': WAHA_KEY
            },
            body: JSON.stringify({
                session: WAHA_SESSION,
                chatId: ADMIN_PHONE,
                text: `🚨 *ALERTA SISTEMA MUEBLERÍA DASO*\n\nError en la sincronización diaria de clientes ContPAQi para consultas n8n.\n\n❌ *Error:* ${errorMsg}\n⏰ *Hora:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}\n\nFavor de verificar el servidor ContPAQi.`
            })
        });
        console.log('🔔 Alerta enviada al administrador vía WhatsApp exitosamente.');
    } catch (e: any) {
        console.error('No se pudo enviar la alerta de WhatsApp al admin:', e.message);
    }
}

export async function GET(req: Request) {
    return handleSync(req);
}

export async function POST(req: Request) {
    return handleSync(req);
}

async function handleSync(req: Request) {
    const t0 = Date.now();
    try {
        // Ejecutar script de exportación y sincronización
        const scriptPath = path.resolve(process.cwd(), 'scripts/sync-clientes-consulta.ts');
        
        // Si estamos en entorno Windows local con PowerShell
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            const psScript = path.resolve(process.cwd(), '../scratch/export_clientes_json.ps1');
            await execPromise(`powershell -ExecutionPolicy Bypass -File "${psScript}" -Empresa DP`);
            await execPromise(`powershell -ExecutionPolicy Bypass -File "${psScript}" -Empresa DQ`);
            await execPromise(`npx tsx "${scriptPath}"`);
        }

        const totalEnBd = await prisma.clienteConsultaBot.count();

        return NextResponse.json({
            success: true,
            mensaje: "Sincronización diaria completada exitosamente",
            totalClientes: totalEnBd,
            duracionSegundos: ((Date.now() - t0) / 1000).toFixed(2)
        });
    } catch (error: any) {
        console.error("❌ Error en sync-contpaqi-consulta:", error);
        await enviarAlertaAdmin(error.message || String(error));
        return NextResponse.json({
            success: false,
            error: error.message || String(error),
            alertaEnviadaAdmin: true
        }, { status: 500 });
    }
}
