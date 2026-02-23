
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { getDayName } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const formato = searchParams.get('formato') || 'csv';

    // Obtener todos los clientes con sus cobradores
    const clientes = await prisma.cliente.findMany({
      include: {
        cobradorAsignado: {
          select: {
            name: true,
            email: true,
            codigoGestor: true
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

    if (formato === 'xlsx') {
      const legacyHeaders = [
        "Codigo cliente", "Cuenta", "Contrato", "Periodo Inicial",
        "Nombre del Cliente", "Peridiodo de Pago", "Pago Sugerido",
        "Saldo Vencido", "PV", "Saldo Actual", "Codigo Gestor",
        "SUP", "Moratorio", "PVR", "Pago", "Dia de Pago",
        "Tipo de Cobro", "Telefono 1", "Telefono 2", "C", "Dia de cobro"
      ];

      const rows = clientes.map((c: any) => {
        // Intentar extraer el contrato del código (ej: DQ2408097 -> 2408097 o similar)
        // Si no, usar el código completo
        const contratoStr = c.codigoCliente.replace(/^\D+/, '');

        return [
          c.codigoCliente,
          0, // Cuenta
          contratoStr || c.codigoCliente,
          0, // Periodo Inicial
          c.nombreCompleto,
          c.periodicidad.toUpperCase(),
          Number(c.montoPago),
          0, // Saldo Vencido (Placeholder)
          221, // PV (Placeholder legacy)
          Number(c.saldoActual),
          c.cobradorAsignado?.codigoGestor || "",
          0, // SUP
          0, // Moratorio
          0, // PVR
          0, // Pago
          c.diaPago,
          0, // Tipo de Cobro
          c.telefono || "",
          "", // Telefono 2
          1, // C
          getDayName(c.diaPago).toUpperCase()
        ];
      });

      // Crear Libro de Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([legacyHeaders, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Clientes");

      // Generar Buffer
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="clientes-legacy-${new Date().toISOString().split('T')[0]}.xlsx"`
        }
      });
    }

    // Generar CSV (Original)
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

    const csvLines = [
      headers.join(','),
      ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csvLines, {
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
