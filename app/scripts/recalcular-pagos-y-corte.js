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

  return { anio, semana, inicio: inicioDate, fin: finDate };
}

async function main() {
  console.log('=== REASIGNANDO SEMANAS DE COBRANZA A PAGOS (2024-2027) ===');
  const anios = [2024, 2025, 2026, 2027];
  let total = 0;

  for (const anio of anios) {
    for (let sem = 1; sem <= 53; sem++) {
      const rango = calcularRangoSemanaSabadoViernes(sem, anio);
      const res = await prisma.pago.updateMany({
        where: {
          fechaPago: {
            gte: rango.inicio,
            lte: rango.fin
          }
        },
        data: {
          semanaCobranza: sem,
          anioCobranza: anio
        }
      });

      if (res.count > 0) {
        total += res.count;
        if (anio === 2026 && (sem === 35 || sem === 36 || sem === 37)) {
          console.log(`Año ${anio} Semana ${sem} (${rango.inicio.toISOString().split('T')[0]} al ${rango.fin.toISOString().split('T')[0]}): ${res.count} pagos vinculados`);
        }
      }
    }
  }
  console.log(`Total pagos reasignados: ${total}`);

  // 2. Corregir el corte de cobranza guardado
  console.log('=== CORRIGIENDO CORTE GUARDADO ===');
  const corte37 = await prisma.corteCobranza.findFirst({
    where: { anio: 2026, semana: 37 }
  });

  if (corte37) {
    const rango36 = calcularRangoSemanaSabadoViernes(36, 2026);
    // Verificar si ya existe semana 36 para ese cobrador
    const existe36 = await prisma.corteCobranza.findUnique({
      where: {
        anio_semana_cobradorId: {
          anio: 2026,
          semana: 36,
          cobradorId: corte37.cobradorId
        }
      }
    });

    if (existe36) {
      await prisma.corteCobranza.delete({ where: { id: existe36.id } });
    }

    const corteActualizado = await prisma.corteCobranza.update({
      where: { id: corte37.id },
      data: {
        semana: 36,
        fechaInicio: rango36.inicio,
        fechaFin: rango36.fin,
        observaciones: '36'
      }
    });
    console.log(`✅ Corte ${corteActualizado.id} corregido a Semana 36 (05/09/2026 - 11/09/2026)`);
  } else {
    console.log('No se encontró corte en semana 37 para reubicar.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
