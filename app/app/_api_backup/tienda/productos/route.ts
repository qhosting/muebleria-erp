
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Productos públicos para landing page (NO requiere auth)
export async function GET(request: NextRequest) {
    try {
        const productos = await prisma.producto.findMany({
            where: {
                isActive: true,
                enEcommerce: true, // Solo productos marcados para la tienda
            },
            select: {
                id: true,
                codigo: true,
                nombre: true,
                descripcion: true,
                categoria: true,
                precioVenta: true,
                imagenUrl: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 12, // Mostrar un poco más
        });

        const productosSerializados = productos.map((p: any) => ({
            ...p,
            precioVenta: p.precioVenta ? parseFloat(p.precioVenta.toString()) : 0,
        }));

        const categorias = await prisma.producto.findMany({
            where: { isActive: true, enEcommerce: true },
            select: { categoria: true },
            distinct: ['categoria'],
        });

        return NextResponse.json({
            productos: productosSerializados,
            categorias: categorias.map((c: any) => c.categoria).filter(Boolean),
        });
    } catch (error) {
        console.error('Error al obtener productos públicos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
