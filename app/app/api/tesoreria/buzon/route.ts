
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const db = prisma as any;

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const estado = searchParams.get('estado') || 'PENDIENTE';

        // 1. Limpieza automática de registros mayores a 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        try {
            await db.buzonTesoreria.deleteMany({
                where: {
                    createdAt: { lt: thirtyDaysAgo }
                }
            });
        } catch (cleanupError) {
            console.error("Error en limpieza de buzón:", cleanupError);
        }

        // 2. Obtener los registros de la cola
        const buzon = await db.buzonTesoreria.findMany({
            where: estado !== 'TODO' ? { estado } : {},
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json(buzon);

    } catch (error: any) {
        console.error('Error en API de buzón tesorería:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id, accion } = await req.json();

        if (accion === 'RECHAZAR') {
            await db.buzonTesoreria.update({
                where: { id },
                data: { estado: 'RECHAZADO' }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
