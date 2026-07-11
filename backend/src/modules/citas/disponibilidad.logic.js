/**
 * Cálculo puro de slots libres para un médico en una fecha (BE-02).
 *
 * Todas las horas son strings 'HH:MM' o 'HH:MM:SS'. Sin dependencias de BD:
 * recibe los datos ya cargados y devuelve los slots disponibles.
 */

/** 'HH:MM[:SS]' → minutos desde medianoche. */
function aMin(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

/** minutos desde medianoche → 'HH:MM'. */
function aHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** ¿Se solapan los rangos [aIni,aFin) y [bIni,bFin)? (en minutos) */
function solapa(aIni, aFin, bIni, bFin) {
  return aIni < bFin && bIni < aFin;
}

/**
 * Devuelve los slots libres de un médico en una fecha.
 *
 * @param {object} p
 * @param {string} p.jornadaInicio  'HH:MM' inicio de jornada global
 * @param {string} p.jornadaFin     'HH:MM' fin de jornada global
 * @param {number} p.duracionMin    duración del slot en minutos
 * @param {{inicio?:string, fin?:string}} [p.almuerzo]  hora de almuerzo del médico
 * @param {Array<{hora_inicio:string, hora_fin:string}>} [p.bloqueos]  bloqueos del día
 * @param {Array<{hora_inicio:string, hora_fin:string}>} [p.ocupados]  citas ya agendadas del día
 * @returns {string[]} horas de inicio de cada slot libre ('HH:MM')
 */
function calcularSlotsLibres({
  jornadaInicio,
  jornadaFin,
  duracionMin,
  almuerzo = null,
  bloqueos = [],
  ocupados = [],
}) {
  const inicio = aMin(jornadaInicio);
  const fin = aMin(jornadaFin);
  const dur = Number(duracionMin) || 30;
  if (dur <= 0 || fin <= inicio) return [];

  // Rangos no disponibles: almuerzo + bloqueos + citas ocupadas
  const noDisponibles = [];
  if (almuerzo && almuerzo.inicio && almuerzo.fin) {
    noDisponibles.push([aMin(almuerzo.inicio), aMin(almuerzo.fin)]);
  }
  for (const b of bloqueos) {
    noDisponibles.push([aMin(b.hora_inicio), aMin(b.hora_fin)]);
  }
  for (const o of ocupados) {
    noDisponibles.push([aMin(o.hora_inicio), aMin(o.hora_fin)]);
  }

  const slots = [];
  for (let t = inicio; t + dur <= fin; t += dur) {
    const slotFin = t + dur;
    const chocado = noDisponibles.some(([ni, nf]) => solapa(t, slotFin, ni, nf));
    if (!chocado) slots.push(aHora(t));
  }
  return slots;
}

module.exports = { calcularSlotsLibres, aMin, aHora, solapa };
