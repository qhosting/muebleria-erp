import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { clienteId, tipoConvenio, monto, fecha, comentario, latitud, longitud } = body;
        const userId = (session.user as any).id;

        if (!clienteId || !monto || !fecha || !tipoConvenio) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        const convenio = await (prisma as any).convenioPago.create({
            data: {
                clienteId,
                gestorId: userId,
                tipoConvenio,
                monto: parseFloat(monto),
                fecha: new Date(fecha),
                comentario,
                latitud,
                longitud,
            },
        });

        return NextResponse.json(convenio);
    } catch (error) {
        console.error('Error al crear convenio:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
