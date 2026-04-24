
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const equipos = await prisma.equipoVentas.findMany({
      include: {
        lider: { select: { id: true, name: true } },
        miembros: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json(equipos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { nombre, liderId } = body;

    const equipo = await prisma.equipoVentas.create({
      data: {
        nombre,
        liderId,
      }
    });

    return NextResponse.json(equipo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
