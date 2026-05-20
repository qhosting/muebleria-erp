import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        // 1. Validar sesión
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 2. Obtener CURP del query param
        const { searchParams } = new URL(request.url);
        const curp = searchParams.get('curp');

        if (!curp) {
            return NextResponse.json({ error: 'El parámetro CURP es requerido' }, { status: 400 });
        }

        // 3. Consultar base de datos para todas las cuentas de este cliente (por CURP)
        const db = prisma as any;
        const cuentas = await db.cliente.findMany({
            where: {
                curp: curp
            },
            orderBy: {
                fechaVenta: 'desc'
            },
            select: {
                id: true,
                codigoCliente: true,
                nombreCompleto: true,
                numContrato: true,
                fechaVenta: true,
                statusCuenta: true,
                descripcionProducto: true,
                montoPago: true,
                periodicidad: true,
                saldoActual: true,
                saldoVencido: true,
                diasVencidos: true,
                createdAt: true
            }
        });

        // 4. Retornar los registros
        return NextResponse.json(cuentas);

    } catch (error: any) {
        console.error('[Cliente Historial API] Error:', error);
        return NextResponse.json({ 
            error: 'Error interno del servidor al procesar la consulta de historial del cliente',
            details: error.message 
        }, { status: 500 });
    }
}
