
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
            clientes: { 
                nombreCompleto: 'Nombre', 
                codigoCliente: 'Codigo', 
                saldoActual: 'Saldo', 
                direccionCompleta: 'Direccion',
                importe1: 'importe1',
                importe2: 'importe2',
                importe3: 'importe3',
                importe4: 'importe4',
                diaPago: 'diaPago',
                referencia1: 'referencia1',
                referencia2: 'referencia2',
                aval: 'aval',
                cCuentaMensajeria: 'cCuentaMensajeria',
                clasificacion1: 'cNombreClasificacion1',
                clasificacion2: 'cNombreClasificacion2',
                clasificacion3: 'cNombreClasificacion3',
                clasificacion4: 'cNombreClasificacion4',
                clasificacion5: 'cNombreClasificacion5',
                clasificacion6: 'cNombreClasificacion6'
            },
            productos: { nombre: 'Nombre', codigo: 'Codigo', precioVenta: 'Precio', existencias: 'Existencias' }
        };

        if (target === 'all' || target === 'clientes') {
            const clientes = await service.getClientes(1, { clasificacion, ruta });
            results.clientesCount = clientes.length;
            
            // Actualizar clientes en VertexERP usando el mapeo
            for (const c of clientes) {
                const m = mapping.clientes;
                const codigo = String(c[m.codigoCliente] || c.codigo || c.id);
                
                // 🚀 OBTENER SALDO REAL (Estado de Cuenta)
                let saldoReal = parseFloat(c[m.saldoActual]) || 0;
                try {
                    const empresaAlias = empresaConfig?.baseDatos || searchParams.get('empresa');
                    const estadoCuenta = await service.getClienteEstadoCuenta(codigo, empresaAlias);
                    if (estadoCuenta && (estadoCuenta.saldoActual !== undefined || estadoCuenta.SaldoActual !== undefined)) {
                        saldoReal = parseFloat(estadoCuenta.saldoActual || estadoCuenta.SaldoActual);
                    }
                } catch (e) {
                    console.warn(`No se pudo actualizar saldo real para ${codigo}:`, (e as Error).message);
                }

                await prisma.cliente.upsert({
                    where: { codigoCliente: codigo },
                    update: {
                        nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                        saldoActual: saldoReal,
                        calle: c[m.calle],
                        numeroExterior: c[m.numeroExterior],
                        numeroInterior: c[m.numeroInterior],
                        colonia: c[m.colonia],
                        ciudad: c[m.ciudad],
                        estado: c[m.estado],
                        codigoPostal: c[m.codigoPostal],
                        vendedor: c[m.vendedor],
                        diaPago: String(c[m.diaPago] || '1'),
                        direccionCompleta: [c[m.calle], c[m.numeroExterior], c[m.colonia], c[m.ciudad], c[m.estado]].filter(Boolean).join(', ') || 'Sin dirección',
                        periodicidad: (function() {
                            const p = String(c[m.periodicidad] || '').toLowerCase();
                            if (p.includes('quin')) return 'quincenal';
                            if (p.includes('sem')) return 'semanal';
                            return 'mensual';
                        })() as any,
                        observaciones: `Ref 1: ${c[m.referencia1] || ''}\nRef 2: ${c[m.referencia2] || ''}\nAval: ${c[m.aval] || ''}\nCuenta Mensajería: ${c[m.cCuentaMensajeria] || ''}`,
                        referencias: {
                            ref1: c[m.referencia1],
                            ref2: c[m.referencia2],
                            aval: c[m.aval]
                        }
                    },
                    create: {
                        codigoCliente: codigo,
                        nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                        fechaVenta: new Date(),
                        calle: c[m.calle],
                        numeroExterior: c[m.numeroExterior],
                        numeroInterior: c[m.numeroInterior],
                        colonia: c[m.colonia],
                        ciudad: c[m.ciudad],
                        estado: c[m.estado],
                        codigoPostal: c[m.codigoPostal],
                        vendedor: c[m.vendedor],
                        diaPago: String(c[m.diaPago] || '1'),
                        direccionCompleta: [c[m.calle], c[m.numeroExterior], c[m.colonia], c[m.ciudad], c[m.estado]].filter(Boolean).join(', ') || 'Sin dirección',
                        descripcionProducto: 'Importado de Contpaqi',
                        periodicidad: (function() {
                            const p = String(c[m.periodicidad] || '').toLowerCase();
                            if (p.includes('quin')) return 'quincenal';
                            if (p.includes('sem')) return 'semanal';
                            return 'mensual';
                        })() as any,
                        montoPago: parseFloat(c[m.montoPago]) || 0,
                        saldoActual: saldoReal,
                        statusCuenta: 'activo',
                        observaciones: `Ref 1: ${c[m.referencia1] || ''}\nRef 2: ${c[m.referencia2] || ''}\nAval: ${c[m.aval] || ''}\nCuenta Mensajería: ${c[m.cCuentaMensajeria] || ''}`,
                        referencias: {
                            ref1: c[m.referencia1],
                            ref2: c[m.referencia2],
                            aval: c[m.aval]
                        }
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
