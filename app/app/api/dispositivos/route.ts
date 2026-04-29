
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Middleware simple para asegurar que solo admin acceda
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return false;
  }
  return true;
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const dispositivos = await prisma.dispositivoAutorizado.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(dispositivos);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generar OTP para un dispositivo o actualizar su estado
 */
export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { deviceId, action } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    if (action === 'GENERATE_OTP') {
      // Generar código de 6 dígitos
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date();
      expires.setMinutes(expires.getMinutes() + 30); // 30 min de validez

      const device = await prisma.dispositivoAutorizado.update({
        where: { id: deviceId },
        data: {
          otpCode: otp,
          otpExpires: expires
        }
      });

      return NextResponse.json({ otp, expires: device.otpExpires });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (error) {
    console.error('Error in device POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Actualizar estado (autorizar/bloquear)
 */
export async function PUT(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, isAuthorized, nombre } = body;

    const device = await prisma.dispositivoAutorizado.update({
      where: { id },
      data: {
        isAuthorized,
        nombre
      }
    });

    return NextResponse.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Eliminar registro de dispositivo
 */
export async function DELETE(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.dispositivoAutorizado.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
