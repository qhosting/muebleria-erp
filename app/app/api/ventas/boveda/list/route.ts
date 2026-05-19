
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
            const userRole = ((session.user as any).role || '').toLowerCase();
            const isAdmin = ['admin', 'jefe_ventas', 'gestor_cobranza', 'administrador'].includes(userRole);
            const status = searchParams.get('status');
            
            const documentos = await db.documentoBoveda.findMany({
                where: {
                    AND: [
                        isAdmin ? {} : { vendedorId: (session.user as any).id },
                        status ? { status } : {}
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 50 // Aumentamos el límite para admins
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
                        telefono: doc.telefono,
                        recent: true // Marca para UI
                    });
                }
            });

            return NextResponse.json(expedientes);
        }

        // Si hay un término de búsqueda general, buscamos de forma más amplia
        if (search) {
            const status = searchParams.get('status');
            
            const documentos = await db.documentoBoveda.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { nombreCliente: { contains: search, mode: 'insensitive' } },
                                { clienteCurp: { contains: search, mode: 'insensitive' } },
                                { codigoCliente: { contains: search, mode: 'insensitive' } },
                                { folioContrato: { contains: search, mode: 'insensitive' } }
                            ]
                        },
                        status ? { status } : {}
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            // Agrupar por CURP para devolver "expedientes" únicos en la búsqueda
            const expedientes: any[] = [];
            const seenCurps = new Set();

            documentos.forEach((doc: any) => {
                const key = doc.clienteCurp || doc.nombreCliente;
                if (!seenCurps.has(key)) {
                    seenCurps.add(key);
                    expedientes.push({
                        nombreCompleto: doc.nombreCliente,
                        curp: doc.clienteCurp,
                        codigoCliente: doc.codigoCliente,
                        folioContrato: doc.folioContrato,
                        telefono: doc.telefono,
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
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
