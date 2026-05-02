
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== 'cobrador' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Solo para cobradores' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || '';

    // Lógica de ciclo semanal: Sábado a Viernes
    const hoy = new Date();
    const dayOfWeek = hoy.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
    const diffToSaturday = (dayOfWeek + 1) % 7; 
    const inicioCiclo = new Date(hoy);
    inicioCiclo.setDate(hoy.getDate() - diffToSaturday);
    inicioCiclo.setHours(0, 0, 0, 0);

    const clientes = await prisma.cliente.findMany({
      where: {
        cobradorAsignadoId: userRole === 'admin' ? undefined : userId,
        statusCuenta: 'activo',
        OR: [
          { nombreCompleto: { contains: search, mode: 'insensitive' } },
          { codigoCliente: { contains: search, mode: 'insensitive' } },
          { direccionCompleta: { contains: search, mode: 'insensitive' } }
        ]
      },
      include: {
        pagos: {
          where: {
            fechaPago: { gte: inicioCiclo },
            tipoPago: 'regular'
          },
          take: 1
        }
      },
      orderBy: {
        nombreCompleto: 'asc'
      }
    });

    return NextResponse.json(clientes.map(c => ({
        id: c.id,
        nombre: c.nombreCompleto,
        direccion: c.direccionCompleta,
        saldo: parseFloat(c.saldoActual.toString()),
        pagoSemanal: parseFloat(c.montoPago.toString()),
        telefono: c.telefono,
        estatus: c.saldoVencido.toNumber() > 0 ? 'atrasado' : 'aldia',
        yaPagoEstaSemana: c.pagos.length > 0
    })));

  } catch (error) {
    console.error('Error al obtener clientes del cobrador:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
