
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, otpCode } = body;

    if (!deviceId || !otpCode) {
      return NextResponse.json({ error: 'Device ID y código son requeridos' }, { status: 400 });
    }

    // Buscar el dispositivo por ID y OTP
    const device = await prisma.dispositivoAutorizado.findFirst({
      where: {
        id: deviceId,
        otpCode: otpCode,
        otpExpires: {
          gte: new Date()
        }
      }
    });

    if (!device) {
      return NextResponse.json({ error: 'Código de activación inválido o expirado' }, { status: 400 });
    }

    // Vincular el dispositivo al usuario de la sesión y autorizarlo
    const updatedDevice = await prisma.dispositivoAutorizado.update({
      where: { id: deviceId },
      data: {
        userId: (session.user as any).id,
        isAuthorized: true,
        otpCode: null, // Limpiar el código usado
        otpExpires: null,
        lastLogin: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Dispositivo vinculado y autorizado exitosamente',
      device: updatedDevice
    });
  } catch (error) {
    console.error('Error linking device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
