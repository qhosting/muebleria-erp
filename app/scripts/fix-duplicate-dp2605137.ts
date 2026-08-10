import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const codigoCliente = 'DP2605137';
    console.log(`=== INICIANDO LIMPIEZA DE PAGOS DUPICADOS PARA ${codigoCliente} ===`);

    const cliente = await prisma.cliente.findUnique({
        where: { codigoCliente },
        include: {
            pagos: { orderBy: { createdAt: 'asc' } },
            tickets: { orderBy: { creadoEn: 'asc' } }
        }
    });

    if (!cliente) {
        console.log(`Cliente con contrato ${codigoCliente} no encontrado.`);
        return;
    }

    console.log(`Cliente encontrado: ${cliente.nombreCompleto}`);
    console.log(`Saldo Actual antes de ajuste: $${cliente.saldoActual}`);
    console.log(`Total de pagos registrados: ${cliente.pagos.length}`);

    const pagos = cliente.pagos;
    const duplicadosAEliminar: string[] = [];
    let montoTotalAEliminar = 0;

    for (let i = 0; i < pagos.length; i++) {
        const current = pagos[i];
        if (duplicadosAEliminar.includes(current.id)) continue;

        for (let j = i + 1; j < pagos.length; j++) {
            const next = pagos[j];
            if (duplicadosAEliminar.includes(next.id)) continue;

            if (parseFloat(current.monto.toString()) === parseFloat(next.monto.toString())) {
                const diffMinutes = Math.abs(new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime()) / (1000 * 60);
                if (diffMinutes <= 60) {
                    console.log(`🚩 Detectado pago duplicado: ID ${next.id} (Monto: $${next.monto}, Creado: ${next.createdAt}, Método: ${next.metodoPago})`);
                    duplicadosAEliminar.push(next.id);
                    montoTotalAEliminar += parseFloat(next.monto.toString());
                }
            }
        }
    }

    if (duplicadosAEliminar.length === 0) {
        console.log('No se detectaron pagos duplicados.');
        return;
    }

    console.log(`\nSe eliminarán ${duplicadosAEliminar.length} pago(s) duplicado(s) por un total de $${montoTotalAEliminar}.`);

    const saldoAnterior = parseFloat(cliente.saldoActual.toString());
    const saldoNuevo = saldoAnterior + montoTotalAEliminar;

    await prisma.$transaction(async (tx) => {
        await tx.pago.deleteMany({
            where: { id: { in: duplicadosAEliminar } }
        });

        await tx.cliente.update({
            where: { id: cliente.id },
            data: { saldoActual: saldoNuevo }
        });
    });

    console.log(`✅ ¡Limpieza completada con éxito!`);
    console.log(`Saldo corregido: De $${saldoAnterior} a $${saldoNuevo}`);
}

main()
    .catch(err => console.error('Error durante la limpieza:', err))
    .finally(() => prisma.$disconnect());
