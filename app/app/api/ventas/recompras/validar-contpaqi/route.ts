
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { leadId } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead || !lead.clienteId) {
            return NextResponse.json({ error: 'Lead no válido o sin cliente asociado' }, { status: 404 });
        }

        const cliente = await prisma.cliente.findUnique({
            where: { id: lead.clienteId }
        });

        if (!cliente || !cliente.codigoCliente) {
            return NextResponse.json({ error: 'Cliente no tiene código de Contpaqi' }, { status: 404 });
        }

        const service = await getContpaqiService(prisma, cliente.sucursalId || undefined);
        const contpaqiCliente = await service.getCliente(cliente.codigoCliente);

        if (!contpaqiCliente) {
            return NextResponse.json({ error: 'No se encontró el cliente en Contpaqi' }, { status: 404 });
        }

        // --- NUEVA BÚSQUEDA DE CUENTA ACTIVA ---
        // Buscamos si el cliente ya tiene una cuenta activa en nuestro sistema (posible recompra ya realizada)
        // Buscamos por nombre aproximado para mayor seguridad
        const cuentasActivas = await prisma.cliente.findMany({
            where: {
                nombreCompleto: {
                    contains: lead.nombre,
                    mode: 'insensitive'
                },
                statusCuenta: 'activo',
                id: { not: lead.clienteId || '' } // Que no sea la misma cuenta liquidada
            },
            select: {
                id: true,
                codigoCliente: true,
                descripcionProducto: true,
                fechaVenta: true,
                saldoActual: true
            }
        });

        // Extraer clasificaciones
        const clasificaciones = {
            cNombreClasificacion1: contpaqiCliente.cNombreClasificacion1 || contpaqiCliente.cnombreclasificacion1 || 'N/A',
            cNombreClasificacion2: contpaqiCliente.cNombreClasificacion2 || contpaqiCliente.cnombreclasificacion2 || 'N/A',
            cNombreClasificacion3: contpaqiCliente.cNombreClasificacion3 || contpaqiCliente.cnombreclasificacion3 || 'N/A',
            cNombreClasificacion4: contpaqiCliente.cNombreClasificacion4 || contpaqiCliente.cnombreclasificacion4 || 'N/A',
            cNombreClasificacion5: contpaqiCliente.cNombreClasificacion5 || contpaqiCliente.cnombreclasificacion5 || 'N/A',
            cNombreClasificacion6: contpaqiCliente.cNombreClasificacion6 || contpaqiCliente.cnombreclasificacion6 || 'N/A',
        };

        return NextResponse.json({ 
            codigoCliente: cliente.codigoCliente,
            nombre: contpaqiCliente.cNombreCliente || contpaqiCliente.cnombrecliente,
            clasificaciones,
            recompraActiva: cuentasActivas.length > 0 ? cuentasActivas[0] : null
        });
    } catch (error: any) {
        console.error('Error al validar cliente en Contpaqi:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
