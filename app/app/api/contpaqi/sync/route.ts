
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

/**
 * Endpoint para disparar sincronización manual de catálogos desde Contpaqi
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all'; // all, clientes, productos
    const clasificacion = searchParams.get('clasificacion') || undefined;

    try {
        const service = await getContpaqiService(prisma);
        const results: any = {};

        if (target === 'health') {
            await service.verificarConexion();
            return NextResponse.json({ success: true, message: 'Conexión exitosa' });
        }

        if (target === 'all' || target === 'clientes') {
            const clientes = await service.getClientes(1, clasificacion);
            results.clientesCount = clientes.length;
            
            // Actualizar clientes en VertexERP
            for (const c of clientes) {
                await prisma.cliente.upsert({
                    where: { codigoCliente: c.codigo },
                    update: {
                        nombreCompleto: c.nombre,
                        saldoActual: c.saldo || 0,
                    },
                    create: {
                        codigoCliente: c.codigo,
                        nombreCompleto: c.nombre,
                        fechaVenta: new Date(),
                        direccionCompleta: c.direccion || 'Sin dirección',
                        descripcionProducto: 'Importado de Contpaqi', // Campo obligatorio
                        diaPago: '1',
                        periodicidad: 'mensual',
                        montoPago: 0,
                        saldoActual: c.saldo || 0,
                        statusCuenta: 'activo'
                    }
                });
            }
        }

        if (target === 'all' || target === 'productos') {
            const productos = await service.getProductos();
            results.productosCount = productos.length;

            for (const p of productos) {
                await prisma.producto.upsert({
                    where: { codigo: p.codigo },
                    update: {
                        nombre: p.nombre,
                        precioVenta: p.precio || 0,
                        existencias: p.existencias || 0
                    },
                    create: {
                        codigo: p.codigo,
                        nombre: p.nombre,
                        precioCompra: 0,
                        precioVenta: p.precio || 0,
                        existencias: p.existencias || 0
                    }
                });
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Sincronización de ${target} completada`,
            results 
        });

    } catch (error: any) {
        console.error('❌ Contpaqi Sync Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
