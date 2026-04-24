
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Verificar OTP
    const verification = await (prisma as any).otpVerification.findFirst({
      where: {
        phone: cleanPhone,
        code,
        verified: true, // El frontend ya debió verificarlo
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      return NextResponse.json({ error: 'Acceso no validado' }, { status: 401 });
    }

    // 2. Obtener datos del cliente
    const cliente = await prisma.cliente.findFirst({
      where: { telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone } },
      include: {
        pagos: {
          orderBy: { fechaPago: 'desc' },
          take: 5,
          select: {
            id: true,
            monto: true,
            fechaPago: true,
            createdAt: true
          }
        }
      }
    });

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Serializar montos (Decimal to Number)
    return NextResponse.json({
      id: cliente.id,
      nombreCompleto: cliente.nombreCompleto,
      codigoCliente: cliente.codigoCliente,
      saldoActual: Number(cliente.saldoActual),
      montoPago: Number(cliente.montoPago),
      diaPago: cliente.diaPago,
      periodicidad: cliente.periodicidad,
      statusCuenta: cliente.statusCuenta,
      pagos: cliente.pagos.map(p => ({
        ...p,
        monto: Number(p.monto)
      }))
    });

  } catch (error: any) {
    console.error('Error consulta saldo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
