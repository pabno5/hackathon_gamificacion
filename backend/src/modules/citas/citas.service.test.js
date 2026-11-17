const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const CitasService = require('./citas.service');

const BASE = {
  id_cita: 'c1',
  id_medico: 'm1',
  id_sede: 's1',
  fecha_cita: '2026-12-01',
  hora_inicio: '09:00:00',
  hora_fin: '09:30:00',
  estado: 'pendiente',
};

/** Repositorio falso: guarda una cita en memoria y registra las llamadas. */
function crearRepo({ cita = BASE, choque = false } = {}) {
  const llamadas = { hayChoque: [], update: [] };
  let actual = { ...cita };
  return {
    llamadas,
    findById: async () => actual,
    hayChoqueMedico: async (args) => { llamadas.hayChoque.push(args); return choque; },
    update: async (id, data, actor, choqueArg) => {
      llamadas.update.push({ id, data, actor, choque: choqueArg });
      actual = { ...actual, ...data };
      return actual;
    },
  };
}

function crearServicio(opciones) {
  const repo = crearRepo(opciones);
  const bus = new EventEmitter();
  const eventos = [];
  for (const e of ['cita.updated', 'cita.cancelada']) bus.on(e, () => eventos.push(e));
  return { svc: new CitasService(repo, bus), repo, eventos };
}

test('cancelar por edición sin motivo → rechazado y no se toca la BD', async () => {
  const { svc, repo, eventos } = crearServicio();
  await assert.rejects(
    () => svc.actualizar('c1', { estado: 'cancelada' }, 'e1'),
    (e) => e.statusCode === 400 && /motivo/.test(e.message)
  );
  await assert.rejects(
    () => svc.actualizar('c1', { estado: 'cancelada', motivo_cancelacion: '  a ' }, 'e1'),
    (e) => e.statusCode === 400
  );
  assert.strictEqual(repo.llamadas.update.length, 0);
  assert.deepStrictEqual(eventos, []);
});

test('cancelar por edición con motivo → guarda el motivo y emite cita.cancelada', async () => {
  const { svc, repo, eventos } = crearServicio();
  const r = await svc.actualizar(
    'c1',
    { estado: 'cancelada', motivo_cancelacion: ' Paciente no puede asistir ', hora_inicio: '11:00', hora_fin: '11:30' },
    'e1'
  );
  assert.strictEqual(r.estado, 'cancelada');
  assert.deepStrictEqual(repo.llamadas.update[0].data, {
    estado: 'cancelada', motivo_cancelacion: 'Paciente no puede asistir',
  });
  // Es el evento que borra la cita de Google Calendar (no `cita.updated`).
  assert.deepStrictEqual(eventos, ['cita.cancelada']);
  // Una cita que se cancela no necesita validar choque de horario.
  assert.strictEqual(repo.llamadas.hayChoque.length, 0);
});

test('cambiar el horario → el repositorio recibe los valores finales para el candado', async () => {
  const { svc, repo, eventos } = crearServicio();
  await svc.actualizar('c1', { hora_inicio: '10:00', hora_fin: '10:30' }, 'e1');
  assert.deepStrictEqual(repo.llamadas.update[0].choque, {
    id_medico: 'm1', fecha_cita: '2026-12-01', hora_inicio: '10:00', hora_fin: '10:30',
  });
  assert.strictEqual(repo.llamadas.hayChoque[0].excluirCitaId, 'c1');
  assert.deepStrictEqual(eventos, ['cita.updated']);
});

test('cambiar el horario a un turno ocupado → 409 y no se actualiza', async () => {
  const { svc, repo } = crearServicio({ choque: true });
  await assert.rejects(
    () => svc.actualizar('c1', { hora_inicio: '10:00', hora_fin: '10:30' }, 'e1'),
    (e) => e.statusCode === 409
  );
  assert.strictEqual(repo.llamadas.update.length, 0);
});

test('hora_fin no posterior a hora_inicio → 400 (compara HH:MM con HH:MM:SS de la BD)', async () => {
  const { svc } = crearServicio();
  // Solo cambia hora_fin: se compara contra hora_inicio '09:00:00' guardada.
  await assert.rejects(() => svc.actualizar('c1', { hora_fin: '09:00' }, 'e1'), (e) => e.statusCode === 400);
  await assert.rejects(() => svc.actualizar('c1', { hora_fin: '08:30' }, 'e1'), (e) => e.statusCode === 400);
  await svc.actualizar('c1', { hora_fin: '09:45' }, 'e1'); // válido
});

test('editar solo el motivo → sin validación de choque ni candado', async () => {
  const { svc, repo } = crearServicio();
  await svc.actualizar('c1', { motivo: 'Control anual' }, 'e1');
  assert.strictEqual(repo.llamadas.hayChoque.length, 0);
  assert.strictEqual(repo.llamadas.update[0].choque, null);
});

test('marcar "no asistió" con el horario en el cuerpo → no falla por choque', async () => {
  // El modal siempre reenvía fecha y horas; una cita que deja de ocupar agenda
  // no debe rechazarse aunque otro paciente tenga ya ese turno.
  const { svc, repo } = crearServicio({ choque: true });
  const r = await svc.actualizar(
    'c1', { estado: 'no_asistio', hora_inicio: '09:00', hora_fin: '09:30' }, 'e1'
  );
  assert.strictEqual(r.estado, 'no_asistio');
  assert.strictEqual(repo.llamadas.hayChoque.length, 0);
  assert.strictEqual(repo.llamadas.update[0].choque, null);
});

test('reactivar una cita cancelada → se valida que el turno siga libre', async () => {
  const cancelada = { ...BASE, estado: 'cancelada' };
  const libre = crearServicio({ cita: cancelada });
  await libre.svc.actualizar('c1', { estado: 'pendiente' }, 'e1');
  assert.deepStrictEqual(libre.repo.llamadas.update[0].choque, {
    id_medico: 'm1', fecha_cita: '2026-12-01', hora_inicio: '09:00:00', hora_fin: '09:30:00',
  });

  const ocupado = crearServicio({ cita: cancelada, choque: true });
  await assert.rejects(
    () => ocupado.svc.actualizar('c1', { estado: 'pendiente' }, 'e1'),
    (e) => e.statusCode === 409
  );
});

test('motivo_cancelacion suelto (sin cancelar) no se guarda', async () => {
  const { svc, repo } = crearServicio();
  await svc.actualizar('c1', { motivo: 'x', motivo_cancelacion: 'no aplica' }, 'e1');
  assert.deepStrictEqual(repo.llamadas.update[0].data, { motivo: 'x' });
});
