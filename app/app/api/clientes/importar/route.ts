import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { StatusCuenta, Periodicidad } from '@prisma/client';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions) as any;
        if (!session || (session.user?.role !== 'admin' && session.user?.role !== 'gestor_cobranza' && session.user?.role !== 'gestor')) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { clientes } = body;

        let createdCount = 0;
        let failedCount = 0;

        for (const c of clientes) {
            try {
                const codigoCliente = c.codigoCliente?.toString().trim();
                if (!codigoCliente) {
                    failedCount++;
                    continue;
                }

                const data = {
                    nombreCompleto: c.nombreCompleto,
                    direccionCompleta: c.direccionCompleta,
                    telefono: c.telefono?.toString() || null,
                    fechaVenta: c.fechaVenta ? new Date(c.fechaVenta) : new Date(),
                    diaPago: String(c.diaPago || "1"),
                    montoPago: parseFloat(c.montoPago) || 0,
                    saldoActual: parseFloat(c.saldoActual) || 0,
                    periodicidad: (c.periodicidad as Periodicidad) || Periodicidad.semanal,
                    statusCuenta: StatusCuenta.activo,
                    descripcionProducto: c.descripcionProducto || "Importación Masiva",
                    importe1: parseFloat(c.importe1) || null,
                    importe2: parseFloat(c.importe2) || null,
                    importe3: parseFloat(c.importe3) || null,
                    importe4: parseFloat(c.importe4) || null,
                    diasVencidos: parseInt(c.diasVencidos) || 0,
                    saldoVencido: parseFloat(c.saldoVencido) || 0,
                    vendedor: c.vendedor || null,
                };

                await prisma.cliente.upsert({
                    where: { codigoCliente },
                    update: data,
                    create: {
                        ...data,
                        codigoCliente,
                    }
                });
                createdCount++;
            } catch (e) {
                console.error("Error creating/updating client:", e);
                failedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            created: createdCount,
            failed: failedCount
        });

    } catch (error) {
        console.error('Error importing clients:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
