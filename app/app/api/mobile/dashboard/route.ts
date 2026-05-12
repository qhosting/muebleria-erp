
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

    const isAdminOrSupervisor = ['admin', 'gestor_cobranza', 'reporte_cobranza'].includes(userRole);

    if (!isAdminOrSupervisor && userRole !== 'cobrador') {
      return NextResponse.json({ error: 'No autorizado para esta vista' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario no encontrado en sesión' }, { status: 400 });
    }

    // Lógica de ciclo semanal: Sábado a Viernes
    const hoy = new Date();
    const inicioHoy = new Date(hoy);
    inicioHoy.setHours(0, 0, 0, 0);

    const dayOfWeek = hoy.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffToSaturday = (dayOfWeek + 1) % 7; 
    const inicioCiclo = new Date(hoy);
    inicioCiclo.setDate(hoy.getDate() - diffToSaturday);
    inicioCiclo.setHours(0, 0, 0, 0);

    try {
      const [hoyResult, clientesPendientesCount, proximosClientes] = await Promise.all([
        // 1. Cobrado hoy (Optimizado con índice)
        prisma.pago.aggregate({
          where: {
            cobradorId: userId,
            fechaPago: { gte: inicioHoy },
          },
          _sum: { monto: true },
          _count: { id: true }
        }),
        // 2. Clientes pendientes (Optimizado con índice)
        prisma.cliente.count({
          where: {
            cobradorAsignadoId: userId,
            statusCuenta: 'activo',
            pagos: {
              none: {
                fechaPago: { gte: inicioCiclo },
                tipoPago: 'regular'
              }
            }
          }
        }),
        // 3. Próximos clientes a visitar (Limitado a 10 para velocidad)
        prisma.cliente.findMany({
          where: {
            cobradorAsignadoId: userId,
            statusCuenta: 'activo',
            pagos: {
              none: {
                fechaPago: { gte: inicioCiclo },
                tipoPago: 'regular'
              }
            }
          },
          take: 10,
          orderBy: {
            diasVencidos: 'desc'
          }
        })
      ]);

      return NextResponse.json({
        stats: {
          totalCobrado: hoyResult._sum.monto ? parseFloat(hoyResult._sum.monto.toString()) : 0,
          cuentasCobradas: hoyResult._count.id || 0,
          clientesPendientes: clientesPendientesCount || 0,
          efectividad: clientesPendientesCount > 0 
            ? Math.round((hoyResult._count.id / (hoyResult._count.id + clientesPendientesCount)) * 100) 
            : 100
        },
        proximosClientes: proximosClientes.map(c => ({
          id: c.id,
          nombre: c.nombreCompleto,
          direccion: c.direccionCompleta,
          saldo: parseFloat(c.saldoActual.toString()),
          vencido: parseFloat(c.saldoVencido.toString()),
          diaPago: c.diaPago
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
