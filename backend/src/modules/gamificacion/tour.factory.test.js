const test = require('node:test');
const assert = require('node:assert');
const TourFactory = require('./tour.factory');

test('crearPasos mapea features a pasos de driver.js con selector data-feature-id', () => {
  const features = [
    { codigo: 'R-01', nombre: 'Dashboard', descripcion: 'Panel de inicio', orden: 1 },
    { codigo: 'R-02', nombre: 'Buscar paciente', descripcion: null, orden: 2 },
  ];
  const pasos = TourFactory.crearPasos(features);

  assert.strictEqual(pasos.length, 2);
  assert.strictEqual(pasos[0].featureId, 'R-01');
  assert.strictEqual(pasos[0].element, '[data-feature-id="R-01"]');
  assert.strictEqual(pasos[0].popover.title, 'Dashboard');
  assert.strictEqual(pasos[0].popover.description, 'Panel de inicio');
  // descripción nula → string vacío (no rompe el popover)
  assert.strictEqual(pasos[1].popover.description, '');
  assert.strictEqual(pasos[1].orden, 2);
});

test('crearPasos con lista vacía devuelve arreglo vacío', () => {
  assert.deepStrictEqual(TourFactory.crearPasos([]), []);
});
