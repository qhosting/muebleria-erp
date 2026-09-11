import { PrismaClient } from '@prisma/client'
import { calcularSemanaCobranzaSabadoViernes } from './calendario-cobranza-utils'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

async function verificarYAjustarSemanaSiCorteCerrado(data: any, baseClient: PrismaClient) {
  if (!data) return;
  const fecha = data.fechaPago || new Date();
  if (!data.semanaCobranza || !data.anioCobranza) {
    const calc = calcularSemanaCobranzaSabadoViernes(fecha);
    if (!data.semanaCobranza) data.semanaCobranza = calc.semana;
    if (!data.anioCobranza) data.anioCobranza = calc.anio;
  }

  // Si el cobrador tiene su corte oficial ya cerrado para esta semana,
  // el pago nuevo se considera automáticamente para la nueva semana de cobranza
  if (data.cobradorId && data.semanaCobranza && data.anioCobranza) {
    try {
      const corte = await baseClient.corteCobranza.findUnique({
        where: {
          anio_semana_cobradorId: {
            anio: data.anioCobranza,
            semana: data.semanaCobranza,
            cobradorId: data.cobradorId
          }
        },
        select: { estatus: true }
      });
      if (corte && corte.estatus === "cerrado") {
        data.semanaCobranza += 1;
        if (data.semanaCobranza > 52) {
          data.semanaCobranza = 1;
          data.anioCobranza += 1;
        }
      }
    } catch {
      // Continuar con la semana calculada
    }
  }
}

function createExtendedClient() {
  const baseClient = new PrismaClient();
  return baseClient.$extends({
    query: {
      pago: {
        async create({ args, query }) {
          if (args.data) {
            await verificarYAjustarSemanaSiCorteCerrado(args.data, baseClient);
          }
          return query(args);
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            for (const item of args.data) {
              await verificarYAjustarSemanaSiCorteCerrado(item, baseClient);
            }
          }
          return query(args);
        },
        async upsert({ args, query }) {
          if (args.create) {
            await verificarYAjustarSemanaSiCorteCerrado(args.create, baseClient);
          }
          return query(args);
        }
      }
    }
  });
}

export const prisma = (globalForPrisma.prisma ?? createExtendedClient()) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
