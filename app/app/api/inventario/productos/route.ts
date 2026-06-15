
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
                stock: {
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
            const stockTotal = producto.stock.reduce((sum: number, s: any) => sum + s.cantidad, 0);
            const stockPorSucursal = producto.stock.map((s: any) => ({
                sucursalId: s.sucursal.id,
                sucursalNombre: s.sucursal.nombre,
                esBodega: s.sucursal.esBodega,
                cantidad: s.cantidad
            }));

            return {
                ...producto,
                precioCompra: producto.precioCompra ? parseFloat(producto.precioCompra.toString()) : 0,
                precioVenta: producto.precioVenta ? parseFloat(producto.precioVenta.toString()) : 0,
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
        if (!['admin', 'gestor_cobranza', 'direccion'].includes(userRole)) {
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
            imagenUrl,
            marca,
            medida,
            precio6Meses,
            precio9Meses,
            precio12Meses,
            numSemanas,
            enganche,
            abonoSemanal,
            garantia
        } = body;

        if (!codigo || !nombre || precioVenta === undefined) {
            return NextResponse.json(
                { error: 'Código, nombre y precio de venta son requeridos' },
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
                detalles: body.detalles || null,
                categoria: categoria || null,
                precioCompra: precioCompra ? parseFloat(precioCompra) : 0,
                precioVenta: parseFloat(precioVenta),
                unidadMedida: unidadMedida || 'pieza',
                existencias: parseInt(body.existencias) || 0,
                existenciaHoy: parseInt(body.existenciaHoy) || parseInt(body.existencias) || 0,
                stockMinimo: parseInt(stockMinimo) || 0,
                imagenUrl: imagenUrl || null,
                imagenes: body.imagenes || [],
                enEcommerce: body.enEcommerce || false,
                marca: marca || null,
                medida: medida || null,
                precio6Meses: precio6Meses ? parseFloat(precio6Meses) : null,
                precio9Meses: precio9Meses ? parseFloat(precio9Meses) : null,
                precio12Meses: precio12Meses ? parseFloat(precio12Meses) : null,
                numSemanas: numSemanas ? parseInt(numSemanas) : null,
                enganche: enganche ? parseFloat(enganche) : null,
                abonoSemanal: abonoSemanal ? parseFloat(abonoSemanal) : null,
                garantia: garantia || null
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
