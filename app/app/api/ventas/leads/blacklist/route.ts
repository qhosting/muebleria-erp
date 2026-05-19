import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sistema' }
    });

    const notif = (config?.notificaciones as any) || {};
    const blacklistRaw = notif.whatsappBlacklist || '';
    const blacklist = blacklistRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

    return NextResponse.json({ blacklist });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
    }

    // 1. Obtener config actual
    let config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sistema' }
    });

    if (!config) {
      config = await prisma.configuracionSistema.create({
        data: {
          clave: 'sistema',
          empresa: {},
          cobranza: {},
          notificaciones: { whatsappBlacklist: '' },
          sincronizacion: {},
          impresion: {}
        } as any
      });
    }

    const notif = (config.notificaciones as any) || {};
    const blacklistRaw = notif.whatsappBlacklist || '';
    let blacklist = blacklistRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

    // Normalizar número y ver si ya existe
    const cleanPhone = phone.trim();
    const exists = blacklist.includes(cleanPhone);

    if (exists) {
      blacklist = blacklist.filter((p: string) => p !== cleanPhone);
    } else {
      blacklist.push(cleanPhone);
    }

    const updatedNotif = {
      ...notif,
      whatsappBlacklist: blacklist.join(', ')
    };

    await prisma.configuracionSistema.update({
      where: { clave: 'sistema' },
      data: {
        notificaciones: updatedNotif
      } as any
    });

    return NextResponse.json({ 
      success: true, 
      blacklisted: !exists,
      blacklist 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
