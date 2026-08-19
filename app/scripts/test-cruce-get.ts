import { PrismaClient } from '@prisma/client';
import { getContpaqiService } from '../lib/contpaqi-service';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

function obtenerEmpresaContpaqi(codigoCliente: string): string | undefined {
  const cod = (codigoCliente || '').trim().toUpperCase();
  if (cod.startsWith('DQ')) return 'DQ';
  if (cod.startsWith('DP')) return 'DP';
  return undefined;
}

async function main() {
  console.log('🧪 TESTEANDO OBTENCIÓN AUTOMÁTICA DE SALDOS CONTPAQI EN CRUCE...');

  const codigos = ['DP2608003', 'DP2608001', 'DQ2601071', 'DP2605137', 'DP2604110'];

  const porEmp: Record<string, string[]> = {};
  for (const cod of codigos) {
    const emp = obtenerEmpresaContpaqi(cod) || 'DQ';
    if (!porEmp[emp]) porEmp[emp] = [];
    porEmp[emp].push(cod);
  }

  const saldosContpaqiMap: Record<string, number> = {};

  for (const [emp, cods] of Object.entries(porEmp)) {
    console.log(`\nConsultando empresa ${emp} para [${cods.join(', ')}]...`);
    const srv = await getContpaqiService(prisma, emp);

    await Promise.allSettled(
      cods.map(async (cod) => {
        try {
          const ec = await srv.getClienteEstadoCuenta(cod, emp);
          let raw: any = ec?.saldoActual ?? ec?.saldoTotal ?? ec?.cSaldoActual ?? ec?.saldo ?? ec?.CSALDOACTUAL ?? ec?.cSaldo;
          if (raw === undefined || raw === null) {
            const c = await srv.getCliente(cod, emp);
            raw = c?.cSaldoActual ?? c?.csaldoactual ?? c?.cSaldo ?? c?.saldo ?? c?.CSALDOACTUAL ?? c?.CSALDO ?? c?.saldoActual ?? c?.saldoTotal ?? c?.cPendiente ?? c?.pendiente ?? c?.Saldo;
          }

          if (raw !== undefined && raw !== null && raw !== '') {
            const parsed = parseFloat(raw.toString()) || 0;
            saldosContpaqiMap[cod] = parsed;
          }
        } catch (e: any) {
          console.error(`Error consultando ${cod}:`, e.message);
        }
      })
    );
  }

  console.log('\n📊 RESULTADOS MAPEADOS PARA AUDITORÍA:');
  for (const [cod, saldo] of Object.entries(saldosContpaqiMap)) {
    console.log(`  - ${cod}: Saldo ContPAQi = $${saldo.toFixed(2)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
