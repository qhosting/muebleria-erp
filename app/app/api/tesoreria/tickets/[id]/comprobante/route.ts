import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: { cliente: true }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
        }

        if (ticket.urlComprobante) {
            const isBase64 = ticket.urlComprobante.startsWith('data:');
            return NextResponse.json({
                found: true,
                url: isBase64 ? undefined : ticket.urlComprobante,
                base64: isBase64 ? ticket.urlComprobante : undefined,
                type: isBase64 ? 'base64' : 'url'
            });
        }

        // Buscar en buzon_tesoreria por ticketId exacto, contrato o metadatos
        // IMPORTANTE: Excluir referencias genericas bancarias como '1858' (Oxxo convenio) para evitar contaminacion cruzada
        const orConditions: any[] = [
            { metadata: { path: ['ticketId'], equals: ticket.id } }
        ];

        if (ticket.cliente?.codigoCliente) {
            orConditions.push({ contractId: ticket.cliente.codigoCliente });
            orConditions.push({ metadata: { path: ['contrato'], equals: ticket.cliente.codigoCliente } });
        }
        if (ticket.folio && ticket.folio !== 'null' && ticket.folio !== 'N/A' && ticket.folio.length >= 4) {
            orConditions.push({ metadata: { path: ['folio'], equals: ticket.folio } });
        }
        if (ticket.claveRastreo && ticket.claveRastreo !== 'null' && ticket.claveRastreo !== 'N/A' && ticket.claveRastreo.length >= 6) {
            orConditions.push({ metadata: { path: ['claverastreo'], equals: ticket.claveRastreo } });
        }
        if (ticket.referencia && ticket.referencia !== '1858' && ticket.referencia !== 'null' && ticket.referencia.length >= 6) {
            orConditions.push({ referencia: ticket.referencia });
        }

        let buzon = null;
        if (orConditions.length > 0) {
            buzon = await (prisma as any).buzonTesoreria.findFirst({
                where: { OR: orConditions },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (buzon) {
            if (buzon.urlImagen) {
                return NextResponse.json({
                    found: true,
                    url: buzon.urlImagen,
                    type: 'url',
                    metadata: buzon.metadata
                });
            }
            if (buzon.base64Data) {
                const base64Clean = buzon.base64Data.startsWith('data:')
                    ? buzon.base64Data
                    : `data:image/jpeg;base64,${buzon.base64Data}`;

                return NextResponse.json({
                    found: true,
                    base64: base64Clean,
                    type: 'base64',
                    metadata: buzon.metadata
                });
            }
        }

        return NextResponse.json({
            found: false,
            message: 'Comprobante visual no disponible para este ticket'
        });
    } catch (error: any) {
        console.error('Error al obtener comprobante:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
