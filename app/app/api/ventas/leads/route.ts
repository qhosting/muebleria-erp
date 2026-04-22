
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

    const { searchParams } = new URL(request.url);
    const vendedorId = searchParams.get('vendedorId');
    const intencion = searchParams.get('intencion');
    const showAll = searchParams.get('all') === 'true';

    const where: any = {};
    
    if (vendedorId) {
      where.vendedorId = vendedorId;
    } else if (!showAll && (session.user as any).role !== 'admin') {
      // Si no es admin y no pide todos, mostrar solo los suyos o los que no tienen dueño (AI)
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

    return NextResponse.json(leads);
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
