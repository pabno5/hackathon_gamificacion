/**
 * Fecha de hoy 'YYYY-MM-DD' en la hora local del navegador.
 *
 * `new Date().toISOString().slice(0, 10)` da la fecha en UTC: en Colombia
 * (UTC-5) después de las 7 p. m. ya devuelve el día siguiente.
 */
export function hoyLocal(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
