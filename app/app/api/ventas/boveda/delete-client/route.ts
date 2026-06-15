
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
        const isAdmin = ['admin', 'jefe_ventas', 'gestor_cobranza', 'administrador', 'direccion'].includes(userRole);

        if (!isAdmin) {
            return NextResponse.json({ error: 'No tienes permisos para realizar esta acción' }, { status: 403 });
        }

        const body = await request.json();
        const { curp, nombre } = body;

        if (!nombre) {
            return NextResponse.json({ error: 'Nombre de cliente requerido' }, { status: 400 });
        }

        const db = prisma as any;

        const whereClause: any = {
            nombreCliente: nombre
        };

        if (curp) {
            whereClause.clienteCurp = curp;
        } else {
            whereClause.OR = [
                { clienteCurp: null },
                { clienteCurp: "" }
            ];
        }
        
        // Buscar todos los documentos del cliente para borrarlos físicamente
        const documentos = await db.documentoBoveda.findMany({
            where: whereClause
        });

        // Eliminar archivos físicos
        for (const doc of documentos) {
            if (doc.url && doc.url.startsWith('/uploads/')) {
                const filePath = join(process.cwd(), 'public', doc.url);
                try {
                    await unlink(filePath);
                } catch (err) {
                    console.error(`Error al eliminar archivo físico ${doc.url}:`, err);
                }
            }
        }

        // Eliminar registros de base de datos
        const result = await db.documentoBoveda.deleteMany({
            where: whereClause
        });

        return NextResponse.json({ 
            success: true, 
            message: `Se eliminó el expediente completo (${result.count} documentos)`,
            count: result.count
        });

    } catch (error: any) {
        console.error('Error en boveda delete-client:', error);
        return NextResponse.json({ 
            error: 'Error al eliminar expediente',
            details: error.message 
        }, { status: 500 });
    }
}
