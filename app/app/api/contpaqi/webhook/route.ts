
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * WEBHOOK PARA RECIBIR NOTIFICACIONES DE CONTPAQI
 * Eventos soportados: documento.creado, cliente.actualizado, etc.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const event = request.headers.get('X-Webhook-Event');

        console.log(`📡 Webhook Contpaqi recibido: ${event}`, body);

        // 1. Procesar según el tipo de evento
        switch (event) {
            case 'documento.creado':
                await handleDocumentoCreado(body);
                break;
            case 'cliente.actualizado':
                await handleClienteActualizado(body);
                break;
            default:
                console.warn(`⚠️ Evento no soportado: ${event}`);
        }

        return NextResponse.json({ status: 'received' });

    } catch (error: any) {
        console.error('❌ Contpaqi Webhook Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function handleDocumentoCreado(data: any) {
    // Ejemplo: Si se crea una factura en Contpaqi, podemos marcar un pedido como facturado en VertexERP
    console.log('Procesando documento creado:', data.id, data.codigoConcepto);
}

async function handleClienteActualizado(data: any) {
    // Ejemplo: Actualizar el saldo o datos del cliente en VertexERP
    const { codigo, nombre, saldo } = data;
    
    await prisma.cliente.updateMany({
        where: { codigoCliente: codigo },
        data: {
            nombreCompleto: nombre,
            saldoActual: saldo
        }
    });
}
