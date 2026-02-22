import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;
        const where: any = {};

        if (search) {
            where.OR = [
                { folio: { contains: search, mode: 'insensitive' } },
                { referencia: { contains: search, mode: 'insensitive' } },
                { concepto: { contains: search, mode: 'insensitive' } },
                { cliente: { nombreCompleto: { contains: search, mode: 'insensitive' } } },
                { cliente: { codigoCliente: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    cliente: {
                        select: {
                            codigoCliente: true,
                            nombreCompleto: true,
                        }
                    },
                    gestor: {
                        select: {
                            name: true,
                            codigoGestor: true,
                        }
                    }
                },
                orderBy: { creadoEn: 'desc' },
                skip,
                take: limit,
            }),
            prisma.ticket.count({ where }),
        ]);

        return NextResponse.json({
            tickets,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                currentPage: page,
                perPage: limit,
            },
        });
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
