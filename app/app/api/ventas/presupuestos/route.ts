
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { vendedorId, equipoId, fechaInicio, fechaFin, metaMonto, metaPiezas, metaLeads, nombre } = body;

    if (!fechaInicio || !fechaFin || (!vendedorId && !equipoId)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const presupuesto = await prisma.presupuestoVenta.create({
      data: {
        vendedorId,
        equipoId,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        nombre,
        metaMonto: Number(metaMonto),
        metaPiezas: parseInt(metaPiezas),
        metaLeads: parseInt(metaLeads || '0'),
      }
    });

    return NextResponse.json(presupuesto);
  } catch (error: any) {
    console.error('Error al guardar presupuesto:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const presupuestos = await prisma.presupuestoVenta.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        vendedor: { select: { name: true } },
        equipo: { select: { nombre: true } }
      }
    });

    return NextResponse.json(presupuestos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.presupuestoVenta.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

