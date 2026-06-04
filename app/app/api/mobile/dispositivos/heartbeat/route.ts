import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, latitud, longitud, nombre, modelo, sistemaOperativo } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Actualizar ubicación e información del dispositivo
    const device = await (prisma.dispositivoAutorizado as any).upsert({
      where: { id: deviceId },
      update: {
        latitud: latitud?.toString() || undefined,
        longitud: longitud?.toString() || undefined,
        nombre: nombre || undefined,
        modelo: modelo || undefined,
        sistemaOperativo: sistemaOperativo || undefined,
        lastLogin: new Date(), // Actualizamos como "última actividad"
      },
      create: {
        id: deviceId,
        nombre: nombre || 'Dispositivo Móvil',
        modelo: modelo || 'Desconocido',
        sistemaOperativo: sistemaOperativo || 'Android/iOS',
        latitud: latitud?.toString() || null,
        longitud: longitud?.toString() || null,
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
