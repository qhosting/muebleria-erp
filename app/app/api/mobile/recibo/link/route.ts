import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTemporaryReceiptToken } from '@/lib/receipt-token';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const pagoId = searchParams.get('pagoId');

        if (!pagoId) {
            return NextResponse.json({ error: 'Falta el parámetro pagoId' }, { status: 400 });
        }

        const token = generateTemporaryReceiptToken(pagoId);
        
        // Obtener el protocolo y host para armar la URL pública
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        const host = request.headers.get('host') || 'erp.mueblesdaso.com';
        const baseUrl = `${protocol}://${host}`;
        
        const shareUrl = `${baseUrl}/public/recibo/${token}`;

        return NextResponse.json({ shareUrl });
    } catch (error) {
        console.error('Error al generar enlace temporal de recibo:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
