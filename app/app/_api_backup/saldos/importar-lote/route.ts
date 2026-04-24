
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

interface ImporteItem {
  codigoCliente: string;
  saldo: number;
  motivo?: string;
}

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
    const { importes } = body as { importes: ImporteItem[] };

    if (!Array.isArray(importes) || importes.length === 0) {
      return NextResponse.json(
        { error: 'Lista de importes inválida o vacía' },
        { status: 400 }
      );
    }

    const resultados = {
      exitosos: [] as any[],
      fallidos: [] as any[]
    };

    // Procesar cada importación
    for (const item of importes) {
      try {
        const { codigoCliente, saldo, motivo } = item;

        if (!codigoCliente || saldo === undefined) {
          resultados.fallidos.push({
            codigoCliente,
            error: 'Código de cliente o saldo faltante'
          });
          continue;
        }

        // Buscar el cliente
        const cliente = await prisma.cliente.findUnique({
          where: { codigoCliente }
        });

        if (!cliente) {
          resultados.fallidos.push({
            codigoCliente,
            error: 'Cliente no encontrado'
          });
          continue;
        }

        const saldoAnterior = cliente.saldoActual;
        const nuevoSaldoDecimal = new Decimal(saldo);

        // Actualizar el saldo
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: {
            saldoActual: nuevoSaldoDecimal
          }
        });

        // Registrar el cambio
        const diferencia = nuevoSaldoDecimal.minus(new Decimal(saldoAnterior));
        
        if (!diferencia.equals(0)) {
          await prisma.pago.create({
            data: {
              clienteId: cliente.id,
              cobradorId: user.id,
              monto: diferencia.abs(),
              concepto: motivo || `Ajuste de saldo - importación masiva`,
              tipoPago: 'abono',
              fechaPago: new Date(),
              saldoAnterior: new Decimal(saldoAnterior),
              saldoNuevo: nuevoSaldoDecimal,
              metodoPago: 'ajuste',
              numeroRecibo: `ADJ-${Date.now()}-${codigoCliente}`,
              sincronizado: true
            }
          });
        }

        resultados.exitosos.push({
          codigoCliente: cliente.codigoCliente,
          nombreCompleto: cliente.nombreCompleto,
          saldoAnterior: saldoAnterior.toString(),
          saldoNuevo: nuevoSaldoDecimal.toString(),
          diferencia: diferencia.toString()
        });

      } catch (error: any) {
        resultados.fallidos.push({
          codigoCliente: item.codigoCliente,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalProcesados: importes.length,
      exitosos: resultados.exitosos.length,
      fallidos: resultados.fallidos.length,
      resultados
    });

  } catch (error: any) {
    console.error('Error al importar saldos en lote:', error);
    return NextResponse.json(
      { error: error.message || 'Error al importar saldos' },
      { status: 500 }
    );
  }
}
