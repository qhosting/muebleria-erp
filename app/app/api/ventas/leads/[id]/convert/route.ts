import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const leadId = params.id;
    const body = await request.json();

    // 1. Obtener el lead original
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    if ((session.user as any).role === 'vendedor' && lead.vendedorId !== (session.user as any).id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 2. Crear el Cliente en estado PENDIENTE
    const result = await prisma.$transaction(async (tx) => {
      // Generar un código temporal si no existe
      const tempCodigo = `PROSP-${leadId.substring(0, 8).toUpperCase()}`;
      
      const cliente = await tx.cliente.create({
        data: {
          codigoCliente: tempCodigo,
          fechaVenta: new Date(),
          nombreCompleto: body.nombre || lead.nombre,
          telefono: body.telefono || lead.telefono || '',
          direccionCompleta: `${body.calle} ${body.numeroExterior}, ${body.colonia}`,
          descripcionProducto: lead.interes || 'Producto por definir',
          diaPago: 'Sábado',
          montoPago: body.pagoSemanalSugerido ? Number(body.pagoSemanalSugerido) : 0,
          periodicidad: 'semanal',
          saldoActual: lead.montoEstimado || 0,
          calle: body.calle,
          numeroExterior: body.numeroExterior,
          colonia: body.colonia,
          codigoPostal: body.codigoPostal,
          ciudad: body.ciudad,
          referenciaDireccion: body.referenciaDireccion,
          tipoPropiedad: body.tipoPropiedad || 'PROPIA',
          ingresosMensuales: body.ingresosMensuales ? Number(body.ingresosMensuales) : null,
          vendedorId: lead.vendedorId || (session.user as any).id,
          statusAprobacion: 'PENDIENTE',
          observaciones: `Convertido desde Lead: ${lead.notas || ''}`,
          zona: lead.direccionArea,
          scoreBuro: body.scoreBuro ? Number(body.scoreBuro) : 0,
        },
      });

      // 3. Marcar el Lead como ganado/convertido
      await tx.lead.update({
        where: { id: leadId },
        data: {
          estado: 'convertido' as any,
        },
      });

      return cliente;
    });

    return NextResponse.json({ 
      success: true, 
      clienteId: result.id,
      message: 'Lead convertido exitosamente' 
    });
  } catch (error: any) {
    console.error('Error en conversión de Lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
