
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

    const body = await request.json();
    const { pagos } = body;

    if (!Array.isArray(pagos)) {
      return NextResponse.json(
        { error: 'Se esperaba un array de pagos' },
        { status: 400 }
      );
    }

    const resultados = [];

    for (const pagoData of pagos) {
      try {
        // Verificar si el pago ya existe
        const pagoExistente = await prisma.pago.findFirst({
          where: {
            clienteId: pagoData.clienteId,
            cobradorId: pagoData.cobradorId,
            monto: parseFloat(pagoData.monto),
            fechaPago: new Date(pagoData.fechaPago),
          },
        });

        if (pagoExistente) {
          resultados.push({
            status: 'duplicado',
            clienteId: pagoData.clienteId,
            message: 'Pago ya existe',
          });
          continue;
        }

        // Obtener cliente para calcular saldos
        const cliente = await prisma.cliente.findUnique({
          where: { id: pagoData.clienteId },
        });

        if (!cliente) {
          resultados.push({
            status: 'error',
            clienteId: pagoData.clienteId,
            message: 'Cliente no encontrado',
          });
          continue;
        }

        const montoNumerico = parseFloat(pagoData.monto);
        const saldoAnterior = parseFloat(pagoData.saldoAnterior) || parseFloat(cliente.saldoActual.toString());
        let saldoNuevo = saldoAnterior;

        // Solo los pagos regulares afectan el saldo principal
        if (pagoData.tipoPago === 'regular') {
          saldoNuevo = Math.max(0, saldoAnterior - montoNumerico);
        }

        // Crear el pago en una transacción
        await prisma.$transaction(async (prisma: any) => {
          await prisma.pago.create({
            data: {
              clienteId: pagoData.clienteId,
              cobradorId: pagoData.cobradorId,
              monto: montoNumerico,
              concepto: pagoData.concepto || 'Pago de cuota',
              tipoPago: pagoData.tipoPago || 'regular',
              fechaPago: new Date(pagoData.fechaPago),
              saldoAnterior,
              saldoNuevo,
              ticketImpreso: pagoData.ticketImpreso || false,
              sincronizado: true,
            },
          });

          // Actualizar saldo del cliente si es pago regular
          if (pagoData.tipoPago === 'regular') {
            await prisma.cliente.update({
              where: { id: pagoData.clienteId },
              data: { saldoActual: saldoNuevo },
            });
          }
        });

        resultados.push({
          status: 'sincronizado',
          clienteId: pagoData.clienteId,
          message: 'Pago sincronizado exitosamente',
        });
      } catch (error) {
        console.error(`Error al sincronizar pago para cliente ${pagoData.clienteId}:`, error);
        resultados.push({
          status: 'error',
          clienteId: pagoData.clienteId,
          message: 'Error al sincronizar pago',
        });
      }
    }

    return NextResponse.json({
      message: 'Sincronización completada',
      resultados,
      total: pagos.length,
      sincronizados: resultados.filter((r: any) => r.status === 'sincronizado').length,
      duplicados: resultados.filter((r: any) => r.status === 'duplicado').length,
      errores: resultados.filter((r: any) => r.status === 'error').length,
    });
  } catch (error) {
    console.error('Error en sincronización de pagos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
