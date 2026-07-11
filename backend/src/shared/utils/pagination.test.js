const test = require('node:test');
const assert = require('node:assert');
const { parsePagination, DEFAULT_LIMIT, MAX_LIMIT } = require('./pagination');

test('defaults cuando no hay query', () => {
  const { page, limit, offset } = parsePagination();
  assert.strictEqual(page, 1);
  assert.strictEqual(limit, DEFAULT_LIMIT);
  assert.strictEqual(offset, 0);
});

test('calcula offset correcto', () => {
  const { offset } = parsePagination({ page: '3', limit: '10' });
  assert.strictEqual(offset, 20); // (3-1)*10
});

test('page menor a 1 se clampa a 1', () => {
  assert.strictEqual(parsePagination({ page: '0' }).page, 1);
  assert.strictEqual(parsePagination({ page: '-5' }).page, 1);
});

test('limit se clampa entre 1 y MAX_LIMIT', () => {
  assert.strictEqual(parsePagination({ limit: '999' }).limit, MAX_LIMIT);
  assert.strictEqual(parsePagination({ limit: '0' }).limit, DEFAULT_LIMIT); // 0 es falsy → default
  assert.strictEqual(parsePagination({ limit: '-3' }).limit, 1);
});

test('valores no numéricos caen a defaults', () => {
  const { page, limit } = parsePagination({ page: 'abc', limit: 'xyz' });
  assert.strictEqual(page, 1);
  assert.strictEqual(limit, DEFAULT_LIMIT);
});
