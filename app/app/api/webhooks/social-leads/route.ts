
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Webhook para recibir leads desde redes sociales (vía Zapier, Make, etc.)
 * Seguridad: Requiere header 'x-api-key'
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const systemKey = process.env.SOCIAL_LEADS_WEBHOOK_KEY || 'aurum_leads_2026_secret';

    if (apiKey !== systemKey) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      nombre, 
      telefono, 
      mensaje, 
      origen, 
      direccionArea,
      interes,
      vendedorId 
    } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    // Crear el lead en la base de datos
    const lead = await prisma.lead.create({
      data: {
        nombre,
        telefono: telefono || 'Sin teléfono',
        direccionArea: direccionArea || '',
        interes: interes || mensaje || 'Interés general',
        estado: 'nuevo',
        origen: origen || 'facebook',
        notas: mensaje || '',
        vendedorId: vendedorId || null, // Se puede asignar a un vendedor específico o dejar libre para el pool
        // Pre-llenar campos de IA si vienen en el body
        intencion: body.intencion || 'VENTA',
        urgencia: body.urgencia || 'MEDIA',
        resumenInterno: body.resumenInterno || mensaje || '',
      } as any
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Lead aterrizado exitosamente',
      leadId: lead.id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en Webhook de Social Leads:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
