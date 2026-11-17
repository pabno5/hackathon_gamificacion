/**
 * Utilidades de fecha independientes de la zona horaria del servidor.
 *
 * El servidor puede correr en UTC (Railway) mientras la clínica opera en
 * America/Bogota. `new Date().toISOString().slice(0, 10)` devuelve la fecha UTC,
 * que después de las 7 p. m. hora Colombia ya es "mañana". Estas funciones
 * calculan siempre en la zona de la clínica.
 */
const TIMEZONE = process.env.TIMEZONE || 'America/Bogota';
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha y hora actuales en la zona de la clínica: { fecha: 'YYYY-MM-DD', hora: 'HH:MM' }. */
function ahoraEnZona(date = new Date(), timeZone = TIMEZONE) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

/** 'YYYY-MM-DD' de hoy en la zona de la clínica. */
function hoyEnZona(timeZone = TIMEZONE) {
  return ahoraEnZona(new Date(), timeZone).fecha;
}

/** ¿Es una fecha 'YYYY-MM-DD' real? (rechaza 2026-02-31, texto libre, etc.) */
function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !FECHA_RE.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** Suma días a una fecha 'YYYY-MM-DD' (aritmética en UTC: sin saltos por zona horaria). */
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

module.exports = { TIMEZONE, ahoraEnZona, hoyEnZona, esFechaValida, sumarDias };
