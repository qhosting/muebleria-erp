
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const isAdminOrSupervisor = ['admin', 'gestor_cobranza', 'reporte_cobranza', 'direccion'].includes(userRole);

    if (!isAdminOrSupervisor && userRole !== 'cobrador') {
      return NextResponse.json({ error: 'No autorizado para esta vista' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario no encontrado en sesión' }, { status: 400 });
    }

    // Lógica de ciclo semanal: Sábado a Viernes en horario de México (UTC-6)
    const nowUtc = new Date();
    const offsetMexico = -6 * 60 * 60 * 1000; // -6 horas en milisegundos
    const nowMexico = new Date(nowUtc.getTime() + offsetMexico);

    const inicioHoyMexico = new Date(nowMexico);
    inicioHoyMexico.setUTCHours(0, 0, 0, 0);
    const inicioHoy = new Date(inicioHoyMexico.getTime() - offsetMexico);

    const dayOfWeekMexico = nowMexico.getUTCDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffToSaturday = (dayOfWeekMexico + 1) % 7; 
    const inicioCicloMexico = new Date(inicioHoyMexico);
    inicioCicloMexico.setUTCDate(inicioCicloMexico.getUTCDate() - diffToSaturday);
    const inicioCiclo = new Date(inicioCicloMexico.getTime() - offsetMexico);

    // Filtro base: clientes del cobrador activos
    const whereBase: any = {
      cobradorAsignadoId: isAdminOrSupervisor ? undefined : userId,
      statusCuenta: 'activo',
    };

    try {
      const [hoyResult, clientesPendientesCount, proximosClientes, vdPendientesCount, clientesVdPendientes] = await Promise.all([
        // 1. Cobrado hoy
        prisma.pago.aggregate({
          where: {
            cobradorId: userId,
            fechaPago: { gte: inicioHoy },
          },
          _sum: { monto: true },
          _count: { id: true }
        }),
        // 2. Clientes pendientes de pago este ciclo
        prisma.cliente.count({
          where: {
            ...whereBase,
            pagos: {
              none: {
                fechaPago: { gte: inicioCiclo },
                tipoPago: 'regular'
              }
            }
          }
        }),
        // 3. Próximos clientes a visitar (máximo 10, ordenados por días vencidos)
        prisma.cliente.findMany({
          where: {
            ...whereBase,
            pagos: {
              none: {
                fechaPago: { gte: inicioCiclo },
                tipoPago: 'regular'
              }
            }
          },
          take: 10,
          orderBy: { diasVencidos: 'desc' }
        }),
        // 4. Conteo de clientes con VD PENDIENTE (sin ninguna verificación domiciliaria)
        prisma.cliente.count({
          where: {
            ...whereBase,
            verificaciones: { none: {} }
          }
        }),
        // 5. Lista de clientes con VD pendiente (máximo 5 para mostrar en dashboard)
        prisma.cliente.findMany({
          where: {
            ...whereBase,
            verificaciones: { none: {} }
          },
          select: {
            id: true,
            nombreCompleto: true,
            codigoCliente: true,
            direccionCompleta: true,
            saldoActual: true,
            diasVencidos: true,
            fechaVenta: true,
          },
          orderBy: { fechaVenta: 'asc' }, // Las más antiguas primero (más urgentes)
          take: 5,
        })
      ]);

      return NextResponse.json({
        stats: {
          totalCobrado: hoyResult._sum.monto ? parseFloat(hoyResult._sum.monto.toString()) : 0,
          cuentasCobradas: hoyResult._count.id || 0,
          clientesPendientes: clientesPendientesCount || 0,
          efectividad: clientesPendientesCount > 0 
            ? Math.round((hoyResult._count.id / (hoyResult._count.id + clientesPendientesCount)) * 100) 
            : 100,
          vdPendientes: vdPendientesCount || 0,
        },
        proximosClientes: proximosClientes.map(c => ({
          id: c.id,
          nombre: c.nombreCompleto,
          direccion: c.direccionCompleta,
          saldo: parseFloat(c.saldoActual.toString()),
          vencido: parseFloat(c.saldoVencido.toString()),
          diaPago: c.diaPago
        })),
        clientesVdPendientes: clientesVdPendientes.map(c => ({
          id: c.id,
          nombre: c.nombreCompleto,
          codigo: c.codigoCliente,
          direccion: c.direccionCompleta,
          saldo: parseFloat(c.saldoActual.toString()),
          diasVencidos: c.diasVencidos,
          fechaVenta: c.fechaVenta.toISOString(),
        }))
      });
    } catch (dbError) {
      console.error('Error de base de datos en dashboard:', dbError);
      return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error al obtener dashboard de cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
