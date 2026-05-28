import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente: 'DP2605075' }
        })
        if (!cliente) {
            console.log('Cliente no encontrado')
            return
        }
        console.log('Cliente:', {
            id: cliente.id,
            codigoCliente: cliente.codigoCliente,
            nombreCompleto: cliente.nombreCompleto,
            saldoActual: cliente.saldoActual,
            montoPago: cliente.montoPago,
            periodicidad: cliente.periodicidad,
            estadoCuentaCache: cliente.estadoCuentaCache
        })
    } catch (error: any) {
        console.error('Error:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

main()
