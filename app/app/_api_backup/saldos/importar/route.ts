
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    // Solo admin y gestor pueden importar saldos
    if (user.role !== 'admin' && user.role !== 'gestor_cobranza') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { codigoCliente, nuevoSaldo, motivo } = body;

    if (!codigoCliente || nuevoSaldo === undefined) {
      return NextResponse.json(
        { error: 'Código de cliente y nuevo saldo son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el cliente
    const cliente = await prisma.cliente.findUnique({
      where: { codigoCliente },
      include: {
        cobradorAsignado: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: `Cliente con código ${codigoCliente} no encontrado` },
        { status: 404 }
      );
    }

    const saldoAnterior = cliente.saldoActual;
    const nuevoSaldoDecimal = new Decimal(nuevoSaldo);

    // Actualizar el saldo
    const clienteActualizado = await prisma.cliente.update({
      where: { id: cliente.id },
      data: {
        saldoActual: nuevoSaldoDecimal
      }
    });

    // Registrar el cambio como un pago de ajuste
    const diferencia = nuevoSaldoDecimal.minus(new Decimal(saldoAnterior));
    
    if (!diferencia.equals(0)) {
      await prisma.pago.create({
        data: {
          clienteId: cliente.id,
          cobradorId: user.id,
          monto: diferencia.abs(),
          concepto: motivo || `Ajuste de saldo por importación`,
          tipoPago: 'abono',
          fechaPago: new Date(),
          saldoAnterior: new Decimal(saldoAnterior),
          saldoNuevo: nuevoSaldoDecimal,
          metodoPago: 'ajuste',
          numeroRecibo: `ADJ-${Date.now()}`,
          sincronizado: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      cliente: {
        codigoCliente: clienteActualizado.codigoCliente,
        nombreCompleto: clienteActualizado.nombreCompleto,
        saldoAnterior: saldoAnterior.toString(),
        saldoNuevo: clienteActualizado.saldoActual.toString(),
        diferencia: diferencia.toString()
      }
    });

  } catch (error: any) {
    console.error('Error al importar saldo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar saldo' },
      { status: 500 }
    );
  }
}
