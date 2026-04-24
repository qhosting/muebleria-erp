
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWahaMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    // Limpiar número
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Verificar si existe como Cliente o como Usuario
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } }
    });

    const usuario = await prisma.user.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } }
    });

    if (!cliente && !usuario) {
      return NextResponse.json({ error: 'Número no registrado en el sistema' }, { status: 404 });
    }

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Guardar en la base de datos
    await (prisma as any).otpVerification.create({
      data: {
        phone: cleanPhone,
        code,
        expiresAt
      }
    });

    // Enviar por WhatsApp
    const wahaConfig = {
      apiUrl: process.env.WAHA_API_URL || '',
      session: process.env.WAHA_SESSION_NAME || 'default',
      apiKey: process.env.WAHA_API_KEY
    };

    if (wahaConfig.apiUrl) {
      const message = `*VertexERP - Código de Verificación*\n\nTu código es: *${code}*\n\nEste código expira en 10 minutos. No lo compartas con nadie.`;
      await sendWahaMessage(wahaConfig, cleanPhone, message);
      return NextResponse.json({ success: true, message: 'Código enviado por WhatsApp' });
    } else {
      console.warn('WAHA_API_URL no configurada. Código generado:', code);
      return NextResponse.json({ 
        success: true, 
        message: 'WAHA no configurado, revisa consola',
        devCode: process.env.NODE_ENV === 'development' ? code : undefined 
      });
    }

  } catch (error: any) {
    console.error('Error OTP Request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
