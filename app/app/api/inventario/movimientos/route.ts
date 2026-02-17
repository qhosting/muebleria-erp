
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar movimientos
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productoId = searchParams.get('productoId');
        const sucursalId = searchParams.get('sucursalId');
        const tipo = searchParams.get('tipo');
        const limit = parseInt(searchParams.get('limit') || '50');

        const where: any = {};

        if (productoId) where.productoId = productoId;
        if (tipo) where.tipoMovimiento = tipo;
        if (sucursalId) {
            where.OR = [
                { sucursalOrigenId: sucursalId },
                { sucursalDestinoId: sucursalId }
            ];
        }

        const movimientos = await prisma.movimientoInventario.findMany({
            where,
            include: {
                producto: { select: { nombre: true, codigo: true } },
                sucursalOrigen: { select: { nombre: true } },
                sucursalDestino: { select: { nombre: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        return NextResponse.json(movimientos);
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// POST - Registrar movimiento
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const {
            productoId,
            tipoMovimiento,
            cantidad,
            sucursalOrigenId,
            sucursalDestinoId,
            motivo,
            referencia
        } = body;

        // Validaciones
        if (!productoId || !tipoMovimiento || !cantidad || cantidad <= 0) {
            return NextResponse.json(
                { error: 'Datos incompletos o inválidos' },
                { status: 400 }
            );
        }

        const cantidadNum = parseInt(cantidad);

        // Lógica por tipo de movimiento
        await prisma.$transaction(async (tx: any) => {
            // 1. Registrar el movimiento
            await tx.movimientoInventario.create({
                data: {
                    productoId,
                    tipoMovimiento,
                    cantidad: cantidadNum,
                    sucursalOrigenId: sucursalOrigenId || null,
                    sucursalDestinoId: sucursalDestinoId || null,
                    motivo,
                    referencia,
                    usuarioId: userId
                }
            });

            // 2. Actualizar stock según el tipo
            if (tipoMovimiento === 'entrada') {
                if (!sucursalDestinoId) throw new Error('Sucursal destino requerida para entrada');

                const stock = await tx.stock.findUnique({
                    where: {
                        productoId_sucursalId: {
                            productoId,
                            sucursalId: sucursalDestinoId
                        }
                    }
                });

                if (stock) {
                    await tx.stock.update({
                        where: { id: stock.id },
                        data: { cantidad: { increment: cantidadNum } }
                    });
                } else {
                    await tx.stock.create({
                        data: {
                            productoId,
                            sucursalId: sucursalDestinoId,
                            cantidad: cantidadNum
                        }
                    });
                }

            } else if (tipoMovimiento === 'salida' || tipoMovimiento === 'venta') {
                if (!sucursalOrigenId) throw new Error('Sucursal origen requerida para salida');

                const stock = await tx.stock.findUnique({
                    where: {
                        productoId_sucursalId: {
                            productoId,
                            sucursalId: sucursalOrigenId
                        }
                    }
                });

                if (!stock || stock.cantidad < cantidadNum) {
                    throw new Error(`Stock insuficiente en origen. Disponible: ${stock?.cantidad || 0}`);
                }

                await tx.stock.update({
                    where: { id: stock.id },
                    data: { cantidad: { decrement: cantidadNum } }
                });

            } else if (tipoMovimiento === 'traspaso') {
                if (!sucursalOrigenId || !sucursalDestinoId) {
                    throw new Error('Sucursal origen y destino requeridas para traspaso');
                }

                // Restar de origen
                const stockOrigen = await tx.stock.findUnique({
                    where: {
                        productoId_sucursalId: {
                            productoId,
                            sucursalId: sucursalOrigenId
                        }
                    }
                });

                if (!stockOrigen || stockOrigen.cantidad < cantidadNum) {
                    throw new Error(`Stock insuficiente en origen para traspaso. Disponible: ${stockOrigen?.cantidad || 0}`);
                }

                await tx.stock.update({
                    where: { id: stockOrigen.id },
                    data: { cantidad: { decrement: cantidadNum } }
                });

                // Sumar a destino
                const stockDestino = await tx.stock.findUnique({
                    where: {
                        productoId_sucursalId: {
                            productoId,
                            sucursalId: sucursalDestinoId
                        }
                    }
                });

                if (stockDestino) {
                    await tx.stock.update({
                        where: { id: stockDestino.id },
                        data: { cantidad: { increment: cantidadNum } }
                    });
                } else {
                    await tx.stock.create({
                        data: {
                            productoId,
                            sucursalId: sucursalDestinoId,
                            cantidad: cantidadNum
                        }
                    });
                }
            }
        });

        return NextResponse.json({ success: true }, { status: 201 });

    } catch (error: any) {
        console.error('Error al registrar movimiento:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
