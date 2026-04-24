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
        const { clienteId, fecha, detallesExtra } = body;
        const userId = (session.user as any).id;

        if (!clienteId || !fecha) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        const verificacion = await (prisma as any).verificacionDomiciliaria.create({
            data: {
                clienteId,
                gestorId: userId,
                fecha: new Date(fecha),
                detallesExtra,
            },
        });

        return NextResponse.json(verificacion);
    } catch (error) {
        console.error('Error al crear verificación:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
