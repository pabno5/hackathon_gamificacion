const test = require('node:test');
const assert = require('node:assert');
const errorHandler = require('./errorHandler.middleware');
const { ConflictError } = require('../errors/AppError');

function resFalso() {
  return {
    headersSent: false,
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

function manejar(err) {
  const res = resFalso();
  const original = console.error;
  console.error = () => {};
  try { errorHandler(err, {}, res, () => {}); } finally { console.error = original; }
  return res;
}

test('error operacional conserva su status y mensaje', () => {
  const res = manejar(new ConflictError('Choque de horario'));
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.body.error.message, 'Choque de horario');
});

test('UUID mal formado de PostgreSQL (22P02) → 400, no 500', () => {
  const err = Object.assign(new Error('invalid input syntax for type uuid: "abc"'), {
    code: '22P02', severity: 'ERROR',
  });
  const res = manejar(err);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('uuid: "abc"'), 'no filtra el mensaje crudo de la BD');
});

test('duplicado de PostgreSQL (23505) → 409', () => {
  const res = manejar(Object.assign(new Error('duplicate key'), { code: '23505', severity: 'ERROR' }));
  assert.strictEqual(res.statusCode, 409);
});

test('JSON mal formado → 400', () => {
  const res = manejar(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }));
  assert.strictEqual(res.statusCode, 400);
});

test('error inesperado → 500 sin stack cuando NODE_ENV no es development', () => {
  const previo = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  try {
    const res = manejar(new Error('secreto interno'));
    assert.strictEqual(res.statusCode, 500);
    assert.ok(!JSON.stringify(res.body).includes('secreto interno'));
    assert.strictEqual(res.body.error.stack, undefined);
  } finally {
    if (previo !== undefined) process.env.NODE_ENV = previo;
  }
});

test('un error con code de app (no de PostgreSQL) no se confunde con error de BD', () => {
  // Sin `severity` no es un error del driver pg.
  const res = manejar(Object.assign(new Error('x'), { code: '23505' }));
  assert.strictEqual(res.statusCode, 500);
});
