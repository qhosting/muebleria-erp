
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const intencion = searchParams.get('intencion');
    const showAll = searchParams.get('all') === 'true';

    const where: any = {};
    
    if (vendedorId) {
      where.vendedorId = vendedorId;
    } else if (!showAll && !await checkPermission((session.user as any).role, 'ventas')) {
      // Si no es un rol supervisor/dirección (no tiene acceso al módulo completo) y no pide todos, mostrar solo los suyos o los que no tienen dueño (AI)
      where.OR = [
        { vendedorId: (session.user as any).id },
        { vendedorId: null }
      ];
    }

    if (intencion) {
      where.intencion = intencion;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        vendedor: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Encontrar los clienteIds no nulos
    const clienteIds = leads.map((l: any) => l.clienteId).filter(Boolean) as string[];

    // Buscar los clientes correspondientes para obtener su codigoCliente
    const clientes = await prisma.cliente.findMany({
      where: {
        id: { in: clienteIds }
      },
      select: {
        id: true,
        codigoCliente: true
      }
    });

    // Mapear los clientes a un diccionario para búsqueda rápida
    const clienteMap = new Map(clientes.map((c: any) => [c.id, c.codigoCliente]));

    // Adjuntar codigoCliente a cada lead en la respuesta (desvinculación de catálogo local)
    const leadsWithCodigo = leads.map((lead: any) => {
      let codigoCliente = (lead.datosExtraidos as any)?.codigoCliente || null;

      // 1. Si no tiene en datosExtraidos, pero el cliente existe localmente, lo guardamos para el histórico
      if (!codigoCliente && lead.clienteId) {
        const dbCode = clienteMap.get(lead.clienteId);
        if (dbCode) {
          codigoCliente = dbCode;
          // Auto-sanar en segundo plano (persistir de forma permanente)
          const currentDatos = typeof lead.datosExtraidos === 'object' && lead.datosExtraidos ? lead.datosExtraidos : {};
          prisma.lead.update({
            where: { id: lead.id },
            data: {
              datosExtraidos: {
                ...currentDatos,
                codigoCliente
              }
            }
          }).catch((err: any) => console.error('Error auto-saving client code in lead:', err));
        }
      }

      // 2. Si aún no hay código de cliente, intentar extraer del texto de las notas
      if (!codigoCliente && lead.notas) {
        const match = lead.notas.match(/(DQ|DP)\d+/i);
        if (match) {
          codigoCliente = match[0].toUpperCase();
        }
      }

      return {
        ...lead,
        codigoCliente
      };
    });

    return NextResponse.json(leadsWithCodigo);
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

    const body = await request.json();
    const { 
      nombre, telefono, direccionArea, interes, 
      montoEstimado, estado, origen, notas,
      intencion, urgencia, resumenInterno, respuestaIA, datosExtraidos
    } = body;

    const lead = await prisma.lead.create({
      data: {
        nombre,
        telefono,
        direccionArea,
        interes,
        montoEstimado: montoEstimado ? Number(montoEstimado) : null,
        estado: estado || 'nuevo',
        origen: origen || 'cambaceo',
        vendedorId: body.vendedorId || (session.user as any).id,
        notas,
        // AI fields (schema already updated, IDE cache may lag)
        ...(intencion && { intencion }),
        ...(urgencia && { urgencia }),
        ...(resumenInterno && { resumenInterno }),
        ...(respuestaIA && { respuestaIA }),
        ...(datosExtraidos && { datosExtraidos }),
      } as any,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
