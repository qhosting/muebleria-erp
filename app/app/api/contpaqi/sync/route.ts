
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
    const ruta = searchParams.get('ruta') || undefined;

    try {
        const service = await getContpaqiService(prisma);
        const results: any = {};

        if (target === 'health') {
            await service.verificarConexion();
            return NextResponse.json({ success: true, message: 'Conexión exitosa' });
        }

        // Obtener la configuración completa para encontrar el mapeo de esta empresa
        const configRaw = await prisma.configuracionSistema.findUnique({ where: { clave: 'sistema' } });
        const contpaqiConfig = (configRaw as any)?.contpaqi || {};
        const empresaConfig = contpaqiConfig.empresas?.find((e: any) => e.id === searchParams.get('empresaId')) || contpaqiConfig.empresas?.[0];
        
        const mapping = empresaConfig?.mapping || {
            clientes: { nombreCompleto: 'Nombre', codigoCliente: 'Codigo', saldoActual: 'Saldo', direccionCompleta: 'Direccion' },
            productos: { nombre: 'Nombre', codigo: 'Codigo', precioVenta: 'Precio', existencias: 'Existencias' }
        };

        if (target === 'all' || target === 'clientes') {
            const clientes = await service.getClientes(1, { clasificacion, ruta });
            results.clientesCount = clientes.length;
            
            // Actualizar clientes en VertexERP usando el mapeo
            for (const c of clientes) {
                const m = mapping.clientes;
                await prisma.cliente.upsert({
                    where: { codigoCliente: c[m.codigoCliente] || c.codigo },
                    update: {
                        nombreCompleto: c[m.nombreCompleto] || c.nombre,
                        saldoActual: parseFloat(c[m.saldoActual]) || 0,
                        direccionCompleta: c[m.direccionCompleta] || c.direccion || 'Sin dirección',
                    },
                    create: {
                        codigoCliente: c[m.codigoCliente] || c.codigo,
                        nombreCompleto: c[m.nombreCompleto] || c.nombre,
                        fechaVenta: new Date(),
                        direccionCompleta: c[m.direccionCompleta] || c.direccion || 'Sin dirección',
                        descripcionProducto: 'Importado de Contpaqi',
                        diaPago: '1',
                        periodicidad: 'mensual',
                        montoPago: 0,
                        saldoActual: parseFloat(c[m.saldoActual]) || 0,
                        statusCuenta: 'activo'
                    }
                });
            }
        }

        if (target === 'all' || target === 'productos') {
            const productos = await service.getProductos();
            results.productosCount = productos.length;

            for (const p of productos) {
                const m = mapping.productos;
                await prisma.producto.upsert({
                    where: { codigo: p[m.codigo] || p.codigo },
                    update: {
                        nombre: p[m.nombre] || p.nombre,
                        precioVenta: parseFloat(p[m.precioVenta]) || 0,
                        existencias: parseFloat(p[m.existencias]) || 0
                    },
                    create: {
                        codigo: p[m.codigo] || p.codigo,
                        nombre: p[m.nombre] || p.nombre,
                        precioCompra: 0,
                        precioVenta: parseFloat(p[m.precioVenta]) || 0,
                        existencias: parseFloat(p[m.existencias]) || 0
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
