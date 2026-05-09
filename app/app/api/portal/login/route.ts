import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { phone, curp } = await req.json();

    if (!phone || !curp) {
      return NextResponse.json({ error: 'WhatsApp y CURP requeridos' }, { status: 400 });
    }

    // Buscar clientes que coincidan con el teléfono y la CURP
    // Limpiamos el teléfono de caracteres no numéricos para una búsqueda más flexible
    const cleanPhone = phone.replace(/\D/g, '');

    const clients = await prisma.cliente.findMany({
      where: {
        AND: [
          { curp: { equals: curp.trim(), mode: 'insensitive' } },
          { 
            telefono: { 
              contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone 
            } 
          }
        ]
      },
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        saldoActual: true,
        montoPago: true,
        diaPago: true,
        periodicidad: true,
        statusCuenta: true,
        sucursal: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (clients.length === 0) {
      return NextResponse.json({ error: 'Credenciales inválidas. Verifique su número de WhatsApp y CURP.' }, { status: 401 });
    }

    // Serializar Decimals a numbers
    const serializedClients = clients.map(c => ({
      ...c,
      saldoActual: Number(c.saldoActual),
      montoPago: Number(c.montoPago)
    }));

    return NextResponse.json({
      success: true,
      clients: serializedClients,
      // Para el portal simple, devolvemos el nombre del cliente (del primer registro)
      customerName: serializedClients[0].nombreCompleto
    });

  } catch (error) {
    console.error('Portal Login Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
