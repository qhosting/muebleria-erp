
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = params.id;
        const body = await request.json();
        
        // Remove ID from body to avoid trying to update primary key
        const { id: _, ...updateData } = body;

        // Convert strings to appropriate types
        const data: any = {
            ...updateData,
            precioCompra: updateData.precioCompra ? parseFloat(updateData.precioCompra) : 0,
            precioVenta: updateData.precioVenta ? parseFloat(updateData.precioVenta) : 0,
            precio6Meses: updateData.precio6Meses ? parseFloat(updateData.precio6Meses) : null,
            precio9Meses: updateData.precio9Meses ? parseFloat(updateData.precio9Meses) : null,
            precio12Meses: updateData.precio12Meses ? parseFloat(updateData.precio12Meses) : null,
            numSemanas: updateData.numSemanas ? parseInt(updateData.numSemanas) : null,
            enganche: updateData.enganche ? parseFloat(updateData.enganche) : null,
            abonoSemanal: updateData.abonoSemanal ? parseFloat(updateData.abonoSemanal) : null,
            stockMinimo: updateData.stockMinimo ? parseInt(updateData.stockMinimo) : 0,
        };

        const producto = await prisma.producto.update({
            where: { id },
            data
        });

        return NextResponse.json(producto);
    } catch (error: any) {
        console.error('Error al actualizar producto:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const id = params.id;

        // Soft delete
        const producto = await prisma.producto.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
