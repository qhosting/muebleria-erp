
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener TODAS las plantillas (activas e inactivas) para gestión completa
    const plantillas = await prisma.plantillaTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Devolver en el formato esperado por el frontend
    return NextResponse.json({ plantillas });
  } catch (error) {
    console.error('Error al obtener plantillas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const { nombre, contenido, isActive = true } = body;

    if (!nombre || !contenido) {
      return NextResponse.json(
        { error: 'Nombre y contenido son requeridos' },
        { status: 400 }
      );
    }

    const plantilla = await prisma.plantillaTicket.create({
      data: {
        nombre,
        contenido,
        isActive,
      },
    });

    return NextResponse.json(plantilla, { status: 201 });
  } catch (error) {
    console.error('Error al crear plantilla:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
