const test = require('node:test');
const assert = require('node:assert');
const { calcularSlotsLibres } = require('./disponibilidad.logic');

const base = { jornadaInicio: '06:00', jornadaFin: '17:00', duracionMin: 30 };

test('jornada completa 06:00-17:00 en slots de 30 → 22 slots', () => {
  const slots = calcularSlotsLibres(base);
  assert.strictEqual(slots.length, 22); // 11h * 2
  assert.strictEqual(slots[0], '06:00');
  assert.strictEqual(slots[slots.length - 1], '16:30');
});

test('el almuerzo quita sus slots', () => {
  const slots = calcularSlotsLibres({ ...base, almuerzo: { inicio: '12:00', fin: '13:00' } });
  assert.ok(!slots.includes('12:00'));
  assert.ok(!slots.includes('12:30'));
  assert.ok(slots.includes('11:30'));
  assert.ok(slots.includes('13:00'));
  assert.strictEqual(slots.length, 20); // 22 - 2
});

test('un bloqueo quita sus slots', () => {
  const slots = calcularSlotsLibres({ ...base, bloqueos: [{ hora_inicio: '09:00', hora_fin: '10:00' }] });
  assert.ok(!slots.includes('09:00'));
  assert.ok(!slots.includes('09:30'));
  assert.ok(slots.includes('08:30'));
  assert.ok(slots.includes('10:00'));
});

test('una cita ya agendada ocupa su slot', () => {
  const slots = calcularSlotsLibres({ ...base, ocupados: [{ hora_inicio: '14:00', hora_fin: '14:30' }] });
  assert.ok(!slots.includes('14:00'));
  assert.ok(slots.includes('14:30'));
});

test('solapamiento parcial también bloquea el slot', () => {
  // cita 09:15-09:45 solapa con los slots 09:00-09:30 y 09:30-10:00
  const slots = calcularSlotsLibres({ ...base, ocupados: [{ hora_inicio: '09:15', hora_fin: '09:45' }] });
  assert.ok(!slots.includes('09:00'));
  assert.ok(!slots.includes('09:30'));
  assert.ok(slots.includes('08:30'));
  assert.ok(slots.includes('10:00'));
});

test('combina almuerzo + bloqueo + citas', () => {
  const slots = calcularSlotsLibres({
    ...base,
    almuerzo: { inicio: '12:00', fin: '13:00' },
    bloqueos: [{ hora_inicio: '06:00', hora_fin: '07:00' }],
    ocupados: [{ hora_inicio: '15:00', hora_fin: '15:30' }],
  });
  assert.ok(!slots.includes('06:00'));
  assert.ok(!slots.includes('06:30'));
  assert.ok(!slots.includes('12:00'));
  assert.ok(!slots.includes('15:00'));
  assert.strictEqual(slots.length, 22 - 2 - 2 - 1);
});

test('jornada inválida (fin <= inicio) → sin slots', () => {
  assert.deepStrictEqual(calcularSlotsLibres({ ...base, jornadaFin: '06:00' }), []);
});

test('el último slot no se pasa del fin de jornada', () => {
  const slots = calcularSlotsLibres({ jornadaInicio: '06:00', jornadaFin: '07:00', duracionMin: 45 });
  // 06:00-06:45 cabe; 06:45-07:30 no → solo 1 slot
  assert.deepStrictEqual(slots, ['06:00']);
});
