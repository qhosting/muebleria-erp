
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

    const hoy = new Date();
    const inicioDia = new Date(hoy);
    inicioDia.setHours(0, 0, 0, 0);

    const dayOfWeek = hoy.getDay(); 
    const diffToSaturday = (dayOfWeek + 1) % 7; 
    const inicioCiclo = new Date(hoy);
    inicioCiclo.setDate(hoy.getDate() - diffToSaturday);
    inicioCiclo.setHours(0, 0, 0, 0);

    const [cobradoHoy, clientesPendientes, proximosClientes] = await Promise.all([
      // Suma de cobrado hoy por este cobrador
      prisma.pago.aggregate({
        _sum: { monto: true },
        where: {
          cobradorId: isAdminOrSupervisor ? undefined : userId,
          fechaPago: { gte: inicioDia }
        }
      }),
      // Conteo de clientes asignados con saldo pendiente que NO han pagado esta semana
      prisma.cliente.count({
        where: {
          cobradorAsignadoId: isAdminOrSupervisor ? undefined : userId,
          statusCuenta: 'activo',
          saldoActual: { gt: 0 },
          pagos: {
            none: {
              fechaPago: { gte: inicioCiclo },
              tipoPago: 'regular'
            }
          }
        }
      }),
      // Lista de los próximos 5 clientes pendientes reales
      prisma.cliente.findMany({
        where: {
          cobradorAsignadoId: isAdminOrSupervisor ? undefined : userId,
          statusCuenta: 'activo',
          saldoActual: { gt: 0 },
          pagos: {
            none: {
              fechaPago: { gte: inicioCiclo },
              tipoPago: 'regular'
            }
          }
        },
        take: 5,
        orderBy: {
          updatedAt: 'desc'
        }
      })
    ]);

    return NextResponse.json({
      cobradoHoy: cobradoHoy._sum.monto ? parseFloat(cobradoHoy._sum.monto.toString()) : 0,
      clientesPendientes,
      proximosClientes: proximosClientes.map(c => ({
        id: c.id,
        nombre: c.nombreCompleto,
        direccion: c.direccionCompleta,
        saldo: parseFloat(c.saldoActual.toString()),
        pagoSugerido: parseFloat(c.montoPago.toString()),
        periodicidad: c.periodicidad
      })),
      rutaNombre: isAdminOrSupervisor ? "Consolidado General" : `Ruta de ${session.user.name || 'Cobranza'}`
    });

  } catch (error) {
    console.error('Error al obtener dashboard de cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
