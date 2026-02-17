

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, contenido, isActive } = body;

    if (!nombre || !contenido) {
      return NextResponse.json(
        { error: 'Nombre y contenido son requeridos' },
        { status: 400 }
      );
    }

    const plantilla = await prisma.plantillaTicket.update({
      where: { id: params.id },
      data: {
        nombre,
        contenido,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(plantilla);
  } catch (error) {
    console.error('Error al actualizar plantilla:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    await prisma.plantillaTicket.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
