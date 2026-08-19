import { PrismaClient } from '@prisma/client';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const clientes = await prisma.cliente.findMany({
    include: {
      pagos: {
        orderBy: [{ fechaPago: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });

  const alineacionMySQLVsManual: any[] = [];
  const botVsManual: any[] = [];
  const dobleBot: any[] = [];
  const dobleAppSimultaneo: any[] = [];

  for (const c of clientes) {
    const pagos = c.pagos;
    if (pagos.length <= 1) continue;

    for (let i = 0; i < pagos.length; i++) {
      for (let j = i + 1; j < pagos.length; j++) {
        const p1 = pagos[i];
        const p2 = pagos[j];
        const m1 = parseFloat(p1.monto.toString());
        const m2 = parseFloat(p2.monto.toString());

        if (m1 === m2 && m1 > 0) {
          const t1 = new Date(p1.createdAt).getTime();
          const t2 = new Date(p2.createdAt).getTime();
          const diffMin = Math.abs(t2 - t1) / (1000 * 60);

          const c1 = p1.concepto || '';
          const c2 = p2.concepto || '';
          const met1 = p1.metodoPago || '';
          const met2 = p2.metodoPago || '';

          const isMySQL1 = c1.includes('Alineación automática desde MySQL');
          const isMySQL2 = c2.includes('Alineación automática desde MySQL');
          const isBot1 = met1.includes('BOT') || c1.includes('TKT');
          const isBot2 = met2.includes('BOT') || c2.includes('TKT');

          // Caso 1: Alineación MySQL vs Manual/Bancario
          if (isMySQL1 || isMySQL2) {
            const f1 = new Date(p1.fechaPago).toISOString().slice(0, 10);
            const f2 = new Date(p2.fechaPago).toISOString().slice(0, 10);
            const diffDias = Math.abs(new Date(p1.fechaPago).getTime() - new Date(p2.fechaPago).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias <= 7) {
              alineacionMySQLVsManual.push({
                codigo: c.codigoCliente,
                nombre: c.nombreCompleto,
                saldoActual: c.saldoActual,
                pago1: p1,
                pago2: p2,
                diffDias,
              });
            }
          }
          // Caso 2: BOT vs Manual
          else if ((isBot1 && !isBot2) || (!isBot1 && isBot2)) {
            const diffDias = Math.abs(new Date(p1.fechaPago).getTime() - new Date(p2.fechaPago).getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias <= 3) {
              botVsManual.push({
                codigo: c.codigoCliente,
                nombre: c.nombreCompleto,
                saldoActual: c.saldoActual,
                pago1: p1,
                pago2: p2,
              });
            }
          }
          // Caso 3: Doble BOT
          else if (isBot1 && isBot2 && diffMin <= 120) {
            dobleBot.push({
              codigo: c.codigoCliente,
              nombre: c.nombreCompleto,
              saldoActual: c.saldoActual,
              pago1: p1,
              pago2: p2,
              diffMin: diffMin.toFixed(1),
            });
          }
          // Caso 4: Doble App simultáneo
          else if (!isBot1 && !isBot2 && diffMin <= 30) {
            dobleAppSimultaneo.push({
              codigo: c.codigoCliente,
              nombre: c.nombreCompleto,
              saldoActual: c.saldoActual,
              pago1: p1,
              pago2: p2,
              diffMin: diffMin.toFixed(1),
            });
          }
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 RESUMEN DE PAGOS DUPLICADOS/CRUZADOS EN EL SISTEMA:`);
  console.log(`======================================================`);
  console.log(`1. Alineación MySQL vs Registro Manual/Bancario: ${alineacionMySQLVsManual.length} casos`);
  console.log(`2. Bot Bancario (WhatsApp) vs Registro Manual:   ${botVsManual.length} casos`);
  console.log(`3. Doble Bot Bancario simultáneo (<2h):          ${dobleBot.length} casos`);
  console.log(`4. Doble Registro App / Multi-tap (<30m):        ${dobleAppSimultaneo.length} casos`);

  if (alineacionMySQLVsManual.length > 0) {
    console.log(`\n🔴 CASOS COMO DP2608003 (Alineación MySQL vs Manual):`);
    alineacionMySQLVsManual.forEach((item, idx) => {
      console.log(`[${idx + 1}] Contrato: ${item.codigo} | ${item.nombre} | Saldo: $${item.saldoActual}`);
      console.log(`     Pago 1 (${item.pago1.metodoPago}): ID=${item.pago1.id}, $${item.pago1.monto}, Fecha=${item.pago1.fechaPago.toISOString().slice(0, 10)}, Creado=${item.pago1.createdAt.toISOString()}, Concepto="${item.pago1.concepto}"`);
      console.log(`     Pago 2 (${item.pago2.metodoPago}): ID=${item.pago2.id}, $${item.pago2.monto}, Fecha=${item.pago2.fechaPago.toISOString().slice(0, 10)}, Creado=${item.pago2.createdAt.toISOString()}, Concepto="${item.pago2.concepto}"\n`);
    });
  }

  if (botVsManual.length > 0) {
    console.log(`\n🟠 CASOS BOT BANCARIO VS MANUAL:`);
    botVsManual.slice(0, 5).forEach((item, idx) => {
      console.log(`[${idx + 1}] Contrato: ${item.codigo} | ${item.nombre}`);
      console.log(`     Pago A: ID=${item.pago1.id}, $${item.pago1.monto}, Metodo=${item.pago1.metodoPago}, Creado=${item.pago1.createdAt.toISOString()}`);
      console.log(`     Pago B: ID=${item.pago2.id}, $${item.pago2.monto}, Metodo=${item.pago2.metodoPago}, Creado=${item.pago2.createdAt.toISOString()}\n`);
    });
  }

  if (dobleBot.length > 0) {
    console.log(`\n🟡 CASOS DOBLE BOT SIMULTÁNEO (<2h):`);
    dobleBot.slice(0, 5).forEach((item, idx) => {
      console.log(`[${idx + 1}] Contrato: ${item.codigo} | ${item.nombre} | Diff: ${item.diffMin} min`);
      console.log(`     Pago A: ID=${item.pago1.id}, Concepto="${item.pago1.concepto}"`);
      console.log(`     Pago B: ID=${item.pago2.id}, Concepto="${item.pago2.concepto}"\n`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
