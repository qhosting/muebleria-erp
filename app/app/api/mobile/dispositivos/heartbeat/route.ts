import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, latitud, longitud } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Actualizar ubicación del dispositivo
    // Usamos upsert para registrarlo si es la primera vez que se reporta (aunque debería estar registrado)
    const device = await (prisma.dispositivoAutorizado as any).upsert({
      where: { id: deviceId },
      update: {
        latitud: latitud?.toString(),
        longitud: longitud?.toString(),
        lastLogin: new Date(), // Actualizamos como "última actividad"
      },
      create: {
        id: deviceId,
        latitud: latitud?.toString(),
        longitud: longitud?.toString(),
        isAuthorized: false, // Por defecto no autorizado si es nuevo
        lastLogin: new Date(),
      }
    });

    return NextResponse.json({ success: true, authorized: device.isAuthorized });
  } catch (error) {
    console.error('Error in heartbeat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
