import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { contrato, montoVenta, piezas } = body;

    // Validación básica de campos
    if (!contrato || typeof contrato !== 'string' || contrato.trim() === '') {
      return NextResponse.json({ error: 'El folio de contrato es obligatorio' }, { status: 400 });
    }

    const parsedMonto = Number(montoVenta);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      return NextResponse.json({ error: 'El monto de venta debe ser un número mayor a cero' }, { status: 400 });
    }

    const parsedPiezas = parseInt(piezas);
    if (isNaN(parsedPiezas) || parsedPiezas <= 0) {
      return NextResponse.json({ error: 'La cantidad de piezas debe ser mayor a cero' }, { status: 400 });
    }

    const cleanContrato = contrato.trim();
    const tempCodigo = `TEMP-VND-${cleanContrato}`;

    // 1. Validar si el folio de contrato físico ya existe
    const existingContract = await prisma.cliente.findFirst({
      where: {
        OR: [
          { numContrato: cleanContrato },
          { codigoCliente: tempCodigo },
          { codigoCliente: cleanContrato }
        ]
      }
    });

    if (existingContract) {
      return NextResponse.json({ 
        error: `El folio de contrato "${cleanContrato}" ya está registrado` 
      }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || 'Vendedor';

    // Obtener equipo del vendedor si aplica
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { equipoMiembroId: true }
    });

    // 2. Registrar el Cliente/Venta en estado AUTORIZADO
    // Dado que es una venta directa y se ingresa para metas directas, podemos marcarla como AUTORIZADO
    const cliente = await prisma.cliente.create({
      data: {
        codigoCliente: tempCodigo,
        numContrato: cleanContrato,
        fechaVenta: new Date(),
        nombreCompleto: `Cliente Contrato ${cleanContrato}`,
        direccionCompleta: 'Venta Directa Registrada desde Móvil',
        descripcionProducto: 'Venta Directa',
        diaPago: 'Sábado',
        montoPago: parsedMonto,
        periodicidad: 'semanal',
        saldoActual: 0,
        piezas: parsedPiezas,
        vendedorId: userId,
        vendedor: userName,
        equipoId: user?.equipoMiembroId || null,
        statusAprobacion: 'AUTORIZADO', // Venta cerrada/aprobada directamente
        statusCuenta: 'activo'
      }
    });

    return NextResponse.json({
      success: true,
      clienteId: cliente.id,
      message: 'Venta registrada exitosamente'
    });

  } catch (error: any) {
    console.error('Error al registrar venta directa:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
