
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
    const vendedorId = searchParams.get('vendedorId') || (session.user as any).id;

    const leads = await prisma.lead.findMany({
      where: {
        vendedorId: vendedorId,
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
    const { nombre, telefono, direccionArea, interes, montoEstimado, estado, origen, notas } = body;

    const lead = await prisma.lead.create({
      data: {
        nombre,
        telefono,
        direccionArea,
        interes,
        montoEstimado: montoEstimado ? Number(montoEstimado) : null,
        estado: estado || 'nuevo',
        origen: origen || 'cambaceo',
        vendedorId: (session.user as any).id,
        notas,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
