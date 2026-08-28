import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET: Ejecuta el diagnóstico de auditoría financiera y salud de cuentas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'auditor' && userRole !== 'tesorero') {
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    const clientesActivos = await prisma.cliente.findMany({
      where: { statusCuenta: 'activo' },
      include: {
        cobradorAsignado: {
          select: { name: true }
        },
        pagos: {
          orderBy: [
            { fechaPago: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    const duplicadosList: any[] = [];
    const saldoNegativoList: any[] = [];
    const desfaseSaldoList: any[] = [];
    const saltosCadenaList: any[] = [];

    for (const c of clientesActivos) {
      const pagos = c.pagos;
      const sActual = parseFloat(c.saldoActual.toString());

      if (sActual < 0) {
        saldoNegativoList.push({
          codigo: c.codigoCliente,
          nombre: c.nombreCompleto,
          cobrador: c.cobradorAsignado?.name || 'Sin asignar',
          saldo: sActual
        });
      }

      // 1. Detección de duplicados (< 2 minutos)
      for (let i = 0; i < pagos.length; i++) {
        for (let j = i + 1; j < pagos.length; j++) {
          const p1 = pagos[i];
          const p2 = pagos[j];
          const m1 = parseFloat(p1.monto.toString());
          const m2 = parseFloat(p2.monto.toString());

          if (m1 === m2 && m1 > 0) {
            const t1 = new Date(p1.createdAt).getTime();
            const t2 = new Date(p2.createdAt).getTime();
            const diffSec = Math.abs(t2 - t1) / 1000;

            if (diffSec <= 120) {
              duplicadosList.push({
                clienteCodigo: c.codigoCliente,
                clienteNombre: c.nombreCompleto,
                cobrador: c.cobradorAsignado?.name || 'Sin asignar',
                monto: m1,
                id1: p1.id,
                id2: p2.id,
                fecha: p1.fechaPago.toISOString().slice(0, 10),
                diffSegundos: Math.round(diffSec)
              });
            }
          }
        }
      }

      // 2. Desfase entre último saldoNuevo y saldoActual
      if (pagos.length > 0) {
        const ultPago = pagos[pagos.length - 1];
        const ultSNvo = parseFloat(ultPago.saldoNuevo.toString());
        const dif = parseFloat((sActual - ultSNvo).toFixed(2));
        if (Math.abs(dif) > 1.0) {
          desfaseSaldoList.push({
            codigo: c.codigoCliente,
            nombre: c.nombreCompleto,
            cobrador: c.cobradorAsignado?.name || 'Sin asignar',
            ultimoSaldoPago: ultSNvo,
            saldoActualDB: sActual,
            diferencia: dif,
            totalPagos: pagos.length
          });
        }
      }

      // 3. Saltos en cadena de saldos
      let tieneSaltos = false;
      for (let i = 1; i < pagos.length; i++) {
        const prevSNvo = parseFloat(pagos[i - 1].saldoNuevo.toString());
        const currSAnt = parseFloat(pagos[i].saldoAnterior.toString());
        if (Math.abs(prevSNvo - currSAnt) > 1.0) {
          tieneSaltos = true;
          break;
        }
      }
      if (tieneSaltos) {
        saltosCadenaList.push({
          codigo: c.codigoCliente,
          nombre: c.nombreCompleto,
          cobrador: c.cobradorAsignado?.name || 'Sin asignar',
          saldoActual: sActual,
          totalPagos: pagos.length
        });
      }
    }

    const totalAlertas = duplicadosList.length + saldoNegativoList.length + desfaseSaldoList.length;
    const indiceSalud = clientesActivos.length > 0 
      ? Math.max(0, parseFloat((((clientesActivos.length - desfaseSaldoList.length) / clientesActivos.length) * 100).toFixed(1)))
      : 100;

    return NextResponse.json({
      resumen: {
        totalClientesActivos: clientesActivos.length,
        totalAlertas,
        indiceSalud,
        pagosDuplicados: duplicadosList.length,
        saldosNegativos: saldoNegativoList.length,
        desfasesSaldo: desfaseSaldoList.length,
        saltosComprobantes: saltosCadenaList.length,
        timestamp: new Date().toISOString()
      },
      duplicados: duplicadosList,
      saldosNegativos: saldoNegativoList,
      desfases: desfaseSaldoList.sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia)),
      saltosComprobantes: saltosCadenaList
    });

  } catch (error: any) {
    console.error('Error en GET /api/tesoreria/auditoria:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

/**
 * POST: Ejecuta la reparación y reconciliación automática de cuentas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'auditor' && userRole !== 'tesorero') {
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    // Módulo exclusivamente informativo: no se permiten mutaciones de saldos
    return NextResponse.json({
      error: 'El módulo de Auditoría es estrictamente informativo. No se permiten modificaciones ni reconciliaciones de saldo desde esta vista.'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Error en POST /api/tesoreria/auditoria:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

