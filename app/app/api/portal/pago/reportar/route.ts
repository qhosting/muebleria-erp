import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { base64Image, clientId, contractCode, phone, amount } = await req.json();

    if (!base64Image || !clientId || !contractCode) {
      return NextResponse.json({ error: 'Imagen y datos de contrato requeridos' }, { status: 400 });
    }

    // Crear el registro en el Buzón de Tesorería
    const buzonEntry = await prisma.buzonTesoreria.create({
      data: {
        telefono: phone || 'PORTAL_CLIENTE',
        remitente: 'PORTAL_CLIENTE',
        tipo: 'PAGO_REPORTADO',
        monto: amount ? Number(amount) : null,
        base64Data: base64Image,
        contractId: contractCode, // Usamos el código del contrato (ej. DQ...)
        estado: 'PENDIENTE',
        metadata: {
          origen: 'PORTAL_CLIENTE',
          clientId: clientId,
          fechaReporte: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Comprobante enviado exitosamente a Tesorería',
      id: buzonEntry.id
    });

  } catch (error) {
    console.error('Portal Payment Report Error:', error);
    return NextResponse.json({ error: 'Error al enviar el comprobante' }, { status: 500 });
  }
}
