import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
                // Generar código único si no viene
                const codigo = c.codigoCliente || `C${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

                await prisma.cliente.create({
                    data: {
                        codigoCliente: codigo,
                        nombreCompleto: c.nombreCompleto,
                        direccionCompleta: c.direccionCompleta,
                        telefono: c.telefono,
                        fechaVenta: new Date(),
                        diaPago: String(c.diaPago || "1"),
                        montoPago: parseFloat(c.montoPago),
                        saldoActual: parseFloat(c.saldoActual),
                        periodicidad: "semanal", // Default
                        statusCuenta: "activo",
                        descripcionProducto: "Importación Masiva",
                        importe1: parseFloat(c.montoPago),
                    }
                });
                createdCount++;
            } catch (e) {
                console.error("Error creating client:", e);
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
