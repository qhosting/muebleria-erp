
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
  }

  try {
    const device = await prisma.dispositivoAutorizado.findUnique({
      where: { id: deviceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!device) {
      return NextResponse.json({ 
        status: 'UNKNOWN',
        message: 'Dispositivo no registrado' 
      });
    }

    if (!device.isAuthorized) {
      return NextResponse.json({ 
        status: 'PENDING',
        message: 'Dispositivo pendiente de autorización',
        deviceName: device.nombre
      });
    }

    return NextResponse.json({ 
      status: 'AUTHORIZED',
      device: {
        id: device.id,
        nombre: device.nombre,
        user: device.user
      }
    });
  } catch (error) {
    console.error('Error checking device status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Registra un intento de vinculación de un nuevo dispositivo
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nombre, modelo, sistemaOperativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const device = await prisma.dispositivoAutorizado.upsert({
      where: { id },
      update: {
        nombre: nombre || undefined,
        modelo: modelo || undefined,
        sistemaOperativo: sistemaOperativo || undefined,
      },
      create: {
        id,
        nombre: nombre || 'Dispositivo Desconocido',
        modelo,
        sistemaOperativo,
        isAuthorized: false,
      }
    });

    return NextResponse.json({ 
      status: device.isAuthorized ? 'AUTHORIZED' : 'PENDING',
      device 
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
