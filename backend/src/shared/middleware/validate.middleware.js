const { ZodError } = require('zod');
const { ValidationError } = require('../errors/AppError');

/**
 * Middleware factory: valida `req[source]` contra un schema de Zod.
 * Si pasa, reemplaza `req[source]` con los datos parseados (limpios + coerced).
 *
 * Uso:
 *   router.post('/', validate(schema.crear), controller.crear);
 *   router.get('/', validate(schema.listar, 'query'), controller.listar);
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e) => ({
          campo: (e.path || []).join('.') || '(root)',
          mensaje: e.message,
        }));
        return next(new ValidationError('Datos de entrada inválidos', details));
      }
      next(err);
    }
  };
}

module.exports = validate;
