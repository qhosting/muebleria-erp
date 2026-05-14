
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const curp = searchParams.get('curp');
        const codigo = searchParams.get('codigo');
        const folio = searchParams.get('folio');
        const search = searchParams.get('search');
        const mine = searchParams.get('mine') === 'true';

        const db = prisma as any;

        // Si se solicita "mis documentos" (recientes)
        if (mine) {
            const documentos = await db.documentoBoveda.findMany({
                where: { vendedorId: (session.user as any).id },
                orderBy: { createdAt: 'desc' },
                take: 15
            });

            // Agrupar por expediente (CURP/Nombre)
            const expedientes: any[] = [];
            const seenKeys = new Set();

            documentos.forEach((doc: any) => {
                const key = doc.clienteCurp || doc.nombreCliente || doc.folioContrato;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    expedientes.push({
                        nombreCompleto: doc.nombreCliente,
                        curp: doc.clienteCurp,
                        codigoCliente: doc.codigoCliente,
                        folioContrato: doc.folioContrato,
                        recent: true // Marca para UI
                    });
                }
            });

            return NextResponse.json(expedientes);
        }

        // Si hay un término de búsqueda general, buscamos de forma más amplia
        if (search) {
            const documentos = await db.documentoBoveda.findMany({
                where: {
                    OR: [
                        { nombreCompleto: { contains: search, mode: 'insensitive' } },
                        { clienteCurp: { contains: search, mode: 'insensitive' } },
                        { codigoCliente: { contains: search, mode: 'insensitive' } },
                        { folioContrato: { contains: search, mode: 'insensitive' } }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            // Agrupar por CURP para devolver "expedientes" únicos en la búsqueda
            const expedientes: any[] = [];
            const seenCurps = new Set();

            documentos.forEach((doc: any) => {
                const key = doc.clienteCurp || doc.nombreCompleto;
                if (!seenCurps.has(key)) {
                    seenCurps.add(key);
                    expedientes.push({
                        nombreCompleto: doc.nombreCompleto,
                        curp: doc.clienteCurp,
                        codigoCliente: doc.codigoCliente,
                        folioContrato: doc.folioContrato,
                    });
                }
            });

            return NextResponse.json(expedientes);
        }

        const documentos = await db.documentoBoveda.findMany({
            where: {
                OR: [
                    { clienteCurp: curp || undefined },
                    { codigoCliente: codigo || undefined },
                    { folioContrato: folio || undefined }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                validadoPor: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return NextResponse.json(documentos);

    } catch (error: any) {
        console.error('Error en boveda list:', error);
        return NextResponse.json({ 
            error: 'Error al listar documentos',
            details: error.message 
        }, { status: 500 });
    }
}
