/**
 * Utilidades para el Calendario Oficial de Cobranza
 * Regla de negocio:
 * Los ciclos de cobranza van de SÁBADO a las 00:00:00 al VIERNES a las 23:59:59.
 * 
 * En 2026:
 * Semana 1: Sábado 27/12/2025 al Viernes 02/01/2026
 * Semana 37: Sábado 05/09/2026 al Viernes 11/09/2026
 */

export interface RangoSemanaCobranza {
  anio: number;
  semana: number;
  inicio: Date;
  fin: Date;
  inicioStr: string; // 'YYYY-MM-DD'
  finStr: string;    // 'YYYY-MM-DD'
}

/**
 * Calcula el rango de fechas (Sábado a Viernes) para una semana y año dados.
 */
export function calcularRangoSemanaSabadoViernes(semana: number, anio: number): RangoSemanaCobranza {
  // Encontrar el primer viernes del año (concluye la semana 1 del año)
  let primerViernes = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerViernes.getUTCDay() !== 5) {
    primerViernes.setUTCDate(primerViernes.getUTCDate() + 1);
  }

  // Viernes de cierre de la semana solicitada
  const viernesFin = new Date(primerViernes);
  viernesFin.setUTCDate(primerViernes.getUTCDate() + (semana - 1) * 7);

  // Sábado de inicio (6 días antes)
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

  const pad = (n: number) => n.toString().padStart(2, '0');
  const inicioStr = `${inicioDate.getUTCFullYear()}-${pad(inicioDate.getUTCMonth() + 1)}-${pad(inicioDate.getUTCDate())}`;
  const finStr = `${finDate.getUTCFullYear()}-${pad(finDate.getUTCMonth() + 1)}-${pad(finDate.getUTCDate())}`;

  return {
    anio,
    semana,
    inicio: inicioDate,
    fin: finDate,
    inicioStr,
    finStr,
  };
}

/**
 * Dada una fecha (ej. fecha de pago), calcula la semana y el año de cobranza
 * basándose en el ciclo Sábado a Viernes.
 */
export function calcularSemanaCobranzaSabadoViernes(fechaInput: Date | string): { semana: number; anio: number } {
  let anioInput: number;
  let mesInput: number;
  let diaInput: number;

  if (typeof fechaInput === 'string') {
    // Si viene como '2026-09-05' o con hora '2026-09-05T...'
    const match = fechaInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      anioInput = parseInt(match[1], 10);
      mesInput = parseInt(match[2], 10) - 1;
      diaInput = parseInt(match[3], 10);
    } else {
      const d = new Date(fechaInput);
      anioInput = d.getFullYear();
      mesInput = d.getMonth();
      diaInput = d.getDate();
    }
  } else {
    // Es un objeto Date
    anioInput = fechaInput.getFullYear();
    mesInput = fechaInput.getMonth();
    diaInput = fechaInput.getDate();
  }

  // Objeto fecha en UTC fijado a mediodía para evitar cualquier transición de horario de verano
  const fecha = new Date(Date.UTC(anioInput, mesInput, diaInput, 12, 0, 0));
  const dayOfWeek = fecha.getUTCDay(); // 0: Dom, 1: Lun, ..., 5: Vie, 6: Sab

  // Días faltantes para llegar al Viernes de cierre de este ciclo semanal:
  // Sab (6) -> +6 días (el viernes de la semana siguiente)
  // Dom (0) -> +5 días
  // Lun (1) -> +4 días
  // Mar (2) -> +3 días
  // Mie (3) -> +2 días
  // Jue (4) -> +1 día
  // Vie (5) -> +0 días (hoy mismo es el cierre)
  const diasHastaViernes = (5 - dayOfWeek + 7) % 7;
  const viernesCierre = new Date(fecha);
  viernesCierre.setUTCDate(fecha.getUTCDate() + diasHastaViernes);

  const anio = viernesCierre.getUTCFullYear();

  // Primer viernes del año al que pertenece el cierre
  let primerViernes = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerViernes.getUTCDay() !== 5) {
    primerViernes.setUTCDate(primerViernes.getUTCDate() + 1);
  }

  const diffMs = viernesCierre.getTime() - primerViernes.getTime();
  const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  const semana = 1 + diffSemanas;

  return { semana, anio };
}

/**
 * Formateador seguro de fecha DD/MM/YYYY sin brinco por UTC
 */
export function formatearFechaCortaMX(fechaInput: Date | string | null | undefined): string {
  if (!fechaInput) return '-';
  if (typeof fechaInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fechaInput)) {
    const [y, m, d] = fechaInput.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(fechaInput);
  if (isNaN(d.getTime())) return '-';
  const dia = d.getUTCDate().toString().padStart(2, '0');
  const mes = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  const anio = d.getUTCFullYear();
  return `${dia}/${mes}/${anio}`;
}
