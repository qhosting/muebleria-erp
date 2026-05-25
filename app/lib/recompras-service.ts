import { PrismaClient } from '@prisma/client';
import { addMonths, isAfter } from 'date-fns';

const prisma = new PrismaClient();

export class RecomprasService {
    
    /**
     * Crea un lead de recompra cuando un cliente liquida su cuenta
     */
    static async crearLeadPorLiquidacion(clienteId: string, motivo: string) {
        const cliente = await prisma.cliente.findUnique({
            where: { id: clienteId },
            include: { producto: true }
        });

        if (!cliente) return null;

        // Verificar si ya existe un lead de recompra reciente para este cliente
        const existingLead = await prisma.lead.findFirst({
            where: {
                clienteId: cliente.id,
                origen: 'recompra' as any,
                estado: { in: ['nuevo', 'contactado', 'negociacion'] }
            }
        });

        if (existingLead) return existingLead;

        return await prisma.lead.create({
            data: {
                nombre: cliente.nombreCompleto,
                telefono: cliente.telefono,
                direccionArea: cliente.direccionCompleta,
                interes: `RECOMPRA - Liquidó ${cliente.producto?.nombre || cliente.descripcionProducto}`,
                origen: 'recompra' as any,
                estado: 'nuevo',
                clienteId: cliente.id,
                vendedorId: cliente.vendedorId,
                notas: `Cliente liquidó cuenta. ${motivo}. Buen historial de pago sugerido. Código: ${cliente.codigoCliente}`,
                datosExtraidos: { codigoCliente: cliente.codigoCliente } as any
            }
        });
    }

    /**
     * Analiza clientes activos para predecir quiénes liquidarán pronto
     */
    static async predecirProximasLiquidaciones(mesesVista: number = 2) {
        const clientes = await prisma.cliente.findMany({
            where: {
                statusCuenta: 'activo',
                saldoActual: { gt: 0 }
            },
            include: {
                producto: true
            }
        });

        const predicciones = clientes.map(cliente => {
            const saldo = Number(cliente.saldoActual);
            const abono = Number(cliente.montoPago);
            
            if (abono <= 0) return null;

            let pagosRestantes = Math.ceil(saldo / abono);
            let fechaEstimada = new Date();
            let rating = "EXCELENTE PAGADOR"; // Default fallback

            // --- VALIDAR MEDIANTE CACHÉ DE ESTADO DE CUENTA EN VIVO DE CONTPAQI ---
            const cache = cliente.estadoCuentaCache as any;
            if (cache && cache.data && cache.data.cliente) {
                const cCliente = cache.data.cliente;
                const tabla = cCliente.tablaAmortizacion || [];
                
                // 1. Pagos restantes exactos de la tabla de amortización no liquidados
                const unpaidCuotas = tabla.filter((cuota: any) => cuota.status !== 'saldado');
                pagosRestantes = unpaidCuotas.length;
                
                // 2. Fecha estimada real de liquidación basada en sus pagos reales
                if (unpaidCuotas.length > 0) {
                    const firstUnpaid = unpaidCuotas[0];
                    const firstUnpaidDate = new Date(firstUnpaid.fechaVencimiento);
                    const today = new Date();
                    
                    if (firstUnpaidDate < today) {
                        // El cliente tiene atrasos (vencidos sin saldar). 
                        // Proyectamos los pagos restantes a partir de hoy siguiendo su periodicidad.
                        let diasEntrePagos = 7;
                        if (cliente.periodicidad === 'catorcenal') diasEntrePagos = 14;
                        else if (cliente.periodicidad === 'quincenal') diasEntrePagos = 15;
                        else if (cliente.periodicidad === 'mensual') diasEntrePagos = 30;
                        
                        const projectDate = new Date();
                        projectDate.setDate(projectDate.getDate() + (pagosRestantes - 1) * diasEntrePagos);
                        fechaEstimada = projectDate;
                        
                        // Si tiene más de 3 pagos atrasados, se considera regular o malo.
                        const numAtrasos = unpaidCuotas.filter((c: any) => new Date(c.fechaVencimiento) < today).length;
                        rating = numAtrasos > 3 ? "MALO" : "REGULAR";
                    } else {
                        // El cliente va al corriente o adelantado.
                        // La fecha de liquidación exacta es el vencimiento de su última cuota pendiente.
                        const lastUnpaid = unpaidCuotas[unpaidCuotas.length - 1];
                        fechaEstimada = new Date(lastUnpaid.fechaVencimiento);
                        rating = "EXCELENTE PAGADOR";
                    }
                } else {
                    // Si ya no quedan cuotas impagadas, la fecha de liquidación estimada es hoy
                    fechaEstimada = new Date();
                    rating = "EXCELENTE PAGADOR";
                }

                // 3. Determinar rating exacto del cliente desde las clasificaciones de Contpaqi en caché si existen
                const ec = cache.data.estadoCuenta || {};
                const c1 = ec.cNombreClasificacion1 || '';
                const c2 = ec.cNombreClasificacion2 || '';
                const c3 = ec.cNombreClasificacion3 || '';
                
                const ratings = ['EXCELENTE', 'BUENO', 'REGULAR', 'MALO'];
                const searchArray = [c1, c2, c3].map(v => String(v).trim().toUpperCase());
                const foundRating = searchArray.find(v => ratings.some(r => v.includes(r)));
                
                if (foundRating) {
                    rating = foundRating;
                } else if (c1 && c1 !== 'N/A' && c1 !== '') {
                    rating = c1;
                }
            } else {
                // Fallback: Lógica local de amortización secuencial y cálculo de vencimiento estimado
                let diasEntrePagos = 7;
                if (cliente.periodicidad === 'catorcenal') diasEntrePagos = 14;
                else if (cliente.periodicidad === 'quincenal') diasEntrePagos = 15;
                else if (cliente.periodicidad === 'mensual') diasEntrePagos = 30;
                
                const diasParaLiquidar = (pagosRestantes - 1) * diasEntrePagos;
                fechaEstimada = new Date(cliente.fechaVenta || new Date());
                
                // Periodo de gracia para primer pago
                let graceDays = 14;
                if (cliente.periodicidad === 'catorcenal') graceDays = 28;
                else if (cliente.periodicidad === 'quincenal') graceDays = 30;
                else if (cliente.periodicidad === 'mensual') graceDays = 60;
                
                const primerPago = new Date(fechaEstimada);
                primerPago.setDate(primerPago.getDate() + graceDays);
                
                // Encontrar la fecha de vencimiento final original proyectada
                const originalEnd = new Date(primerPago);
                originalEnd.setDate(originalEnd.getDate() + diasParaLiquidar);
                
                const today = new Date();
                if (originalEnd < today) {
                    // Si el vencimiento original ya pasó debido a atrasos, proyectamos desde hoy
                    const projectDate = new Date();
                    projectDate.setDate(projectDate.getDate() + diasParaLiquidar);
                    fechaEstimada = projectDate;
                    rating = "REGULAR"; // Consideramos regular por retraso
                } else {
                    fechaEstimada = originalEnd;
                    rating = "EXCELENTE PAGADOR";
                }
            }

            const limite = addMonths(new Date(), mesesVista);
            if (isAfter(fechaEstimada, limite)) return null;

            return {
                clienteId: cliente.id,
                nombre: cliente.nombreCompleto,
                telefono: cliente.telefono,
                saldoActual: saldo,
                pagosRestantes,
                fechaEstimada,
                productoActual: cliente.producto?.nombre || cliente.descripcionProducto,
                rating
            };
        }).filter(Boolean);

        return predicciones;
    }

    /**
     * Compara los clientes locales con los recibidos de la API para detectar liquidados
     */
    static async detectarLiquidadosEnSync(activeClientsInErp: string[]) {
        // Obtenemos todos nuestros clientes activos que NO están en la lista de la API
        const vertexActiveClients = await prisma.cliente.findMany({
            where: {
                statusCuenta: 'activo',
                // Solo nos interesan los que SI sincronizamos usualmente (tienen código)
                codigoCliente: { not: '' }
            },
            select: { id: true, codigoCliente: true, nombreCompleto: true, observaciones: true }
        });

        const missingInErp = vertexActiveClients.filter(
            c => !activeClientsInErp.includes(c.codigoCliente)
        );

        for (const cliente of missingInErp) {
            const oldObs = cliente.observaciones || '';
            const appendObs = `Detectado como LIQUIDADO en sincronización API - ${new Date().toLocaleDateString()}`;
            const newObs = oldObs ? `${oldObs}\n${appendObs}` : appendObs;

            // Marcar como liquidado en Vertex
            await prisma.cliente.update({
                where: { id: cliente.id },
                data: { 
                    statusCuenta: 'inactivo',
                    fechaInactivacion: new Date(),
                    observaciones: newObs
                }
            });

            // Crear lead de recompra
            await this.crearLeadPorLiquidacion(cliente.id, 'Detectado liquidado en sincronización Contpaqi');
        }

        return missingInErp.length;
    }
}
