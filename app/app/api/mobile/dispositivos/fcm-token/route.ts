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
    const { deviceId, fcmToken } = body;

    if (!deviceId || !fcmToken) {
      return NextResponse.json({ error: 'Device ID and FCM Token are required' }, { status: 400 });
    }

    // Actualizar el fcmToken del dispositivo
    await (prisma.dispositivoAutorizado as any).update({
      where: { id: deviceId },
      data: {
        fcmToken,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in saving FCM token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
