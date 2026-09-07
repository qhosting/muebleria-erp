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
  // Primer sábado operativo del año
  let primerSabado = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerSabado.getUTCDay() !== 6) {
    primerSabado.setUTCDate(primerSabado.getUTCDate() + 1);
  }

  // Sábado de inicio de la semana solicitada
  const sabadoInicio = new Date(primerSabado);
  sabadoInicio.setUTCDate(primerSabado.getUTCDate() + (semana - 1) * 7);

  // Viernes de cierre (6 días después)
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
 * basándose en el ciclo Sábado a Viernes operativo.
 */
export function calcularSemanaCobranzaSabadoViernes(fechaInput: Date | string): { semana: number; anio: number } {
  let anioInput: number;
  let mesInput: number;
  let diaInput: number;

  if (typeof fechaInput === 'string') {
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
    anioInput = fechaInput.getFullYear();
    mesInput = fechaInput.getMonth();
    diaInput = fechaInput.getDate();
  }

  // Objeto fecha en UTC fijado a mediodía para evitar cualquier transición de horario de verano
  const fecha = new Date(Date.UTC(anioInput, mesInput, diaInput, 12, 0, 0));
  const dayOfWeek = fecha.getUTCDay(); // 0: Dom, 1: Lun, ..., 5: Vie, 6: Sab

  // Sábado de inicio de este ciclo de cobranza:
  // Sab (6) -> -0 días
  // Dom (0) -> -1 día
  // Lun (1) -> -2 días
  // Mar (2) -> -3 días
  // Mie (3) -> -4 días
  // Jue (4) -> -5 días
  // Vie (5) -> -6 días
  const diasDesdeSabado = (dayOfWeek + 1) % 7;
  const sabadoCiclo = new Date(fecha);
  sabadoCiclo.setUTCDate(fecha.getUTCDate() - diasDesdeSabado);

  const anio = sabadoCiclo.getUTCFullYear();

  // Primer sábado del año
  let primerSabado = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
  while (primerSabado.getUTCDay() !== 6) {
    primerSabado.setUTCDate(primerSabado.getUTCDate() + 1);
  }

  const diffMs = sabadoCiclo.getTime() - primerSabado.getTime();
  const diffSemanas = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  if (diffSemanas < 0) {
    const anioAnt = anio - 1;
    let primerSabadoAnt = new Date(Date.UTC(anioAnt, 0, 1, 12, 0, 0));
    while (primerSabadoAnt.getUTCDay() !== 6) {
      primerSabadoAnt.setUTCDate(primerSabadoAnt.getUTCDate() + 1);
    }
    const diffAnt = Math.round((sabadoCiclo.getTime() - primerSabadoAnt.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return { semana: 1 + diffAnt, anio: anioAnt };
  }

  return { semana: 1 + diffSemanas, anio };
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
