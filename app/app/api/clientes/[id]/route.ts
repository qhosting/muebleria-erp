
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        pagos: {
          orderBy: { fechaPago: 'desc' },
          take: 10,
          include: {
            cobrador: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    
    // Restricciones de acceso por rol
    if (userRole === 'cobrador' && cliente.cobradorAsignadoId !== userId) {
      return NextResponse.json({ error: 'No tienes acceso a este cliente' }, { status: 403 });
    }
    // Gestores y admins pueden ver todos los clientes

    // Convert Decimal fields to numbers for JSON serialization
    const clienteSerializado = {
      ...cliente,
      montoPago: parseFloat(cliente.montoPago.toString()),
      saldoActual: parseFloat(cliente.saldoActual.toString()),
      importe1: cliente.importe1 ? parseFloat(cliente.importe1.toString()) : null,
      importe2: cliente.importe2 ? parseFloat(cliente.importe2.toString()) : null,
      importe3: cliente.importe3 ? parseFloat(cliente.importe3.toString()) : null,
      importe4: cliente.importe4 ? parseFloat(cliente.importe4.toString()) : null,
      pagos: cliente.pagos?.map((pago: any) => ({
        ...pago,
        monto: parseFloat(pago.monto.toString())
      })) || []
    };

    return NextResponse.json(clienteSerializado);
  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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
    if (userRole !== 'admin' && userRole !== 'gestor_cobranza') {
      return NextResponse.json({ error: 'Solo administradores y gestores pueden editar clientes' }, { status: 403 });
    }

    const body = await request.json();
    const {
      codigoCliente,
      nombreCompleto,
      telefono,
      vendedor,
      cobradorAsignadoId,
      statusCuenta,
      direccionCompleta,
      descripcionProducto,
      diaPago,
      montoPago,
      periodicidad,
      saldoActual,
      importe1,
      importe2,
      importe3,
      importe4,
      fechaVenta,
    } = body;

    // Si se cambió el código de cliente, validar que no exista
    if (codigoCliente) {
      const clienteActual = await prisma.cliente.findUnique({
        where: { id: params.id },
      });
      
      if (clienteActual && clienteActual.codigoCliente !== codigoCliente.trim()) {
        const existeCliente = await prisma.cliente.findUnique({
          where: { codigoCliente: codigoCliente.trim() },
        });
        
        if (existeCliente) {
          return NextResponse.json(
            { error: 'El código de cliente ya existe. Por favor, use uno diferente.' },
            { status: 400 }
          );
        }
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        ...(codigoCliente && { codigoCliente: codigoCliente.trim() }),
        nombreCompleto,
        telefono,
        vendedor,
        cobradorAsignadoId: cobradorAsignadoId || null,
        statusCuenta,
        direccionCompleta,
        descripcionProducto,
        diaPago: diaPago,
        montoPago: montoPago ? parseFloat(montoPago) : undefined,
        periodicidad,
        saldoActual: saldoActual ? parseFloat(saldoActual) : undefined,
        importe1: importe1 ? parseFloat(importe1) : null,
        importe2: importe2 ? parseFloat(importe2) : null,
        importe3: importe3 ? parseFloat(importe3) : null,
        importe4: importe4 ? parseFloat(importe4) : null,
        fechaVenta: fechaVenta ? new Date(fechaVenta) : undefined,
      },
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
      ...cliente,
      montoPago: parseFloat(cliente.montoPago.toString()),
      saldoActual: parseFloat(cliente.saldoActual.toString()),
      importe1: cliente.importe1 ? parseFloat(cliente.importe1.toString()) : null,
      importe2: cliente.importe2 ? parseFloat(cliente.importe2.toString()) : null,
      importe3: cliente.importe3 ? parseFloat(cliente.importe3.toString()) : null,
      importe4: cliente.importe4 ? parseFloat(cliente.importe4.toString()) : null,
    };

    return NextResponse.json(clienteSerializado);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
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
    if (userRole !== 'admin' && userRole !== 'gestor_cobranza') {
      return NextResponse.json({ error: 'Solo administradores y gestores pueden desactivar clientes' }, { status: 403 });
    }

    await prisma.cliente.update({
      where: { id: params.id },
      data: { statusCuenta: 'inactivo' },
    });

    return NextResponse.json({ message: 'Cliente desactivado exitosamente' });
  } catch (error) {
    console.error('Error al desactivar cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
