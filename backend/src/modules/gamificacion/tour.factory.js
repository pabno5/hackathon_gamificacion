/**
 * Factory de pasos del tour por rol — data-driven desde gamificacion_features.
 *
 * El frontend espera pasos con el formato de driver.js:
 *   { element, popover: { title, description } }
 *
 * `element` apunta a `[data-feature-id="R-01"]` — el frontend marca
 * los elementos con ese atributo. Si el elemento no existe en pantalla,
 * driver.js lo muestra como paso modal centrado (comportamiento estándar).
 */
class TourFactory {
  static crearPasos(features) {
    return features.map((f) => ({
      featureId: f.codigo,
      element: `[data-feature-id="${f.codigo}"]`,
      popover: {
        title: f.nombre,
        description: f.descripcion || '',
      },
      orden: f.orden,
    }));
  }
}

module.exports = TourFactory;
