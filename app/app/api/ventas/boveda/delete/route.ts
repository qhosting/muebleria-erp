
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de documento requerido' }, { status: 400 });
        }

        const db = prisma as any;
        const documento = await db.documentoBoveda.findUnique({
            where: { id }
        });

        if (!documento) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        // Eliminar archivo físico
        if (documento.url && documento.url.startsWith('/uploads/')) {
            const filePath = join(process.cwd(), 'public', documento.url);
            try {
                await unlink(filePath);
            } catch (err) {
                console.error('Error al eliminar archivo físico:', err);
                // Continuamos aunque falle el borrado físico
            }
        }

        // Eliminar registro de base de datos
        await db.documentoBoveda.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Documento eliminado correctamente' });

    } catch (error: any) {
        console.error('Error en boveda delete:', error);
        return NextResponse.json({ 
            error: 'Error al eliminar documento',
            details: error.message 
        }, { status: 500 });
    }
}
