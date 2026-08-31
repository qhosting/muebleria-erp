export const dynamic = 'force-dynamic';

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

    const { id } = params;

    const pago = await prisma.pago.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            codigoCliente: true,
            nombreCompleto: true,
            telefono: true,
            direccionCompleta: true,
            calle: true,
            numeroExterior: true,
            colonia: true,
            ciudad: true,
            diaPago: true,
            saldoActual: true,
          },
        },
        cobrador: {
          select: {
            id: true,
            name: true,
            codigoGestor: true,
            email: true,
          },
        },
      },
    });

    if (!pago) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // Actualizar estado de ticket impreso
    const pagoActualizado = await prisma.pago.update({
      where: { id },
      data: {
        ticketImpreso: true,
      },
    });

    const abonoNum = parseFloat(pago.monto?.toString() || '0');
    const moraNum = parseFloat(pago.interesMoratorio?.toString() || '0');
    const gcobNum = parseFloat(pago.gastosCobranza?.toString() || '0');
    const saldoAnt = parseFloat(pago.saldoAnterior?.toString() || '0');
    const saldoNvo = parseFloat(pago.saldoNuevo?.toString() || '0');

    const codCli = (pago.cliente?.codigoCliente || '').toUpperCase();
    const esDQ = codCli.startsWith('DQ');

    const direccionStr = pago.cliente?.direccionCompleta || [
      pago.cliente?.calle,
      pago.cliente?.numeroExterior,
      pago.cliente?.colonia,
      pago.cliente?.ciudad
    ].filter(Boolean).join(', ');

    const ticketData = {
      numeroRecibo: pago.numeroRecibo || `REC-${pago.id.slice(-6)}`,
      cliente: {
        nombreCompleto: pago.cliente?.nombreCompleto || 'Cliente General',
        codigoCliente: pago.cliente?.codigoCliente || '',
        telefono: pago.cliente?.telefono || '',
        direccion: direccionStr || '',
        diaPago: pago.cliente?.diaPago || '',
      },
      cobrador: {
        nombre: pago.cobrador?.name || 'Cobrador Asignado',
        id: pago.cobrador?.username || pago.cobradorId || '',
      },
      pago: {
        monto: abonoNum,
        interesMoratorio: moraNum,
        gastosCobranza: gcobNum,
        tipoPago: pago.tipoPago || 'regular',
        metodoPago: pago.metodoPago || 'efectivo',
        concepto: pago.concepto || 'Pago de cuenta',
        fechaPago: pago.fechaPago.toISOString(),
      },
      saldos: {
        anterior: saldoAnt > 0 ? saldoAnt : saldoNvo + abonoNum,
        nuevo: saldoNvo,
      },
      empresa: {
        nombre: 'Grupo Mueblero DASO',
        direccion: 'Juarez Ote. 223, Centro, SJR. QRO',
        telefono: 'Tel: 442 980 0772',
      },
    };

    return NextResponse.json({
      success: true,
      mensaje: 'Ticket listo para reimpresión',
      pago: pagoActualizado,
      ticketData,
    });
  } catch (error: any) {
    console.error('Error en POST /api/pagos/[id]/reimprimir:', error);
    return NextResponse.json(
      { error: error.message || 'Error al reimprimir ticket' },
      { status: 500 }
    );
  }
}
