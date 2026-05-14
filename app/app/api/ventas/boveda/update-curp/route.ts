
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = ((session.user as any).role || '').toLowerCase();
        const isAdmin = ['admin', 'jefe_ventas', 'gestor_cobranza', 'administrador'].includes(userRole);

        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
        }

        const body = await request.json();
        const { currentCurp, currentNombre, newCurp } = body;

        if (!newCurp) {
            return NextResponse.json({ error: 'Nuevo CURP requerido' }, { status: 400 });
        }

        const db = prisma as any;

        // Actualizamos todos los registros que coincidan con el cliente actual
        const result = await db.documentoBoveda.updateMany({
            where: {
                nombreCliente: currentNombre,
                clienteCurp: currentCurp || null
            },
            data: {
                clienteCurp: newCurp.toUpperCase()
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Se actualizaron ${result.count} documentos`,
            count: result.count
        });

    } catch (error: any) {
        console.error('Error en boveda update-curp:', error);
        return NextResponse.json({ 
            error: 'Error al actualizar CURP',
            details: error.message 
        }, { status: 500 });
    }
}
