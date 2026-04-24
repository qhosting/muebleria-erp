
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

        // Buscamos movimientos bancarios con el mismo monto que no estén conciliados
        const movimientos = await prisma.movimientoBancario.findMany({
            where: {
                ticketId: null,
                abono: Number(monto)
            }
        });

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
            // Nota: La prioridad 4 (Hora) es más lenta de calcular con precisión de +/- 5 min, se deja para refinamiento posterior

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
