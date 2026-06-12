const { ValidationError } = require('../../../shared/errors/AppError');

/**
 * Estrategia callcenter: agendado por teléfono. Por política la sede sigue siendo
 * obligatoria (el paciente debe saber a dónde llegar), pero permite override futuro
 * para casos en que aún no se decida (PR siguiente puede aflojar este check).
 */
class TelefonicoStrategy {
  validar(datos) {
    if (!datos.id_sede) {
      throw new ValidationError('id_sede es requerido para citas telefónicas');
    }
  }

  getCanalLabel() {
    return 'telefonico';
  }
}

module.exports = TelefonicoStrategy;
