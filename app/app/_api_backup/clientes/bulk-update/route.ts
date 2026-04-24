
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'gestor_cobranza') {
      return NextResponse.json({ error: 'Solo administradores y gestores pueden actualizar clientes' }, { status: 403 });
    }

    const body = await request.json();
    const { codigoCliente, updateData } = body;

    if (!codigoCliente) {
      return NextResponse.json(
        { error: 'El código de cliente es requerido para actualizar' },
        { status: 400 }
      );
    }

    // Buscar el cliente existente
    const clienteExistente = await prisma.cliente.findUnique({
      where: { codigoCliente },
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: `Cliente con código ${codigoCliente} no encontrado` },
        { status: 404 }
      );
    }

    // Si se proporciona codigoGestor, buscar el cobrador correspondiente
    let cobradorId = updateData.cobradorAsignadoId;
    if (updateData.codigoGestor?.trim() && !updateData.cobradorAsignadoId) {
      const cobrador = await prisma.user.findFirst({
        where: {
          codigoGestor: updateData.codigoGestor.trim(),
          isActive: true,
        },
      });
      if (cobrador) {
        cobradorId = cobrador.id;
      }
    }

    // Preparar datos de actualización
    const dataToUpdate: any = {};

    // Solo actualizar campos que se proporcionen
    if (updateData.nombreCompleto !== undefined) dataToUpdate.nombreCompleto = updateData.nombreCompleto;
    if (updateData.telefono !== undefined) dataToUpdate.telefono = updateData.telefono;
    if (updateData.vendedor !== undefined) dataToUpdate.vendedor = updateData.vendedor;
    if (updateData.direccionCompleta !== undefined) dataToUpdate.direccionCompleta = updateData.direccionCompleta;
    if (updateData.descripcionProducto !== undefined) dataToUpdate.descripcionProducto = updateData.descripcionProducto;
    if (updateData.diaPago !== undefined) dataToUpdate.diaPago = updateData.diaPago;
    if (updateData.montoPago !== undefined) dataToUpdate.montoPago = parseFloat(updateData.montoPago);
    if (updateData.periodicidad !== undefined) dataToUpdate.periodicidad = updateData.periodicidad;
    if (updateData.saldoActual !== undefined) dataToUpdate.saldoActual = parseFloat(updateData.saldoActual);
    if (updateData.fechaVenta !== undefined) dataToUpdate.fechaVenta = new Date(updateData.fechaVenta);
    if (updateData.importe1 !== undefined) dataToUpdate.importe1 = updateData.importe1 ? parseFloat(updateData.importe1) : null;
    if (updateData.importe2 !== undefined) dataToUpdate.importe2 = updateData.importe2 ? parseFloat(updateData.importe2) : null;
    if (updateData.importe3 !== undefined) dataToUpdate.importe3 = updateData.importe3 ? parseFloat(updateData.importe3) : null;
    if (updateData.importe4 !== undefined) dataToUpdate.importe4 = updateData.importe4 ? parseFloat(updateData.importe4) : null;
    
    // Actualizar cobrador si se encontró
    if (cobradorId !== undefined) {
      dataToUpdate.cobradorAsignadoId = cobradorId;
    }

    // Actualizar el cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { codigoCliente },
      data: dataToUpdate,
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const clienteSerializado = {
      ...clienteActualizado,
      montoPago: parseFloat(clienteActualizado.montoPago.toString()),
      saldoActual: parseFloat(clienteActualizado.saldoActual.toString()),
      importe1: clienteActualizado.importe1 ? parseFloat(clienteActualizado.importe1.toString()) : null,
      importe2: clienteActualizado.importe2 ? parseFloat(clienteActualizado.importe2.toString()) : null,
      importe3: clienteActualizado.importe3 ? parseFloat(clienteActualizado.importe3.toString()) : null,
      importe4: clienteActualizado.importe4 ? parseFloat(clienteActualizado.importe4.toString()) : null,
    };

    return NextResponse.json(clienteSerializado, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
