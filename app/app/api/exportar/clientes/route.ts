
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const formato = searchParams.get('formato') || 'csv';

    // Obtener todos los clientes
    const clientes = await prisma.cliente.findMany({
      include: {
        cobradorAsignado: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        codigoCliente: 'asc'
      }
    });

    if (formato === 'json') {
      return NextResponse.json({
        success: true,
        clientes: clientes.map((c: any) => ({
          codigoCliente: c.codigoCliente,
          nombreCompleto: c.nombreCompleto,
          telefono: c.telefono,
          direccion: c.direccionCompleta,
          saldoActual: c.saldoActual.toString(),
          montoPago: c.montoPago.toString(),
          diaPago: c.diaPago,
          periodicidad: c.periodicidad,
          statusCuenta: c.statusCuenta,
          cobrador: c.cobradorAsignado?.name || 'Sin asignar',
          fechaVenta: c.fechaVenta.toISOString(),
          vendedor: c.vendedor
        }))
      });
    }

    // Generar CSV
    const headers = [
      'Código Cliente',
      'Nombre',
      'Teléfono',
      'Dirección',
      'Saldo Actual',
      'Monto Pago',
      'Día Pago',
      'Periodicidad',
      'Status',
      'Cobrador',
      'Fecha Venta',
      'Vendedor'
    ];

    const rows = clientes.map((c: any) => [
      c.codigoCliente,
      c.nombreCompleto,
      c.telefono || '',
      c.direccionCompleta,
      c.saldoActual.toString(),
      c.montoPago.toString(),
      c.diaPago,
      c.periodicidad,
      c.statusCuenta,
      c.cobradorAsignado?.name || 'Sin asignar',
      c.fechaVenta.toISOString().split('T')[0],
      c.vendedor || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clientes-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('Error al exportar clientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al exportar' },
      { status: 500 }
    );
  }
}
