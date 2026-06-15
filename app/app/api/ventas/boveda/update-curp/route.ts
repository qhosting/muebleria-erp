
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        const hasModuleAccess = await checkPermission(userRole, 'ventas');

        if (!hasModuleAccess) {
            return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
        }

        const body = await request.json();
        const { currentCurp, currentNombre, newCurp, newCodigo, newContrato, newTelefono, newNombre } = body;

        const db = prisma as any;

        // Armamos el objeto de actualización con los datos proveídos
        const updateData: any = {};
        if (newCurp !== undefined && newCurp !== '') updateData.clienteCurp = newCurp.toUpperCase();
        if (newCodigo !== undefined) updateData.codigoCliente = newCodigo.toUpperCase();
        if (newContrato !== undefined) updateData.folioContrato = newContrato.toUpperCase();
        if (newTelefono !== undefined) updateData.telefono = newTelefono;
        if (newNombre !== undefined && newNombre !== '') updateData.nombreCliente = newNombre.toUpperCase();

        // Actualizamos todos los registros que coincidan con el cliente actual
        const result = await db.documentoBoveda.updateMany({
            where: {
                nombreCliente: currentNombre,
                clienteCurp: currentCurp || null
            },
            data: updateData
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
