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

  const pad = (n) => n.toString().padStart(2, '0');
  const inicioStr = `${inicioDate.getUTCFullYear()}-${pad(inicioDate.getUTCMonth() + 1)}-${pad(inicioDate.getUTCDate())}`;
  const finStr = `${finDate.getUTCFullYear()}-${pad(finDate.getUTCMonth() + 1)}-${pad(finDate.getUTCDate())}`;

  return { anio, semana, inicio: inicioDate, fin: finDate, inicioStr, finStr };
}

async function main() {
  console.log('=== ACTUALIZANDO CALENDARIO ANUAL DE COBRANZA 2026 A CICLO SÁBADO - VIERNES ===');
  const anio = 2026;

  for (let sem = 1; sem <= 52; sem++) {
    const rango = calcularRangoSemanaSabadoViernes(sem, anio);

    const existente = await prisma.calendarioCobranza.findUnique({
      where: {
        anio_semana: { anio, semana: sem }
      }
    });

    const periodicidades = existente?.periodicidadesActivas || [
      'diario',
      'semanal',
      'catorcenal',
      'quincenal',
      'mensual'
    ];

    await prisma.calendarioCobranza.upsert({
      where: {
        anio_semana: { anio, semana: sem }
      },
      update: {
        fechaInicio: rango.inicio,
        fechaFin: rango.fin,
      },
      create: {
        anio,
        semana: sem,
        fechaInicio: rango.inicio,
        fechaFin: rango.fin,
        periodicidadesActivas: periodicidades
      }
    });

    if (sem === 36 || sem === 37 || sem === 38 || sem === 1 || sem === 52) {
      console.log(`Semana ${sem}: ${rango.inicioStr} (Sáb) al ${rango.finStr} (Vie)`);
    }
  }

  console.log('✅ Calendario 2026 actualizado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error al actualizar calendario:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
