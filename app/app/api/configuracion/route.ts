
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obtener la configuración actual
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Buscar configuración existente
    let config = await prisma.configuracionSistema.findUnique({
      where: { clave: 'sistema' }
    });

    // Si no hay sesión, devolver solo información básica de la empresa
    if (!session) {
      if (!config) {
        return NextResponse.json({
          empresa: {
            nombre: 'VertexERP Muebles',
            direccion: 'Av. Principal 123, Col. Centro',
            telefono: '555-1234',
            email: 'contacto@muebleria.com'
          }
        });
      }
      return NextResponse.json({
        empresa: config.empresa
      });
    }

    // Si no existe, crear una configuración por defecto
    if (!config) {
      const defaultConfig = {
        empresa: {
          nombre: 'VertexERP Muebles',
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
          recordatoriosDias: 2,
          wahaApiUrl: '',
          wahaApiKey: '',
          wahaSessionName: 'default'
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

    // Integrar variables de entorno si la base de datos está vacía para WAHA y Departamentos
    const notif = (config?.notificaciones as any) || {};
    const finalNotificaciones = {
      ...notif,
      // Globales
      wahaApiUrl: notif.wahaApiUrl || process.env.WAHA_API_URL || '',
      wahaApiKey: notif.wahaApiKey || process.env.WAHA_API_KEY || '',
      wahaSessionName: notif.wahaSessionName || process.env.WAHA_SESSION_NAME || 'default',
      openaiApiKey: notif.openaiApiKey || process.env.OPENAI_API_KEY || '',
      
      // Ventas / Leads
      leadsWahaSession: notif.leadsWahaSession || process.env.WAHA_SESSION_LEADS || '',
      leadsWahaApiUrl: notif.leadsWahaApiUrl || process.env.WAHA_API_URL_LEADS || '',
      leadsAgentName: notif.leadsAgentName || 'Sofía (Ventas)',
      
      // Tesorería
      tesoreriaWahaSession: notif.tesoreriaWahaSession || process.env.WAHA_SESSION_TESORERIA || '',
      tesoreriaWahaApiUrl: notif.tesoreriaWahaApiUrl || process.env.WAHA_API_URL_TESORERIA || '',
      tesoreriaAgentName: notif.tesoreriaAgentName || 'Asistente de Tesorería'
    };

    // Configuración de Contpaqi (Multi-empresa)
    const contpaqiData = (config as any).contpaqi || {};
    const contpaqiConfig = {
      empresas: contpaqiData.empresas || [
        {
          id: 'default',
          nombre: 'Empresa Principal',
          apiUrl: process.env.CONTPAQI_API_URL || 'http://localhost:5000',
          apiKey: process.env.CONTPAQI_API_KEY || 'VortexContpaqiAPI2024',
          conceptoAbono: process.env.CONTPAQI_CONCEPTO_ABONO || 'ABONO CLIENTE',
          clasificacion: 'COBRANZA NORMAL',
          ruta: '',
          isActive: true
        }
      ]
    };

    return NextResponse.json({
      empresa: config.empresa,
      cobranza: config.cobranza,
      notificaciones: finalNotificaciones,
      sincronizacion: config.sincronizacion,
      impresion: config.impresion,
      contpaqi: contpaqiConfig
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
    const { empresa, cobranza, notificaciones, sincronizacion, impresion, contpaqi } = body;

    // Actualizar o crear configuración
    const config = await prisma.configuracionSistema.upsert({
      where: { clave: 'sistema' },
      update: {
        empresa,
        cobranza,
        notificaciones,
        sincronizacion,
        impresion,
        contpaqi
      } as any,
      create: {
        clave: 'sistema',
        empresa,
        cobranza,
        notificaciones,
        sincronizacion,
        impresion,
        contpaqi
      } as any
    });

    return NextResponse.json({
      message: 'Configuración guardada exitosamente',
      config: {
        empresa: config.empresa,
        cobranza: config.cobranza,
        notificaciones: config.notificaciones,
        sincronizacion: config.sincronizacion,
        impresion: config.impresion,
        contpaqi: (config as any).contpaqi
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
