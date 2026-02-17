
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar sucursales/bodegas
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const tipo = searchParams.get('tipo'); // 'bodega' | 'tienda' | null (todos)

        const where: any = { isActive: true };

        if (tipo === 'bodega') {
            where.esBodega = true;
        } else if (tipo === 'tienda') {
            where.esBodega = false;
        }

        const sucursales = await prisma.sucursal.findMany({
            where,
            include: {
                _count: {
                    select: { stocks: true }
                }
            },
            orderBy: { nombre: 'asc' }
        });

        return NextResponse.json(sucursales);
    } catch (error) {
        console.error('Error al obtener sucursales:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// POST - Crear sucursal/bodega
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Solo administradores pueden crear sucursales' }, { status: 403 });
        }

        const body = await request.json();
        const { nombre, direccion, telefono, esBodega } = body;

        if (!nombre) {
            return NextResponse.json(
                { error: 'El nombre es requerido' },
                { status: 400 }
            );
        }

        // Verificar nombre único
        const existente = await prisma.sucursal.findUnique({
            where: { nombre }
        });

        if (existente) {
            return NextResponse.json(
                { error: 'Ya existe una sucursal con este nombre' },
                { status: 400 }
            );
        }

        const sucursal = await prisma.sucursal.create({
            data: {
                nombre,
                direccion: direccion || null,
                telefono: telefono || null,
                esBodega: esBodega === true
            }
        });

        return NextResponse.json(sucursal, { status: 201 });
    } catch (error) {
        console.error('Error al crear sucursal:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
