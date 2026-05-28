import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@100.75.220.89:1080/dasoplus-db?sslmode=disable';
console.log('🔌 Conectando a la base de datos externa:', dbUrl);

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

async function main() {
    try {
        // Obtener argumentos de la línea de comandos
        const args = process.argv.slice(2);
        const searchVal = args[0] || 'DP2605075'; // Valor de búsqueda por defecto

        console.log(`\n🔍 Iniciando búsqueda para: "${searchVal}"...\n`);

        // 1. Buscar cliente por código o ID
        const cliente = await prisma.cliente.findFirst({
            where: {
                OR: [
                    { codigoCliente: searchVal },
                    { id: searchVal },
                    { nombreCompleto: { contains: searchVal, mode: 'insensitive' } }
                ]
            }
        });

        if (cliente) {
            console.log('==================================================');
            console.log('✅ CLIENTE ENCONTRADO:');
            console.log('==================================================');
            console.log(`   ID Interno:     ${cliente.id}`);
            console.log(`   Código:         ${cliente.codigoCliente}`);
            console.log(`   Nombre:         ${cliente.nombreCompleto}`);
            console.log(`   Saldo Actual:   $${cliente.saldoActual}`);
            console.log(`   Estatus Cuenta: ${cliente.statusCuenta}`);
            console.log(`   Tipo Vivienda:  ${cliente.tipoPropiedad}`);
            console.log('==================================================');

            // Obtener pagos del cliente
            const pagos = await prisma.pago.findMany({
                where: { clienteId: cliente.id },
                orderBy: { fechaPago: 'desc' }
            });

            console.log(`\n📊 PAGOS APLICADOS AL CLIENTE (${pagos.length}):`);
            if (pagos.length === 0) {
                console.log('   (Ningún pago registrado)');
            } else {
                pagos.forEach((p, idx) => {
                    console.log(`   [${idx + 1}] ID: ${p.id}`);
                    console.log(`       Monto:    $${p.monto}`);
                    console.log(`       Fecha:    ${p.fechaPago.toISOString()}`);
                    console.log(`       Concepto: ${p.concepto}`);
                    console.log(`       Recibo:   ${p.numeroRecibo || 'Sin referencia'}`);
                    console.log(`       TicketId: ${p.ticketId || 'Sin ticket'}`);
                });
            }

            // Obtener tickets del cliente
            const tickets = await prisma.ticket.findMany({
                where: { clienteId: cliente.id },
                orderBy: { creadoEn: 'desc' }
            });

            console.log(`\n📊 TICKETS REGISTRADOS (${tickets.length}):`);
            if (tickets.length === 0) {
                console.log('   (Ningún ticket registrado)');
            } else {
                tickets.forEach((t, idx) => {
                    console.log(`   [${idx + 1}] ID: ${t.id} | Monto: $${t.monto} | Conciliado: ${t.conciliado ? 'CONCILIADO ✅' : 'PENDIENTE ⏳'} | Ref: ${t.referencia || 'N/A'} | Folio: ${t.folio || 'N/A'}`);
                });
            }
        } else {
            console.log('ℹ️  No se encontró ningún cliente con ese código/nombre.');
        }

        // 2. Buscar si el valor corresponde a un Pago o Recibo específico
        console.log(`\n🔍 Buscando si hay un Pago específico con ID/Referencia conteniendo: "${searchVal}"...`);
        const pagosRef = await prisma.pago.findMany({
            where: {
                OR: [
                    { id: searchVal },
                    { numeroRecibo: { contains: searchVal, mode: 'insensitive' } },
                    { concepto: { contains: searchVal, mode: 'insensitive' } }
                ]
            },
            include: {
                cliente: {
                    select: {
                        codigoCliente: true,
                        nombreCompleto: true
                    }
                }
            }
        });

        if (pagosRef.length > 0) {
            console.log('\n==================================================');
            console.log(`✅ SE ENCONTRARON ${pagosRef.length} PAGOS ESPECÍFICOS:`);
            console.log('==================================================');
            pagosRef.forEach((p, idx) => {
                console.log(`   [${idx + 1}] Pago ID: ${p.id}`);
                console.log(`       Cliente:  ${p.cliente?.nombreCompleto} (${p.cliente?.codigoCliente})`);
                console.log(`       Monto:    $${p.monto}`);
                console.log(`       Fecha:    ${p.fechaPago.toISOString()}`);
                console.log(`       Recibo:   ${p.numeroRecibo || 'Ninguno'}`);
                console.log(`       Concepto: ${p.concepto}`);
                console.log(`       Ticket:   ${p.ticketId || 'Sin ticket'}`);
                console.log('--------------------------------------------------');
            });
        } else {
            console.log('ℹ️  No se encontraron registros de pagos específicos para esa búsqueda.');
        }

    } catch (error: any) {
        console.error('\n❌ Error al realizar la consulta:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
