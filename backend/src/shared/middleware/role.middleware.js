const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');

/**
 * Restringe acceso a roles específicos.
 * Uso: router.use(requireRol('admin'))  o  requireRol('admin', 'medico')
 */
function requireRol(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.rol)) {
      return next(new ForbiddenError(`Acceso restringido a: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { requireRol };
