
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const pago = await prisma.pago.findUnique({
      where: { id: params.id },
      include: {
        cliente: {
          select: {
            id: true,
            nombreCompleto: true,
            telefono: true,
            direccionCompleta: true,
            diaPago: true,
            saldoActual: true,
          }
        },
        cobrador: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // Convertir Decimal a Number
    const pagoAny = pago as any;
    const pagoSerializado = {
      ...pagoAny,
      monto: parseFloat(pagoAny.monto.toString()),
      interesMoratorio: pagoAny.interesMoratorio ? parseFloat(pagoAny.interesMoratorio.toString()) : 0,
      gastosCobranza: pagoAny.gastosCobranza ? parseFloat(pagoAny.gastosCobranza.toString()) : 0,
      saldoAnterior: parseFloat(pagoAny.saldoAnterior.toString()),
      saldoNuevo: parseFloat(pagoAny.saldoNuevo.toString()),
      cliente: {
        ...pagoAny.cliente,
        saldoActual: parseFloat(pagoAny.cliente.saldoActual.toString()),
      }
    };

    return NextResponse.json(pagoSerializado);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const pagoId = params.id;

    // Obtener el pago antes de eliminarlo para saber el monto y el cliente
    const pago = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { cliente: true }
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // Ejecutar en una transacción
    await prisma.$transaction(async (tx) => {
      // 1. Si era un pago regular, devolver el saldo al cliente
      if (pago.tipoPago === 'regular') {
        await tx.cliente.update({
          where: { id: pago.clienteId },
          data: {
            saldoActual: {
              increment: pago.monto
            }
          }
        });
      }

      // 2. Eliminar el pago
      await tx.pago.delete({
        where: { id: pagoId }
      });
    });

    return NextResponse.json({ success: true, message: 'Pago cancelado y saldo restaurado' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const pagoId = params.id;
    const body = await request.json();
    const { concepto, metodoPago, tipoPago, cobradorId, fechaPago, monto } = body;

    const pagoExistente = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { cliente: true }
    });

    if (!pagoExistente) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const montoNuevo = monto !== undefined ? parseFloat(monto.toString()) : parseFloat(pagoExistente.monto.toString());
      const tipoPagoNuevo = tipoPago !== undefined ? tipoPago : pagoExistente.tipoPago;
      
      let saldoNuevo = pagoExistente.saldoNuevo;

      // Lógica de actualización de saldo del cliente
      // Solo si el tipo de pago era o es 'regular' afecta el saldo
      if (pagoExistente.tipoPago === 'regular' || tipoPagoNuevo === 'regular') {
        const montoAnteriorEfectivo = pagoExistente.tipoPago === 'regular' ? parseFloat(pagoExistente.monto.toString()) : 0;
        const montoNuevoEfectivo = tipoPagoNuevo === 'regular' ? montoNuevo : 0;
        const diferencia = montoNuevoEfectivo - montoAnteriorEfectivo;

        if (diferencia !== 0) {
          await tx.cliente.update({
            where: { id: pagoExistente.clienteId },
            data: {
              saldoActual: {
                decrement: diferencia
              }
            }
          });
        }

        // Recalcular el saldoNuevo para este registro de pago
        if (tipoPagoNuevo === 'regular') {
          saldoNuevo = new Prisma.Decimal(parseFloat(pagoExistente.saldoAnterior.toString()) - montoNuevo);
        } else {
          // Si ya no es regular, el saldo nuevo es igual al anterior
          saldoNuevo = pagoExistente.saldoAnterior;
        }
      }

      return await tx.pago.update({
        where: { id: pagoId },
        data: {
          monto: montoNuevo,
          concepto: concepto !== undefined ? concepto : pagoExistente.concepto,
          metodoPago: metodoPago !== undefined ? metodoPago : pagoExistente.metodoPago,
          tipoPago: tipoPagoNuevo,
          cobradorId: cobradorId !== undefined ? cobradorId : pagoExistente.cobradorId,
          fechaPago: fechaPago !== undefined ? new Date(fechaPago) : pagoExistente.fechaPago,
          saldoNuevo: saldoNuevo
        },
        include: {
          cliente: { 
            select: { 
              nombreCompleto: true,
              codigoCliente: true,
              saldoActual: true 
            } 
          },
          cobrador: { select: { name: true } }
        }
      });
    });

    // Serializar Decimales para la respuesta
    const resAny = resultado as any;
    const responseData = {
      ...resAny,
      monto: parseFloat(resAny.monto.toString()),
      saldoAnterior: parseFloat(resAny.saldoAnterior.toString()),
      saldoNuevo: parseFloat(resAny.saldoNuevo.toString()),
      cliente: {
        ...resAny.cliente,
        saldoActual: parseFloat(resAny.cliente.saldoActual.toString())
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
