
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar productos
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const categoria = searchParams.get('categoria') || '';
        const activos = searchParams.get('activos') !== 'false';

        const where: any = {};

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: 'insensitive' } },
                { codigo: { contains: search, mode: 'insensitive' } },
                { descripcion: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (categoria) {
            where.categoria = categoria;
        }

        if (activos) {
            where.isActive = true;
        }

        const productos = await prisma.producto.findMany({
            where,
            include: {
                stocks: {
                    include: {
                        sucursal: {
                            select: { id: true, nombre: true, esBodega: true }
                        }
                    }
                }
            },
            orderBy: { nombre: 'asc' }
        });

        // Calcular stock total por producto
        const productosConStock = productos.map((producto: any) => {
            const stockTotal = producto.stocks.reduce((sum: number, s: any) => sum + s.cantidad, 0);
            const stockPorSucursal = producto.stocks.map((s: any) => ({
                sucursalId: s.sucursal.id,
                sucursalNombre: s.sucursal.nombre,
                esBodega: s.sucursal.esBodega,
                cantidad: s.cantidad
            }));

            return {
                ...producto,
                precioCompra: parseFloat(producto.precioCompra.toString()),
                precioVenta: parseFloat(producto.precioVenta.toString()),
                stockTotal,
                stockPorSucursal,
                stockBajo: stockTotal <= producto.stockMinimo
            };
        });

        // Obtener categorías únicas
        const categorias = await prisma.producto.findMany({
            where: { isActive: true },
            select: { categoria: true },
            distinct: ['categoria']
        });

        return NextResponse.json({
            productos: productosConStock,
            categorias: categorias.map((c: any) => c.categoria).filter(Boolean)
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userRole = (session.user as any).role;
        if (!['admin', 'gestor_cobranza'].includes(userRole)) {
            return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
        }

        const body = await request.json();
        const {
            codigo,
            nombre,
            descripcion,
            categoria,
            precioCompra,
            precioVenta,
            unidadMedida,
            stockMinimo,
            imagenUrl
        } = body;

        if (!codigo || !nombre || precioCompra === undefined || precioVenta === undefined) {
            return NextResponse.json(
                { error: 'Código, nombre, precio de compra y precio de venta son requeridos' },
                { status: 400 }
            );
        }

        // Verificar código único
        const existente = await prisma.producto.findUnique({
            where: { codigo }
        });

        if (existente) {
            return NextResponse.json(
                { error: 'Ya existe un producto con este código' },
                { status: 400 }
            );
        }

        const producto = await prisma.producto.create({
            data: {
                codigo,
                nombre,
                descripcion: descripcion || null,
                categoria: categoria || null,
                precioCompra: parseFloat(precioCompra),
                precioVenta: parseFloat(precioVenta),
                unidadMedida: unidadMedida || 'pieza',
                stockMinimo: parseInt(stockMinimo) || 0,
                imagenUrl: imagenUrl || null
            }
        });

        return NextResponse.json(producto, { status: 201 });
    } catch (error) {
        console.error('Error al crear producto:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
