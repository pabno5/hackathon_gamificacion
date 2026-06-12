const { ValidationError } = require('../../../shared/errors/AppError');

/**
 * Estrategia presencial: paciente atendido en la sede física.
 * Diferencia clave vs telefónico: el campo sede es obligatorio y se cobra al momento.
 * (La cobranza no está implementada — fuera de alcance v1.)
 */
class PresencialStrategy {
  validar(datos) {
    if (!datos.id_sede) {
      throw new ValidationError('id_sede es requerido para citas presenciales');
    }
  }

  getCanalLabel() {
    return 'presencial';
  }
}

module.exports = PresencialStrategy;
