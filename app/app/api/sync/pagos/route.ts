
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calcularSemanaCobranzaSabadoViernes } from '@/lib/calendario-cobranza-utils';

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
        // Verificar si el pago ya existe por localId o por combinación de datos
        const duplicateConditions: any[] = [];
        if (pagoData.localId) {
          duplicateConditions.push({ localId: pagoData.localId });
        }
        duplicateConditions.push({
          clienteId: pagoData.clienteId,
          cobradorId: pagoData.cobradorId,
          monto: parseFloat(pagoData.monto),
          fechaPago: new Date(pagoData.fechaPago),
        });

        const pagoExistente = await prisma.pago.findFirst({
          where: {
            OR: duplicateConditions
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
        const saldoAnterior = parseFloat(cliente.saldoActual.toString()) || 0;
        let saldoNuevo = saldoAnterior;

        // Solo los pagos regulares afectan el saldo principal
        if (pagoData.tipoPago === 'regular') {
          saldoNuevo = Math.max(0, saldoAnterior - montoNumerico);
        }

        const fechaPagoObj = new Date(pagoData.fechaPago);
        const calculoSemana = calcularSemanaCobranzaSabadoViernes(fechaPagoObj);
        const semCobranza = pagoData.semanaCobranza 
          ? parseInt(pagoData.semanaCobranza.toString(), 10) 
          : calculoSemana.semana;
        const anCobranza = pagoData.anioCobranza 
          ? parseInt(pagoData.anioCobranza.toString(), 10) 
          : calculoSemana.anio;

        // Crear el pago en una transacción
        await prisma.$transaction(async (prisma: any) => {
          await prisma.pago.create({
            data: {
              clienteId: pagoData.clienteId,
              cobradorId: pagoData.cobradorId,
              monto: montoNumerico,
              concepto: pagoData.concepto || 'Pago de cuota',
              tipoPago: pagoData.tipoPago || 'regular',
              fechaPago: fechaPagoObj,
              semanaCobranza: semCobranza,
              anioCobranza: anCobranza,
              metodoPago: pagoData.metodoPago || 'GESTOR',
              interesMoratorio: parseFloat(pagoData.interesMoratorio?.toString() || '0'),
              gastosCobranza: parseFloat(pagoData.gastosCobranza?.toString() || '0'),
              latitud: pagoData.latitud ? pagoData.latitud.toString() : null,
              longitud: pagoData.longitud ? pagoData.longitud.toString() : null,
              numeroRecibo: pagoData.numeroRecibo || null,
              localId: pagoData.localId || null,
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
