
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

        const documentos = await prisma.documentoBoveda.findMany({
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
