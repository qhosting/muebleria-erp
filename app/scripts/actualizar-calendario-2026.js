const { PrismaClient } = require('c:/Users/AurumArch/Documents/PROYECTOS/muebleria-erp/app/node_modules/@prisma/client');
const dbUrl = process.env.DIRECT_DATABASE_URL || 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

function calcularRangoSemanaSabadoViernes(semana, anio) {
  let primerSabado = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerSabado.getUTCDay() !== 6) {
    primerSabado.setUTCDate(primerSabado.getUTCDate() + 1);
  }

  const sabadoInicio = new Date(primerSabado);
  sabadoInicio.setUTCDate(primerSabado.getUTCDate() + (semana - 1) * 7);

  const viernesFin = new Date(sabadoInicio);
  viernesFin.setUTCDate(sabadoInicio.getUTCDate() + 6);

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
  console.log('=== ACTUALIZANDO CALENDARIO ANUAL 2026 (Semana 35: 29/08 - 04/09, Semana 36: 05/09 - 11/09) ===');
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

    if (sem === 34 || sem === 35 || sem === 36 || sem === 37 || sem === 1) {
      console.log(`Semana ${sem}: ${rango.inicioStr} (Sáb) al ${rango.finStr} (Vie)`);
    }
  }

  console.log('✅ Calendario 2026 actualizado con éxito.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
