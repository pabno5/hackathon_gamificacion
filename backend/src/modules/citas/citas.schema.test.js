const test = require('node:test');
const assert = require('node:assert');
const schema = require('./citas.schema');

const UUID = '11111111-1111-4111-8111-111111111111'; // v4 válido
const citaValida = {
  id_paciente: UUID,
  id_medico: UUID,
  id_sede: UUID,
  fecha_cita: '2026-08-01',
  hora_inicio: '09:00',
  hora_fin: '09:30',
  canal: 'presencial',
};

test('crear acepta una cita válida', () => {
  const r = schema.crear.safeParse(citaValida);
  assert.strictEqual(r.success, true);
});

test('crear rechaza hora_fin <= hora_inicio', () => {
  const r = schema.crear.safeParse({ ...citaValida, hora_fin: '09:00' });
  assert.strictEqual(r.success, false);
});

test('crear rechaza canal inválido', () => {
  const r = schema.crear.safeParse({ ...citaValida, canal: 'whatsapp' });
  assert.strictEqual(r.success, false);
});

test('crear exige id_sede (CIT-01)', () => {
  const { id_sede, ...sinSede } = citaValida;
  const r = schema.crear.safeParse(sinSede);
  assert.strictEqual(r.success, false);
});

test('cancelar exige motivo de al menos 3 caracteres (CIT-10)', () => {
  assert.strictEqual(schema.cancelar.safeParse({ motivo_cancelacion: 'ok no' }).success, true);
  assert.strictEqual(schema.cancelar.safeParse({ motivo_cancelacion: 'ab' }).success, false);
  assert.strictEqual(schema.cancelar.safeParse({}).success, false);
});
