import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const contrato = process.argv[2] || 'DP2608003';
    console.log(`=== INVESTIGANDO CONTRATO ${contrato} ===`);

    const cliente = await prisma.cliente.findUnique({
        where: { codigoCliente: contrato },
        include: {
            pagos: {
                orderBy: { createdAt: 'desc' }
            },
            tickets: {
                orderBy: { creadoEn: 'desc' }
            }
        }
    });

    if (!cliente) {
        console.log('Cliente no encontrado');
        return;
    }

    console.log('\n--- DATOS DEL CLIENTE ---');
    console.log(`ID: ${cliente.id}`);
    console.log(`Nombre: ${cliente.nombreCompleto}`);
    console.log(`Saldo Actual: ${cliente.saldoActual}`);

    console.log('\n--- PAGOS REGISTRADOS ---');
    cliente.pagos.forEach(p => {
        console.log(`Pago ID: ${p.id} | Monto: ${p.monto} | Método: ${p.metodoPago} | Concepto: ${p.concepto} | TicketId: ${p.ticketId} | fechaPago: ${p.fechaPago} | createdAt: ${p.createdAt} | SaldoAnt: ${p.saldoAnterior} | SaldoNvo: ${p.saldoNuevo}`);
    });

    console.log('\n--- TICKETS REGISTRADOS ---');
    cliente.tickets.forEach(t => {
        console.log(`Ticket ID: ${t.id} | Monto: ${t.monto} | Ref: ${t.referencia} | Folio: ${t.folio} | Fecha: ${t.fecha} | Conciliado: ${t.conciliado} | CreadoEn: ${t.creadoEn} | ClaveRastreo: ${t.claveRastreo} | Remitente: ${t.remitente}`);
    });

    console.log('\n--- BUZON TESORERIA ---');
    const buzon = await prisma.buzonTesoreria.findMany({
        where: { contractId: contrato },
        orderBy: { createdAt: 'desc' }
    });
    buzon.forEach((b: any) => {
        console.log(`Buzon ID: ${b.id} | Hash: ${b.hash} | Estado: ${b.estado} | Monto: ${b.monto} | Ref: ${b.referencia} | Fecha: ${b.fecha} | Phone: ${b.telefono}`);
    });

    console.log('\n--- MOVIMIENTOS BANCARIOS ASOCIADOS ---');
    const m1 = await prisma.movimientoSantander22001022837.findMany({ where: { clienteId: cliente.id } });
    const m2 = await prisma.movimientoSantander65505732541.findMany({ where: { clienteId: cliente.id } });
    const m3 = await prisma.movimientoBanorte0330253963.findMany({ where: { clienteId: cliente.id } });

    console.log('Santander 22001022837:', m1);
    console.log('Santander 65505732541:', m2);
    console.log('Banorte 0330253963:', m3);
}

main()
    .catch(err => console.error(err))
    .finally(() => prisma.$disconnect());
