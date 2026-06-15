import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { clienteId, fecha, detallesExtra, localId } = body;
        const userId = (session.user as any).id;

        if (!clienteId || !fecha) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Deduplicación por localId: si ya existe una verificación con este localId, retornarla
        if (localId) {
            const existente = await prisma.verificacionDomiciliaria.findFirst({
                where: {
                    detallesExtra: {
                        path: ['localId'],
                        equals: localId,
                    }
                }
            });
            if (existente) {
                console.log(`Verificación con localId ${localId} ya existe, retornando existente.`);
                return NextResponse.json(existente);
            }
        }

        const verificacion = await prisma.verificacionDomiciliaria.create({
            data: {
                clienteId,
                gestorId: userId,
                fecha: new Date(fecha),
                detallesExtra: {
                    ...(detallesExtra || {}),
                    localId, // Guardar el localId dentro de detallesExtra para deduplicación
                },
            },
        });

        return NextResponse.json(verificacion);
    } catch (error) {
        console.error('Error al crear verificación:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
