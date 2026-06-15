
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

const db = prisma as any;

// GET - Obtener un lead específico con su historial de chat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        vendedor: { select: { id: true, name: true, email: true } },
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    // Obtener historial de chat
    const chats = await db.leadChat.findMany({
      where: { leadId: params.id },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ lead, chats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Actualizar estado, asignación o datos del lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { estado, vendedorId, notas, nombre, telefono, interes, montoEstimado, origen } = body;

    const updateData: any = {};
    if (estado !== undefined) updateData.estado = estado;
    if (vendedorId !== undefined) updateData.vendedorId = vendedorId || null;
    if (notas !== undefined) updateData.notas = notas;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (interes !== undefined) updateData.interes = interes;
    if (montoEstimado !== undefined) updateData.montoEstimado = montoEstimado ? Number(montoEstimado) : null;
    if (origen !== undefined) updateData.origen = origen;

    // Si se asigna un vendedor, marcar como contactado si estaba en nuevo
    if (vendedorId && !estado) {
      const current = await prisma.lead.findUnique({ where: { id: params.id } });
      if (current?.estado === 'nuevo') {
        updateData.estado = 'contactado';
      }
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        vendedor: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Error actualizando lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Eliminar un lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session?.user || !await checkPermission(userRole, 'ventas')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Eliminar chats asociados primero
    await db.leadChat.deleteMany({ where: { leadId: params.id } });

    await prisma.lead.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
