import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * WEBHOOK NATIVO PARA META (FACEBOOK/INSTAGRAM LEAD ADS)
 * Este endpoint maneja la validación y recepción de leads directamente desde Meta.
 */

// 1. VALIDACIÓN DE SUSCRIPCIÓN (Requerido por Meta)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // El Verify Token debe coincidir con el que configures en el Dashboard de Desarrolladores de Meta
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'aurum_meta_direct_2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook Validado por Meta');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Token de verificación inválido' }, { status: 403 });
}

// 2. RECEPCIÓN DE LEADS (Payload nativo de Meta)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificamos si es un evento de Leadgen de Meta
    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadId = change.value.leadgen_id;
            
            // Nota: Aquí Meta envía el ID del Lead. Para obtener los datos (nombre, tel), 
            // normalmente se requiere una llamada de vuelta a la API de Graph con el Token de la página.
            // Por ahora, crearemos el registro base para seguimiento.
            
            await prisma.lead.create({
              data: {
                nombre: `Lead de Facebook #${leadId}`,
                telefono: 'Pendiente de sincronizar',
                interes: 'Lead Ads Meta',
                estado: 'nuevo',
                origen: 'facebook',
                notas: `Meta Lead ID: ${leadId}. Requiere sincronización vía Graph API.`,
                intencion: 'VENTA',
              } as any
            });
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    // Soporte para formato simple (por si se usa un formulario web propio)
    const { nombre, telefono, mensaje, origen, direccionArea, interes } = body;

    if (nombre) {
      const lead = await prisma.lead.create({
        data: {
          nombre,
          telefono: telefono || 'Sin teléfono',
          direccionArea: direccionArea || '',
          interes: interes || mensaje || 'Interés general',
          estado: 'nuevo',
          origen: origen || 'web',
          notas: mensaje || '',
          intencion: 'VENTA',
        } as any
      });
      return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
    }

    return NextResponse.json({ error: 'Formato no reconocido' }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Error en Webhook Nativo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
