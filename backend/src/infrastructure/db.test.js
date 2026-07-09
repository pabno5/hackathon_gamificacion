const test = require('node:test');
const assert = require('node:assert');
const { setActor, queryAs, withActor } = require('./db');

test('db expone helpers de auditoría', () => {
  assert.strictEqual(typeof setActor, 'function');
  assert.strictEqual(typeof queryAs, 'function');
  assert.strictEqual(typeof withActor, 'function');
});

test('setActor fija app.current_empleado con el uuid del actor', async () => {
  const calls = [];
  const fakeClient = { query: async (text, params) => { calls.push({ text, params }); } };

  await setActor(fakeClient, 'emp-123');

  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].text, /set_config\('app\.current_empleado', \$1, true\)/);
  assert.deepStrictEqual(calls[0].params, ['emp-123']);
});

test('setActor manda cadena vacía cuando el actor es nulo (write de sistema)', async () => {
  const calls = [];
  const fakeClient = { query: async (text, params) => { calls.push({ text, params }); } };

  await setActor(fakeClient, null);
  await setActor(fakeClient, undefined);

  assert.deepStrictEqual(calls[0].params, ['']);
  assert.deepStrictEqual(calls[1].params, ['']);
});
