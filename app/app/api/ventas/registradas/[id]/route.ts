import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'direccion') {
      return NextResponse.json({ error: 'No autorizado. Permisos insuficientes.' }, { status: 403 });
    }

    const body = await request.json();
    const { nombreCompleto, numContrato, fechaVenta, vendedorId, piezas, montoPago } = body;

    const updateData: any = {};
    if (nombreCompleto !== undefined) updateData.nombreCompleto = nombreCompleto;
    if (numContrato !== undefined) updateData.numContrato = numContrato;
    if (fechaVenta !== undefined) updateData.fechaVenta = new Date(fechaVenta);
    if (piezas !== undefined) updateData.piezas = Number(piezas);
    if (montoPago !== undefined) updateData.montoPago = Number(montoPago);

    if (vendedorId !== undefined) {
      updateData.vendedorId = vendedorId || null;
      if (vendedorId) {
        const user = await prisma.user.findUnique({
          where: { id: vendedorId },
          select: { name: true }
        });
        if (user) {
          updateData.vendedor = user.name;
        }
      } else {
        updateData.vendedor = null;
      }
    }

    const updatedSale = await prisma.cliente.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error('Error updating registered sale:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
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
    if (userRole !== 'admin' && userRole !== 'direccion') {
      return NextResponse.json({ error: 'No autorizado. Permisos insuficientes.' }, { status: 403 });
    }

    // Primero verificamos si el cliente existe
    const client = await prisma.cliente.findUnique({
      where: { id: params.id },
      select: { id: true, statusAprobacion: true }
    });

    if (!client) {
      return NextResponse.json({ error: 'Registro de venta no encontrado' }, { status: 404 });
    }

    // Eliminar el registro del cliente
    await prisma.cliente.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Venta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting registered sale:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
