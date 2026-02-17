
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obtener la configuración actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Buscar configuración existente
    let config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sistema' }
    });

    // Si no existe, crear una configuración por defecto
    if (!config) {
      const defaultConfig = {
        empresa: {
          nombre: 'Mueblería La Económica',
          direccion: 'Av. Principal 123, Col. Centro',
          telefono: '555-1234',
          email: 'contacto@muebleria.com'
        },
        cobranza: {
          diasGracia: 3,
          cargoMoratorio: 50,
          requiereTicket: true,
          permitirPagoParcial: true
        },
        notificaciones: {
          whatsappEnabled: false,
          emailEnabled: true,
          smsEnabled: false,
          recordatoriosDias: 2
        },
        sincronizacion: {
          intervaloMinutos: 15,
          sincronizacionAutomatica: true,
          backupAutomatico: true
        },
        impresion: {
          nombreImpresora: 'Impresora Bluetooth',
          anchoPapel: 80,
          cortarPapel: true
        }
      };

      config = await prisma.configuracionSistema.create({
        data: {
          clave: 'sistema',
          ...defaultConfig
        }
      });
    }

    return NextResponse.json({
      empresa: config.empresa,
      cobranza: config.cobranza,
      notificaciones: config.notificaciones,
      sincronizacion: config.sincronizacion,
      impresion: config.impresion
    });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// POST - Guardar o actualizar la configuración
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug de sesión
    console.log('POST /api/configuracion - Session:', {
      hasSession: !!session,
      user: session?.user,
      role: (session?.user as any)?.role
    });
    
    if (!session) {
      return NextResponse.json(
        { 
          error: 'No autorizado',
          details: 'No hay sesión activa'
        },
        { status: 401 }
      );
    }
    
    if ((session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { 
          error: 'No autorizado',
          details: `Rol actual: ${(session.user as any)?.role}. Se requiere rol: admin`
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { empresa, cobranza, notificaciones, sincronizacion, impresion } = body;

    // Validar que todos los campos requeridos estén presentes
    if (!empresa || !cobranza || !notificaciones || !sincronizacion || !impresion) {
      const missingFields = [];
      if (!empresa) missingFields.push('empresa');
      if (!cobranza) missingFields.push('cobranza');
      if (!notificaciones) missingFields.push('notificaciones');
      if (!sincronizacion) missingFields.push('sincronizacion');
      if (!impresion) missingFields.push('impresion');
      
      return NextResponse.json(
        { 
          error: 'Faltan campos requeridos',
          missingFields
        },
        { status: 400 }
      );
    }

    // Actualizar o crear configuración
    const config = await prisma.configuracionSistema.upsert({
      where: { clave: 'sistema' },
      update: {
        empresa,
        cobranza,
        notificaciones,
        sincronizacion,
        impresion
      },
      create: {
        clave: 'sistema',
        empresa,
        cobranza,
        notificaciones,
        sincronizacion,
        impresion
      }
    });

    return NextResponse.json({
      message: 'Configuración guardada exitosamente',
      config: {
        empresa: config.empresa,
        cobranza: config.cobranza,
        notificaciones: config.notificaciones,
        sincronizacion: config.sincronizacion,
        impresion: config.impresion
      }
    });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}
