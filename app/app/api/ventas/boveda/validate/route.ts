
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !['admin', 'gestor_cobranza', 'jefe_ventas'].includes(session.user?.role as string)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { id, status, motivoRechazo } = await request.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'ID y Status son requeridos' }, { status: 400 });
        }

        const documento = await prisma.documentoBoveda.update({
            where: { id },
            data: {
                status,
                motivoRechazo: status === 'RECHAZADO' ? motivoRechazo : null,
                validadoPorId: session.user?.id,
                fechaValidacion: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            documento
        });

    } catch (error: any) {
        console.error('Error en boveda validate:', error);
        return NextResponse.json({ 
            error: 'Error al validar documento',
            details: error.message 
        }, { status: 500 });
    }
}
