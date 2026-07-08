const test = require('node:test');
const assert = require('node:assert');
const HistoriasService = require('./historias.service');

// filtrarPorRol es lógica pura (no usa el repo), así que instanciamos con null.
const service = new HistoriasService(null);

const historiaCompleta = {
  id_historia: 'h1',
  id_paciente: 'p1',
  motivo_consulta: 'Control visual',
  diagnostico_principal: 'Miopía',
  medicamentos_recetados: 'Gotas',
  enfermedad_actual: 'Visión borrosa',
  agudeza_visual: '20/40',
};

test('recepcionista NO ve campos clínicos sensibles (HC-05)', () => {
  const out = service.filtrarPorRol(historiaCompleta, 'recepcionista');
  assert.strictEqual(out.diagnostico_principal, undefined);
  assert.strictEqual(out.medicamentos_recetados, undefined);
  assert.strictEqual(out.enfermedad_actual, undefined);
  assert.strictEqual(out.agudeza_visual, undefined);
  // Pero SÍ conserva identificación + motivo
  assert.strictEqual(out.motivo_consulta, 'Control visual');
  assert.strictEqual(out.id_paciente, 'p1');
});

test('médico ve la historia completa', () => {
  const out = service.filtrarPorRol(historiaCompleta, 'medico');
  assert.strictEqual(out.diagnostico_principal, 'Miopía');
  assert.strictEqual(out.agudeza_visual, '20/40');
});

test('admin ve la historia completa', () => {
  const out = service.filtrarPorRol(historiaCompleta, 'admin');
  assert.strictEqual(out.diagnostico_principal, 'Miopía');
});

test('filtrarPorRol no rompe con historia nula', () => {
  assert.strictEqual(service.filtrarPorRol(null, 'recepcionista'), null);
});
