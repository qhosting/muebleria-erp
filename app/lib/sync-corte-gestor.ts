import { prisma } from '@/lib/db';
import { calcularSemanaCobranzaSabadoViernes } from '@/lib/calendario-cobranza-utils';
import { normalizarDiaSemana, calcularSUP } from '@/lib/corte-cej-utils';

/**
 * Sincroniza el gestor asignado de un cliente en los cortes de cobranza
 * ÚNICAMENTE para la semana actual tomando en cuenta la fecha de hoy.
 * 
 * Las semanas pasadas (históricos) NO se tocan para preservar la auditoría.
 */
export async function syncClienteGestorEnCorteActual(
  clienteId: string,
  codigoCliente: string,
  nuevoCobradorId: string | null | undefined,
  antiguoCobradorId?: string | null
) {
  try {
    const semActual = calcularSemanaCobranzaSabadoViernes(new Date());
    const { semana, anio } = semActual;

    // 1. Obtener el nombre / código del nuevo gestor
    let nuevoGestorNombre = '-';
    if (nuevoCobradorId && nuevoCobradorId !== 'sin-asignar') {
      const cobrador = await prisma.user.findUnique({
        where: { id: nuevoCobradorId },
        select: { id: true, name: true, codigoGestor: true }
      });
      if (cobrador) {
        nuevoGestorNombre = cobrador.codigoGestor || cobrador.name;
      }
    }

    const cleanCodigo = codigoCliente.toUpperCase().trim();

    // 2. Actualizar el campo gestor en todos los detalles de cortes de la SEMANA ACTUAL
    // tanto en el corte general (TODOS) como en cualquier corte donde esté el cliente
    await prisma.corteCobranzaDetalle.updateMany({
      where: {
        OR: [
          { clienteId },
          { codigoCliente: cleanCodigo }
        ],
        corte: {
          anio,
          semana
        }
      },
      data: {
        gestor: nuevoGestorNombre
      }
    });

    // 3. Manejo de cortes individuales de cobradores específicos (Semana Actual)
    // Si el cobrador anterior tenía un corte individual abierto
    if (antiguoCobradorId && antiguoCobradorId !== nuevoCobradorId && antiguoCobradorId !== 'TODOS') {
      const corteAntiguo = await prisma.corteCobranza.findUnique({
        where: {
          anio_semana_cobradorId: {
            anio,
            semana,
            cobradorId: antiguoCobradorId
          }
        },
        include: {
          detalles: {
            where: {
              OR: [
                { clienteId },
                { codigoCliente: cleanCodigo }
              ]
            }
          }
        }
      });

      // Si el corte está abierto y el cliente no registró pagos con ese cobrador en la semana,
      // se remueve del corte individual anterior para que no aparezca en su lista
      if (corteAntiguo && corteAntiguo.estatus === 'abierto') {
        for (const det of corteAntiguo.detalles) {
          const pagoReal = parseFloat(det.pagoReal.toString()) || 0;
          if (pagoReal === 0) {
            await prisma.corteCobranzaDetalle.delete({
              where: { id: det.id }
            });
          }
        }
      }
    }

    // Si el nuevo cobrador tiene un corte individual abierto para la semana actual
    if (nuevoCobradorId && nuevoCobradorId !== 'sin-asignar' && nuevoCobradorId !== 'TODOS') {
      const corteNuevo = await prisma.corteCobranza.findUnique({
        where: {
          anio_semana_cobradorId: {
            anio,
            semana,
            cobradorId: nuevoCobradorId
          }
        },
        include: {
          detalles: {
            where: {
              OR: [
                { clienteId },
                { codigoCliente: cleanCodigo }
              ]
            }
          }
        }
      });

      // Si existe el corte del nuevo cobrador y está abierto pero aún no tiene este cliente, agregarlo
      if (corteNuevo && corteNuevo.estatus === 'abierto' && corteNuevo.detalles.length === 0) {
        const c = await prisma.cliente.findUnique({
          where: { id: clienteId }
        });

        if (c && c.statusCuenta === 'activo') {
          const montoPagoNum = parseFloat(c.montoPago.toString()) || 0;
          const saldoVencidoNum = c.saldoVencido ? parseFloat(c.saldoVencido.toString()) : 0;
          const pvNum =
            montoPagoNum > 0 && saldoVencidoNum > 0
              ? Math.round(saldoVencidoNum / montoPagoNum)
              : c.diasVencidos > 0
              ? Math.ceil(c.diasVencidos / 7)
              : 0;

          const diaNormalizado = normalizarDiaSemana(c.diaPago);
          const sup = calcularSUP(c.periodicidad || 'SEMANAL', pvNum);

          await prisma.corteCobranzaDetalle.create({
            data: {
              corteId: corteNuevo.id,
              clienteId: c.id,
              codigoCliente: c.codigoCliente,
              numContrato: c.numContrato || null,
              nombreCliente: c.nombreCompleto,
              periodoInicial: c.fechaVenta || null,
              periodicidad: c.periodicidad || 'SEMANAL',
              pagoSugerido: montoPagoNum,
              saldoVencido: saldoVencidoNum,
              pv: pvNum,
              saldoActual: parseFloat(c.saldoActual.toString()) || 0,
              gestor: nuevoGestorNombre,
              sup,
              moratorio: 0,
              pvr: saldoVencidoNum,
              pagoReal: 0,
              diaPago: diaNormalizado,
              tipoCobro: '0',
              telefono: c.telefono || null,
              telefono2: c.telefonoTrabajo || null,
              c: 0,
              pagoAnalista: diaNormalizado,
              problema: c.clasificacionCobranza || 'PE',
              pagoDoble: 0,
              numPagosDobles: 0,
              recuperadoPv: 0,
              numPagosDobles2: 0,
              comisionAnalista: 0,
              fechaPago: null,
              serie: ''
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error sincronizando gestor en corte de semana actual:', error);
  }
}
