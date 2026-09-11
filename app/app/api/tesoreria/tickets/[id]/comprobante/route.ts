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

        // Buscar en buzon_tesoreria con jerarquía estricta para evitar contaminación cruzada entre clientes
        let buzon: any = null;

        // 1. Por ticketId exacto en metadata
        buzon = await (prisma as any).buzonTesoreria.findFirst({
            where: { metadata: { path: ['ticketId'], equals: ticket.id } },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Por clave de rastreo SPEI (única nacional)
        if (!buzon && ticket.claveRastreo && ticket.claveRastreo !== 'null' && ticket.claveRastreo !== 'N/A' && ticket.claveRastreo.length >= 6) {
            buzon = await (prisma as any).buzonTesoreria.findFirst({
                where: { metadata: { path: ['claverastreo'], equals: ticket.claveRastreo } },
                orderBy: { createdAt: 'desc' }
            });
        }

        // 3. Por folio bancario exacto
        if (!buzon && ticket.folio && ticket.folio !== 'null' && ticket.folio !== 'N/A' && ticket.folio.length >= 4) {
            buzon = await (prisma as any).buzonTesoreria.findFirst({
                where: { metadata: { path: ['folio'], equals: ticket.folio } },
                orderBy: { createdAt: 'desc' }
            });
        }

        // 4. Por contrato del cliente + monto del ticket (mismo cliente y mismo monto)
        if (!buzon && ticket.cliente?.codigoCliente) {
            buzon = await (prisma as any).buzonTesoreria.findFirst({
                where: {
                    contractId: ticket.cliente.codigoCliente,
                    monto: ticket.monto
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (buzon) {
            const base64Clean = buzon.base64Data
                ? (buzon.base64Data.startsWith('data:') ? buzon.base64Data : `data:image/jpeg;base64,${buzon.base64Data}`)
                : null;
            const finalImage = buzon.urlImagen || base64Clean;

            // Auto-vincular de forma permanente al ticket si no la tenía
            if (finalImage) {
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { urlComprobante: finalImage }
                }).catch(() => {});
            }

            if (buzon.urlImagen) {
                return NextResponse.json({
                    found: true,
                    url: buzon.urlImagen,
                    type: 'url',
                    metadata: buzon.metadata
                });
            }
            if (base64Clean) {
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
