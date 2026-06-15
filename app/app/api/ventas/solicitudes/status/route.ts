
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;
        if (!session || !await checkPermission(userRole, 'ventas')) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id, status } = await request.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'ID y Status son requeridos' }, { status: 400 });
        }

        const solicitud = await prisma.solicitudCredito.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json({
            success: true,
            solicitud
        });

    } catch (error: any) {
        console.error('Error al actualizar solicitud:', error);
        return NextResponse.json({ 
            error: 'Error al actualizar solicitud',
            details: error.message 
        }, { status: 500 });
    }
}
