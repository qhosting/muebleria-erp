
import { PrismaClient } from '@prisma/client';
import { differenceInDays, addMonths, isAfter } from 'date-fns';

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
                notas: `Cliente liquidó cuenta. ${motivo}. Buen historial de pago sugerido.`
            }
        });
    }

    /**
     * Analiza clientes activos para predecir quiénes liquidarán pronto
     */
    static async predecirProximasLiquidaciones(mesesVista: number = 1) {
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

            const pagosRestantes = Math.ceil(saldo / abono);
            
            // Si le faltan 4 pagos o menos (aprox 1 mes si es semanal/quincenal dependiendo de la periodicidad)
            // Mejor calculamos por fecha estimada
            let diasEntrePagos = 30;
            if (cliente.periodicidad === 'semanal') diasEntrePagos = 7;
            if (cliente.periodicidad === 'catorcenal') diasEntrePagos = 14;
            if (cliente.periodicidad === 'quincenal') diasEntrePagos = 15;
            
            const diasParaLiquidar = pagosRestantes * diasEntrePagos;
            const fechaEstimada = new Date();
            fechaEstimada.setDate(fechaEstimada.getDate() + diasParaLiquidar);

            const limite = addMonths(new Date(), mesesVista);

            if (isAfter(fechaEstimada, limite)) return null;

            return {
                clienteId: cliente.id,
                nombre: cliente.nombreCompleto,
                saldoActual: saldo,
                pagosRestantes,
                fechaEstimada,
                productoActual: cliente.producto?.nombre || cliente.descripcionProducto
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
            select: { id: true, codigoCliente: true, nombreCompleto: true }
        });

        const missingInErp = vertexActiveClients.filter(
            c => !activeClientsInErp.includes(c.codigoCliente)
        );

        for (const cliente of missingInErp) {
            // Marcar como liquidado en Vertex
            await prisma.cliente.update({
                where: { id: cliente.id },
                data: { 
                    statusCuenta: 'inactivo',
                    fechaInactivacion: new Date(),
                    observaciones: {
                        push: `Detectado como LIQUIDADO en sincronización API - ${new Date().toLocaleDateString()}`
                    } as any
                }
            });

            // Crear lead de recompra
            await this.crearLeadPorLiquidacion(cliente.id, 'Detectado liquidado en sincronización Contpaqi');
        }

        return missingInErp.length;
    }
}
