import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nombre = searchParams.get('nombre');
  const curp = searchParams.get('curp');
  const exclude = searchParams.get('exclude');

  if (!nombre && !curp) {
    return NextResponse.json({ error: 'Nombre o CURP requeridos' }, { status: 400 });
  }

  try {
    const vinculados = await prisma.cliente.findMany({
      where: {
        OR: [
          nombre ? { nombreCompleto: { contains: nombre, mode: 'insensitive' } } : {},
          curp ? { curp: curp } : {}
        ],
        NOT: exclude ? { id: exclude } : {}
      },
      select: {
        id: true,
        codigoCliente: true,
        nombreCompleto: true,
        saldoActual: true,
        statusCuenta: true,
        sucursal: {
          select: {
            nombre: true
          }
        }
      }
    });

    return NextResponse.json(vinculados);
  } catch (error) {
    return NextResponse.json({ error: 'Error al buscar vinculados' }, { status: 500 });
  }
}
