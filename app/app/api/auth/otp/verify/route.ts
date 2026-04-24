
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Teléfono y código requeridos' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const redisKey = `otp:${cleanPhone}`;

    // 1. Obtener código de Redis
    const savedCode = await redis.get(redisKey);

    if (!savedCode || savedCode !== code) {
      return NextResponse.json({ error: 'Código inválido o expirado' }, { status: 400 });
    }

    // 2. Marcar como verificado (creando una llave de sesión temporal corta si es necesario)
    // O simplemente borrarlo si ya se usó
    await redis.del(redisKey);
    
    // Guardar una marca de "teléfono verificado" por 5 minutos para procesos subsiguientes
    await redis.set(`verified:${cleanPhone}:${code}`, 'true', 'EX', 300);

    // Buscar quién es el dueño del teléfono para retornar su perfil
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } },
      select: { id: true, nombreCompleto: true, codigoCliente: true }
    });

    const usuario = await (prisma.user as any).findFirst({
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
