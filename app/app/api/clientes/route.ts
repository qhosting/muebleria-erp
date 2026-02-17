
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generarCodigoCliente } from '@/lib/utils';
import { Prisma } from '@prisma/client';
// Recargar tipos si hay errores (npx prisma generate)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const cobrador = searchParams.get('cobrador') || '';
    const status = searchParams.get('status') || '';
    const diaPago = searchParams.get('diaPago') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { nombreCompleto: { contains: search, mode: 'insensitive' } },
        { codigoCliente: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (cobrador) {
      where.cobradorAsignadoId = cobrador;
    }

    if (status) {
      where.statusCuenta = status;
    }

    if (diaPago) {
      where.diaPago = diaPago;
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    // Solo cobradores tienen restricción de ver únicamente sus clientes asignados
    if (userRole === 'cobrador') {
      where.cobradorAsignadoId = userId;

      // Si no se especifica día de pago y es cobrador, mostrar día actual por defecto
      if (!diaPago) {
        const today = new Date().getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
        const diasMap = ['7', '1', '2', '3', '4', '5', '6']; // Ajustamos para que domingo=7
        where.diaPago = diasMap[today];
      }
    }
    // Admins y gestores pueden ver todos los clientes

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          cobradorAsignado: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ]);

    // Convert Decimal fields to numbers for JSON serialization
    const clientesSerializados = clientes.map((cliente: any) => ({
      ...cliente,
      montoPago: parseFloat(cliente.montoPago.toString()),
      saldoActual: parseFloat(cliente.saldoActual.toString()),
      importe1: cliente.importe1 ? parseFloat(cliente.importe1.toString()) : null,
      importe2: cliente.importe2 ? parseFloat(cliente.importe2.toString()) : null,
      importe3: cliente.importe3 ? parseFloat(cliente.importe3.toString()) : null,
      importe4: cliente.importe4 ? parseFloat(cliente.importe4.toString()) : null,
    }));

    return NextResponse.json({
      clientes: clientesSerializados,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
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
    if (userRole !== 'admin' && userRole !== 'gestor_cobranza') {
      return NextResponse.json({ error: 'Solo administradores y gestores pueden crear clientes' }, { status: 403 });
    }

    const body = await request.json();
    const {
      codigoCliente: codigoClienteCustom,
      nombreCompleto,
      telefono,
      vendedor,
      codigoGestor,
      cobradorAsignadoId,
      productoId,
      sucursalId,
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

    if (!nombreCompleto || !direccionCompleta || !descripcionProducto || !diaPago || !montoPago || !periodicidad) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Si se proporciona codigoGestor, buscar el cobrador correspondiente
    let cobradorId = cobradorAsignadoId;
    if (codigoGestor?.trim() && !cobradorAsignadoId) {
      const cobrador = await prisma.user.findFirst({
        where: {
          codigoGestor: codigoGestor.trim(),
          isActive: true,
        },
      });
      if (cobrador) {
        cobradorId = cobrador.id;
      }
    }

    // Generar código de cliente o usar el proporcionado
    let codigoCliente = codigoClienteCustom?.trim() || generarCodigoCliente();

    // Validar que el código no exista ya
    const existeCliente = await prisma.cliente.findUnique({
      where: { codigoCliente },
    });

    if (existeCliente) {
      if (codigoClienteCustom?.trim()) {
        return NextResponse.json(
          { error: 'El código de cliente ya existe. Por favor, use uno diferente.' },
          { status: 400 }
        );
      }
      let intentos = 0;
      do {
        codigoCliente = generarCodigoCliente();
        const existe = await prisma.cliente.findUnique({
          where: { codigoCliente },
        });
        if (!existe) break;
        intentos++;
      } while (intentos < 10);

      if (intentos >= 10) {
        return NextResponse.json(
          { error: 'Error al generar código único. Intente nuevamente.' },
          { status: 500 }
        );
      }
    }

    // Transacción para crear cliente y actualizar inventario
    const cliente = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Crear Cliente
      const nuevoCliente = await tx.cliente.create({
        data: {
          codigoCliente,
          fechaVenta: fechaVenta ? new Date(fechaVenta) : new Date(),
          nombreCompleto,
          telefono,
          vendedor,
          cobradorAsignadoId: cobradorId || null,
          productoId: productoId || null,
          sucursalId: sucursalId || null,
          direccionCompleta,
          descripcionProducto,
          diaPago: diaPago,
          montoPago: parseFloat(montoPago),
          periodicidad,
          saldoActual: parseFloat(saldoActual || montoPago),
          importe1: importe1 ? parseFloat(importe1) : null,
          importe2: importe2 ? parseFloat(importe2) : null,
          importe3: importe3 ? parseFloat(importe3) : null,
          importe4: importe4 ? parseFloat(importe4) : null,
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

      // 2. Actualizar Inventario (si aplica)
      if (productoId && sucursalId) {
        const stock = await tx.stock.findUnique({
          where: {
            productoId_sucursalId: {
              productoId,
              sucursalId
            }
          }
        });

        if (!stock || stock.cantidad < 1) {
          throw new Error('Stock insuficiente del producto seleccionado en esta sucursal.');
        }

        // Decrementar stock
        await tx.stock.update({
          where: { id: stock.id },
          data: { cantidad: { decrement: 1 } }
        });

        // Registrar movimiento de venta
        await tx.movimientoInventario.create({
          data: {
            productoId,
            tipoMovimiento: 'venta',
            cantidad: 1,
            sucursalOrigenId: sucursalId,
            motivo: `Venta a cliente ${nuevoCliente.codigoCliente}`,
            referencia: nuevoCliente.id,
            usuarioId: (session.user as any).id
          }
        });
      }

      return nuevoCliente;
    });

    const clienteSerializado = {
      ...cliente,
      montoPago: parseFloat(cliente.montoPago.toString()),
      saldoActual: parseFloat(cliente.saldoActual.toString()),
      importe1: cliente.importe1 ? parseFloat(cliente.importe1.toString()) : null,
      importe2: cliente.importe2 ? parseFloat(cliente.importe2.toString()) : null,
      importe3: cliente.importe3 ? parseFloat(cliente.importe3.toString()) : null,
      importe4: cliente.importe4 ? parseFloat(cliente.importe4.toString()) : null,
    };

    return NextResponse.json(clienteSerializado, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
