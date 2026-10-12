import { prisma } from '../lib/db';
import { getContpaqiService } from '../lib/contpaqi-service';

async function main() {
  console.log('🚀 Iniciando escaneo de saldos reales y reactivación de clientes DP desde ContPAQi...');

  const dpClients = await prisma.cliente.findMany({
    where: {
      codigoCliente: { startsWith: 'DP' }
    },
    select: {
      id: true,
      codigoCliente: true,
      nombreCompleto: true,
      saldoActual: true,
      statusCuenta: true,
      cobradorAsignadoId: true,
      cobradorAsignado: { select: { name: true, codigoGestor: true } }
    }
  });

  console.log(`📋 Total de clientes DP en base de datos: ${dpClients.length}`);

  const service = await getContpaqiService(prisma);

  let reactivados = 0;
  let saldoCero = 0;
  let errores = 0;
  let totalSaldoRecuperado = 0;

  // Procesar en lotes de 10 concurrentes
  const batchSize = 10;
  for (let i = 0; i < dpClients.length; i += batchSize) {
    const batch = dpClients.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (cliente) => {
      try {
        const ec = await service.getClienteEstadoCuenta(cliente.codigoCliente, 'DP');
        if (!ec) {
          console.warn(`⚠️ No se encontró estado de cuenta para ${cliente.codigoCliente}`);
          return;
        }

        const saldoReal = parseFloat(ec.saldoActual?.toString() || '0');
        const saldoVencidoReal = parseFloat(ec.saldoVencido?.toString() || '0');
        const diasVencidosReal = parseInt(ec.diasVencidos?.toString() || '0');

        if (saldoReal > 0) {
          totalSaldoRecuperado += saldoReal;
          reactivados++;

          await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
              saldoActual: saldoReal,
              saldoVencido: saldoVencidoReal,
              diasVencidos: diasVencidosReal,
              statusCuenta: 'activo',
              fechaInactivacion: null
            }
          });
        } else {
          saldoCero++;
          // Si realmente tiene saldo 0 en ContPAQi, asegurar que su saldoActual sea 0
          if (Number(cliente.saldoActual) !== 0) {
            await prisma.cliente.update({
              where: { id: cliente.id },
              data: {
                saldoActual: 0,
                saldoVencido: 0,
                diasVencidos: 0
              }
            });
          }
        }
      } catch (err: any) {
        errores++;
        console.error(`❌ Error procesando ${cliente.codigoCliente}:`, err.message);
      }
    }));

    if ((i + batchSize) % 50 === 0 || i + batchSize >= dpClients.length) {
      console.log(`⏳ Progreso: ${Math.min(i + batchSize, dpClients.length)} / ${dpClients.length} procesados... (Reactivados: ${reactivados}, Saldo $0: ${saldoCero}, Errores: ${errores})`);
    }
  }

  console.log('\n=========================================');
  console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
  console.log(`Total Clientes DP analizados: ${dpClients.length}`);
  console.log(`Clientes DP reactivados con saldo: ${reactivados}`);
  console.log(`Clientes DP confirmados con saldo $0 (liquidados): ${saldoCero}`);
  console.log(`Errores en consulta ContPAQi: ${errores}`);
  console.log(`Cartera total reactivada: $${totalSaldoRecuperado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
  console.log('=========================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
