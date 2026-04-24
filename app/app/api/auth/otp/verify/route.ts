
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Teléfono y código requeridos' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Buscar el código más reciente no expirado
    const verification = await (prisma as any).otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        code,
        verified: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });
    }

    // Marcar como verificado
    await (prisma as any).otpVerification.update({
      where: { id: verification.id },
      data: { verified: true }
    });

    // Buscar quién es el dueño del teléfono para retornar su perfil
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } },
      select: { id: true, nombreCompleto: true, codigoCliente: true }
    });

    const usuario = await prisma.user.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } },
      select: { id: true, name: true, role: true, email: true }
    });

    return NextResponse.json({
      success: true,
      type: usuario ? 'user' : 'client',
      data: usuario || cliente
    });

  } catch (error: any) {
    console.error('Error OTP Verify:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
