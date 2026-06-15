
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

function parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    const cleanStr = String(dateStr).trim();
    
    // Si viene en formato DD/MM/YYYY o similar con barra
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 0-indexed en JS
            const year = parseInt(parts[2], 10);
            const parsed = new Date(year, month, day);
            if (!isNaN(parsed.getTime())) return parsed;
        }
    }
    
    // Si viene en formato YYYY-MM-DD o similar con guión
    if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
            // Podría ser YYYY-MM-DD o DD-MM-YYYY
            if (parts[0].length === 4) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const parsed = new Date(year, month, day);
                if (!isNaN(parsed.getTime())) return parsed;
            } else if (parts[2].length === 4) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                const parsed = new Date(year, month, day);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        }
        const parsed = new Date(cleanStr);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    
    const parsed = new Date(cleanStr);
    return !isNaN(parsed.getTime()) ? parsed : new Date();
}

/**
 * Endpoint para disparar sincronización manual de catálogos desde Contpaqi
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all'; // all, clientes, productos
    const clasificacion = searchParams.get('clasificacion') || undefined;
    const ruta = searchParams.get('ruta') || undefined;
    const soloConExistencia = searchParams.get('soloConExistencia') === 'true';

    const empresaId = searchParams.get('empresaId') || undefined;
    try {
        const service = await getContpaqiService(prisma, empresaId);
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
            productos: { 
                nombre: 'Nombre', 
                codigo: 'Codigo', 
                precioVenta: 'Precio', 
                existencias: 'Existencias',
                existenciaHoy: 'ExistenciaHoy',
                costoEstandar: 'Costo' 
            }
        };

        if (target === 'cliente') {
            const codigo = searchParams.get('codigo');
            if (!codigo) {
                return NextResponse.json({ error: 'Falta el código del cliente ("codigo")' }, { status: 400 });
            }

            // 1. Obtener cliente de Contpaqi
            const c = await service.getCliente(codigo);
            if (!c) {
                return NextResponse.json({ error: 'No se encontró el cliente en la API de Contpaqi' }, { status: 404 });
            }

            const m = mapping.clientes;
            
            // 2. Obtener saldo real (Estado de cuenta)
            let saldoReal = parseFloat(c[m.saldoActual]) || 0;
            try {
                const empresaAlias = empresaConfig?.baseDatos || searchParams.get('empresa');
                const estadoCuenta = await service.getClienteEstadoCuenta(codigo, empresaAlias);
                if (estadoCuenta && (estadoCuenta.saldoActual !== undefined || estadoCuenta.SaldoActual !== undefined || estadoCuenta.cSaldoActual !== undefined)) {
                    const parsedVal = parseFloat(estadoCuenta.saldoActual || estadoCuenta.SaldoActual || estadoCuenta.cSaldoActual);
                    if (!isNaN(parsedVal)) {
                        saldoReal = parsedVal;
                    }
                }
            } catch (e) {
                console.warn(`No se pudo actualizar saldo real para ${codigo}:`, (e as Error).message);
            }

            // 3. Obtener fecha de venta (Documentos del cliente)
            let fechaVentaCalculada = parseLocalDate(c.cFechaAlta || c.cfechaalta || c.CFECHAALTA || c.fechaAlta || c.FechaAlta || '');
            try {
                const documentos = await service.getClientDocumentos(codigo);
                if (Array.isArray(documentos) && documentos.length > 0) {
                    // Filtrar por conceptos de factura conocidos (ej: "100", "4", "5", etc.)
                    const facturas = documentos.filter((doc: any) => {
                        const conceptoDoc = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || doc.CIDCONCEPTO || '').trim();
                        return ['100', '4', '5'].includes(conceptoDoc);
                    });

                    if (facturas.length > 0) {
                        // Tomamos la factura de fecha más antigua (compra original)
                        const sortedFacturas = facturas.map((doc: any) => ({
                            ...doc,
                            parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                        })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                        
                        fechaVentaCalculada = sortedFacturas[0].parsedDate;
                    } else {
                        // Filtrar excluyendo notas de crédito y cobranzas
                        const noCobros = documentos.filter((doc: any) => {
                            const conceptoDoc = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || doc.CIDCONCEPTO || '').trim();
                            return !['16', '17', '18', '101', '102'].includes(conceptoDoc);
                        });

                        if (noCobros.length > 0) {
                            const sortedNoCobros = noCobros.map((doc: any) => ({
                                ...doc,
                                parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                            })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                            
                            fechaVentaCalculada = sortedNoCobros[0].parsedDate;
                        } else {
                            // Fallback a la fecha del documento más antiguo en general
                            const sortedAll = documentos.map((doc: any) => ({
                                ...doc,
                                parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                            })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                            
                            fechaVentaCalculada = sortedAll[0].parsedDate;
                        }
                    }
                }
            } catch (e) {
                console.warn(`No se pudo actualizar fecha de venta para ${codigo}:`, (e as Error).message);
            }

            const updatedCliente = await prisma.cliente.upsert({
                where: { codigoCliente: codigo },
                update: {
                    nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                    fechaVenta: fechaVentaCalculada,
                    numContrato: c[m.numContrato] ? String(c[m.numContrato]) : null,
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
                    numContrato: c[m.numContrato] ? String(c[m.numContrato]) : null,
                    nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                    fechaVenta: fechaVentaCalculada,
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

            return NextResponse.json({
                success: true,
                message: `Sincronización del cliente ${codigo} completada exitosamente`,
                cliente: updatedCliente
            });
        }

        if (target === 'all' || target === 'clientes') {
            const clientes = await service.getClientes(1, { clasificacion, ruta });
            results.clientesCount = clientes.length;
            
            const apiClientCodes: string[] = [];
            
            // Actualizar clientes en VertexERP usando el mapeo
            for (const c of clientes) {
                const m = mapping.clientes;
                const codigo = String(c[m.codigoCliente] || c.codigo || c.id);
                apiClientCodes.push(codigo);
                
                // 🚀 OBTENER SALDO REAL (Estado de Cuenta)
                let saldoReal = parseFloat(c[m.saldoActual]) || 0;
                try {
                    const empresaAlias = empresaConfig?.baseDatos || searchParams.get('empresa');
                    const estadoCuenta = await service.getClienteEstadoCuenta(codigo, empresaAlias);
                    if (estadoCuenta && (estadoCuenta.saldoActual !== undefined || estadoCuenta.SaldoActual !== undefined || estadoCuenta.cSaldoActual !== undefined)) {
                        const parsedVal = parseFloat(estadoCuenta.saldoActual || estadoCuenta.SaldoActual || estadoCuenta.cSaldoActual);
                        if (!isNaN(parsedVal)) {
                            saldoReal = parsedVal;
                        }
                    }
                } catch (e) {
                    console.warn(`No se pudo actualizar saldo real para ${codigo}:`, (e as Error).message);
                }

                // 🚀 OBTENER FECHA DE VENTA (Documentos del cliente)
                let fechaVentaCalculada = parseLocalDate(c.cFechaAlta || c.cfechaalta || c.CFECHAALTA || c.fechaAlta || c.FechaAlta || '');
                try {
                    const documentos = await service.getClientDocumentos(codigo);
                    if (Array.isArray(documentos) && documentos.length > 0) {
                        // Filtrar por conceptos de factura conocidos (ej: "100", "4", "5", etc.)
                        const facturas = documentos.filter((doc: any) => {
                            const conceptoDoc = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || doc.CIDCONCEPTO || '').trim();
                            return ['100', '4', '5'].includes(conceptoDoc);
                        });

                        if (facturas.length > 0) {
                            // Tomamos la factura de fecha más antigua (compra original)
                            const sortedFacturas = facturas.map((doc: any) => ({
                                ...doc,
                                parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                            })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                            
                            fechaVentaCalculada = sortedFacturas[0].parsedDate;
                        } else {
                            // Filtrar excluyendo notas de crédito y cobranzas
                            const noCobros = documentos.filter((doc: any) => {
                                const conceptoDoc = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || doc.CIDCONCEPTO || '').trim();
                                return !['16', '17', '18', '101', '102'].includes(conceptoDoc);
                            });

                            if (noCobros.length > 0) {
                                const sortedNoCobros = noCobros.map((doc: any) => ({
                                    ...doc,
                                    parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                                })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                                
                                fechaVentaCalculada = sortedNoCobros[0].parsedDate;
                            } else {
                                // Fallback a la fecha del documento más antiguo en general
                                const sortedAll = documentos.map((doc: any) => ({
                                    ...doc,
                                    parsedDate: parseLocalDate(doc.fecha || doc.Fecha || doc.cFecha || doc.cfecha || doc.CFECHA)
                                })).sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
                                
                                fechaVentaCalculada = sortedAll[0].parsedDate;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`No se pudo actualizar fecha de venta para ${codigo}:`, (e as Error).message);
                }

                await prisma.cliente.upsert({
                    where: { codigoCliente: codigo },
                    update: {
                        nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                        fechaVenta: fechaVentaCalculada,
                        numContrato: c[m.numContrato] ? String(c[m.numContrato]) : null,
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
                        numContrato: c[m.numContrato] ? String(c[m.numContrato]) : null,
                        nombreCompleto: c[m.nombreCompleto] || c.nombre || c.razonSocial,
                        fechaVenta: fechaVentaCalculada,
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

            // 🔍 DETECTAR CLIENTES QUE YA NO APARECEN EN LA API (LIQUIDADOS)
            try {
                const { RecomprasService } = await import('@/lib/recompras-service');
                results.liquidadosDetectados = await RecomprasService.detectarLiquidadosEnSync(apiClientCodes);
            } catch (rError) {
                console.error('Error al detectar liquidados en sync:', rError);
            }
        }

        if (target === 'all' || target === 'productos') {
            const productos = await service.getProductos();
            results.productosCount = productos.length;

            for (const p of productos) {
                const m = mapping.productos;
                
                // Fallbacks seguros para existencias
                const existenciaVal = p[m.existencias] !== undefined ? p[m.existencias] :
                                      p.existencias !== undefined ? p.existencias :
                                      p.Existencias !== undefined ? p.Existencias :
                                      p.existencia !== undefined ? p.existencia :
                                      p.Existencia !== undefined ? p.Existencia : 0;
                const existencia = Math.round(parseFloat(String(existenciaVal)) || 0);
                
                // Si solo queremos con existencia y no tiene, saltar
                if (soloConExistencia && existencia <= 0) continue;

                // Fallbacks seguros para código y nombre
                const codigo = String(p[m.codigo] || p.codigo || p.Codigo || '').trim();
                const nombre = String(p[m.nombre] || p.nombre || p.Nombre || '').trim();

                if (!codigo || !nombre) continue;

                // Fallbacks seguros para costo y precio de venta
                const precioCompra = parseFloat(String(p[m.costoEstandar] || p.costo || p.ultimoCosto || p.costoUltimo || p.CostoUltimo || 0)) || 0;
                const precioVenta = parseFloat(String(p[m.precioVenta] || p.precio1 || p.Precio1 || p.precio || p.Precio || p.precioVenta || 0)) || 0;

                const existenciaHoyVal = p[m.existenciaHoy] !== undefined ? p[m.existenciaHoy] :
                                         p.existenciaHoy !== undefined ? p.existenciaHoy :
                                         p.ExistenciaHoy !== undefined ? p.ExistenciaHoy : existencia;
                const existenciaHoy = Math.round(parseFloat(String(existenciaHoyVal)) || existencia);

                await prisma.producto.upsert({
                    where: { codigo },
                    update: {
                        nombre,
                        precioCompra,
                        precioVenta,
                        existencias: existencia,
                        existenciaHoy
                    },
                    create: {
                        codigo,
                        nombre,
                        precioCompra,
                        precioVenta,
                        existencias: existencia,
                        existenciaHoy
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
