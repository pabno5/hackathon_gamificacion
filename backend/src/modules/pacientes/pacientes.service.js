// Validación de formato vive en pacientes.schema.js + validate middleware.
// El service solo aplica reglas de negocio (duplicados, existencia).
const {
  ValidationError,
  ConflictError,
  NotFoundError,
} = require('../../shared/errors/AppError');
const { parsePagination } = require('../../shared/utils/pagination');

class PacientesService {
  constructor(pacientesRepository) {
    this.repo = pacientesRepository;
  }

  async buscarPorDocumento(numeroDocumento) {
    if (!numeroDocumento) throw new ValidationError('numero_documento requerido');
    const p = await this.repo.findByDocumento(numeroDocumento);
    if (!p) throw new NotFoundError('Paciente');
    return p;
  }

  async obtenerPorId(id) {
    const p = await this.repo.findById(id);
    if (!p) throw new NotFoundError('Paciente');
    return p;
  }

  async listar(query) {
    const { page, limit } = parsePagination(query);
    return await this.repo.findAll({ page, limit, search: query.search });
  }

  async crear(datos, idEmpleadoCreador) {
    if (await this.repo.findByDocumento(datos.numero_documento)) {
      throw new ConflictError('El número de documento ya está registrado');
    }
    if (datos.correo && (await this.repo.correoExiste(datos.correo))) {
      throw new ConflictError('El correo ya está registrado');
    }
    return await this.repo.create(datos, idEmpleadoCreador);
  }

  async actualizar(id, datos) {
    const existente = await this.repo.findById(id);
    if (!existente) throw new NotFoundError('Paciente');

    if (datos.correo && datos.correo !== existente.correo) {
      const dup = await this.repo.correoExiste(datos.correo, id);
      if (dup) throw new ConflictError('El correo ya está registrado');
    }

    const actualizado = await this.repo.update(id, datos);
    if (!actualizado) throw new NotFoundError('Paciente');
    return actualizado;
  }

  async eliminar(id) {
    const ok = await this.repo.softDelete(id);
    if (!ok) throw new NotFoundError('Paciente');
  }
}

module.exports = PacientesService;
