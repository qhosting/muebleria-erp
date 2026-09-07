import { PrismaClient } from '@prisma/client'
import { calcularSemanaCobranzaSabadoViernes } from './calendario-cobranza-utils'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createExtendedClient() {
  const baseClient = new PrismaClient()
  return baseClient.$extends({
    query: {
      pago: {
        async create({ args, query }) {
          if (args.data) {
            const fecha = (args.data as any).fechaPago || new Date()
            if (!(args.data as any).semanaCobranza || !(args.data as any).anioCobranza) {
              const calc = calcularSemanaCobranzaSabadoViernes(fecha)
              if (!(args.data as any).semanaCobranza) (args.data as any).semanaCobranza = calc.semana
              if (!(args.data as any).anioCobranza) (args.data as any).anioCobranza = calc.anio
            }
          }
          return query(args)
        },
        async createMany({ args, query }) {
          if (Array.isArray(args.data)) {
            for (const item of args.data) {
              const fecha = (item as any).fechaPago || new Date()
              if (!(item as any).semanaCobranza || !(item as any).anioCobranza) {
                const calc = calcularSemanaCobranzaSabadoViernes(fecha)
                if (!(item as any).semanaCobranza) (item as any).semanaCobranza = calc.semana
                if (!(item as any).anioCobranza) (item as any).anioCobranza = calc.anio
              }
            }
          }
          return query(args)
        },
        async upsert({ args, query }) {
          if (args.create) {
            const fecha = (args.create as any).fechaPago || new Date()
            if (!(args.create as any).semanaCobranza || !(args.create as any).anioCobranza) {
              const calc = calcularSemanaCobranzaSabadoViernes(fecha)
              if (!(args.create as any).semanaCobranza) (args.create as any).semanaCobranza = calc.semana
              if (!(args.create as any).anioCobranza) (args.create as any).anioCobranza = calc.anio
            }
          }
          return query(args)
        }
      }
    }
  })
}

export const prisma = (globalForPrisma.prisma ?? createExtendedClient()) as unknown as PrismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
