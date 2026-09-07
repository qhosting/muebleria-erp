const { PrismaClient } = require('@prisma/client');
const dbUrl = process.env.DIRECT_DATABASE_URL || 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

function calcularRangoSemanaSabadoViernes(semana, anio) {
  let primerViernes = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerViernes.getUTCDay() !== 5) {
    primerViernes.setUTCDate(primerViernes.getUTCDate() + 1);
  }

  const viernesFin = new Date(primerViernes);
  viernesFin.setUTCDate(primerViernes.getUTCDate() + (semana - 1) * 7);

  const sabadoInicio = new Date(viernesFin);
  sabadoInicio.setUTCDate(viernesFin.getUTCDate() - 6);

  const inicioDate = new Date(Date.UTC(
    sabadoInicio.getUTCFullYear(),
    sabadoInicio.getUTCMonth(),
    sabadoInicio.getUTCDate(),
    0, 0, 0, 0
  ));

  const finDate = new Date(Date.UTC(
    viernesFin.getUTCFullYear(),
    viernesFin.getUTCMonth(),
    viernesFin.getUTCDate(),
    23, 59, 59, 999
  ));

  return { anio, semana, inicio: inicioDate, fin: finDate };
}

async function main() {
  console.log('=== ACTUALIZACIÓN MASIVA DE PAGOS POR SEMANA DE COBRANZA ===');
  const anios = [2024, 2025, 2026, 2027];
  let totalActualizados = 0;

  for (const anio of anios) {
    for (let sem = 1; sem <= 53; sem++) {
      const rango = calcularRangoSemanaSabadoViernes(sem, anio);
      const res = await prisma.pago.updateMany({
        where: {
          fechaPago: {
            gte: rango.inicio,
            lte: rango.fin
          },
          OR: [
            { semanaCobranza: null },
            { anioCobranza: null }
          ]
        },
        data: {
          semanaCobranza: sem,
          anioCobranza: anio
        }
      });

      if (res.count > 0) {
        totalActualizados += res.count;
        if (anio === 2026 && sem >= 35 && sem <= 38) {
          console.log(`Año ${anio} Semana ${sem}: ${res.count} pagos vinculados`);
        }
      }
    }
  }

  const restantes = await prisma.pago.count({ where: { semanaCobranza: null } });
  console.log(`✅ Finalizado. Total pagos actualizados: ${totalActualizados}. Restantes sin semana: ${restantes}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
