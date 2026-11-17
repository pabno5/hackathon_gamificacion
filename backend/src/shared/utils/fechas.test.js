const test = require('node:test');
const assert = require('node:assert');
const { ahoraEnZona, esFechaValida, sumarDias } = require('./fechas');

test('ahoraEnZona: 01:30 UTC sigue siendo el día anterior en Bogotá (UTC-5)', () => {
  const r = ahoraEnZona(new Date('2026-11-17T01:30:00Z'), 'America/Bogota');
  assert.deepStrictEqual(r, { fecha: '2026-11-16', hora: '20:30' });
});

test('ahoraEnZona: medianoche se formatea como 00, no 24', () => {
  const r = ahoraEnZona(new Date('2026-11-17T05:00:00Z'), 'America/Bogota');
  assert.deepStrictEqual(r, { fecha: '2026-11-17', hora: '00:00' });
});

test('esFechaValida: acepta fechas reales y rechaza el resto', () => {
  assert.strictEqual(esFechaValida('2026-02-28'), true);
  assert.strictEqual(esFechaValida('2026-02-31'), false);
  assert.strictEqual(esFechaValida('2026-2-1'), false);
  assert.strictEqual(esFechaValida('hoy'), false);
  assert.strictEqual(esFechaValida(undefined), false);
  assert.strictEqual(esFechaValida("2026-01-01'; DROP TABLE citas;--"), false);
});

test('sumarDias: cruza mes y año sin depender de la zona del servidor', () => {
  assert.strictEqual(sumarDias('2026-12-30', 3), '2027-01-02');
  assert.strictEqual(sumarDias('2028-02-28', 1), '2028-02-29');
  assert.strictEqual(sumarDias('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(sumarDias('2026-11-16', 0), '2026-11-16');
});
