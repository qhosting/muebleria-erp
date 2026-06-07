export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['admin', 'gestor_cobranza'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (!ticketId) {
            return NextResponse.json({ error: 'Ticket ID requerido' }, { status: 400 });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { cliente: true }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        const { monto, folio, referencia, cliente } = ticket;
        const contrato = cliente?.codigoCliente || '';
        const nombreCliente = cliente?.nombreCompleto || '';
        const nombreBusqueda = nombreCliente.substring(0, 20);

        // Buscamos movimientos bancarios con el mismo monto que no estén conciliados en las 3 tablas
        const [m1, m2, m3] = await Promise.all([
            prisma.movimientoSantander22001022837.findMany({
                where: {
                    ticketId: null,
                    abono: Number(monto)
                }
            }),
            prisma.movimientoSantander65505732541.findMany({
                where: {
                    ticketId: null,
                    abono: Number(monto)
                }
            }),
            prisma.movimientoBanorte0330253963.findMany({
                where: {
                    ticketId: null,
                    abono: Number(monto)
                }
            })
        ]);

        const movimientos = [
            ...m1.map(m => ({ ...m, tabla: 'movimientoSantander22001022837', cuentaDestino: '22001022837', bancoDestino: 'SANTANDER' })),
            ...m2.map(m => ({ ...m, tabla: 'movimientoSantander65505732541', cuentaDestino: '65505732541', bancoDestino: 'SANTANDER' })),
            ...m3.map(m => ({ ...m, tabla: 'movimientoBanorte0330253963', cuentaDestino: '0330253963', bancoDestino: 'BANORTE' }))
        ];

        // Aplicar lógica de scoring/prioridad
        const sugerencias = movimientos.map(mov => {
            let prioridad = 5; // Por defecto: Solo coincide el monto
            let razon = "Coincidencia de Monto";

            const concepto = (mov.concepto || '').toUpperCase();
            const descripcion = (mov.descripcionDetallada || '').toUpperCase();

            if (contrato && (concepto.includes(contrato) || descripcion.includes(contrato))) {
                prioridad = 1;
                razon = "Coincidencia de Contrato/Código";
            } else if (folio && (concepto.includes(folio.toUpperCase()) || descripcion.includes(folio.toUpperCase()))) {
                prioridad = 2;
                razon = "Coincidencia de Folio";
            } else if (nombreBusqueda && (concepto.includes(nombreBusqueda.toUpperCase()) || descripcion.includes(nombreBusqueda.toUpperCase()))) {
                prioridad = 3;
                razon = "Coincidencia de Nombre";
            }

            return {
                ...mov,
                prioridad,
                razon
            };
        })
            .sort((a, b) => a.prioridad - b.prioridad);

        return NextResponse.json(sugerencias);

    } catch (error: any) {
        console.error('Error al generar sugerencias:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
