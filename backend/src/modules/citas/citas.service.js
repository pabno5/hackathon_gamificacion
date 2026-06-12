const {
  ValidationError, NotFoundError, ConflictError, ForbiddenError,
} = require('../../shared/errors/AppError');
const { parsePagination } = require('../../shared/utils/pagination');
const PresencialStrategy = require('./citas.strategies/PresencialStrategy');
const TelefonicoStrategy = require('./citas.strategies/TelefonicoStrategy');

class CitasService {
  constructor(citasRepository, eventBus = null) {
    this.repo = citasRepository;
    this.events = eventBus;
    this.strategies = {
      presencial: new PresencialStrategy(),
      telefonico: new TelefonicoStrategy(),
    };
  }

  #getStrategy(canal) {
    const s = this.strategies[canal];
    if (!s) throw new ValidationError(`Canal inválido: ${canal}`);
    return s;
  }

  async obtenerPorId(id) {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundError('Cita');
    return c;
  }

  async listar(query) {
    const { page, limit } = parsePagination(query);
    return await this.repo.findAll({ page, limit, filtros: query });
  }

  async crear(datos, idEmpleadoCreador) {
    const strategy = this.#getStrategy(datos.canal);
    strategy.validar(datos);

    if (await this.repo.hayChoqueMedico({
      id_medico: datos.id_medico,
      fecha_cita: datos.fecha_cita,
      hora_inicio: datos.hora_inicio,
      hora_fin: datos.hora_fin,
    })) {
      throw new ConflictError('El médico ya tiene una cita en ese horario');
    }

    const cita = await this.repo.create(datos, idEmpleadoCreador);

    // Evento para listeners (Google Calendar sync)
    this.events?.emit('cita.created', { cita, empleadoId: idEmpleadoCreador });
    return cita;
  }

  async actualizar(id, datos, idEmpleado) {
    const existente = await this.repo.findById(id);
    if (!existente) throw new NotFoundError('Cita');

    // Si se cambia médico/fecha/horas, revalidar choque
    const cambiosHorario = ['id_medico', 'fecha_cita', 'hora_inicio', 'hora_fin']
      .some((k) => datos[k] !== undefined);
    if (cambiosHorario) {
      const id_medico   = datos.id_medico   ?? existente.id_medico;
      const fecha_cita  = datos.fecha_cita  ?? existente.fecha_cita;
      const hora_inicio = datos.hora_inicio ?? existente.hora_inicio;
      const hora_fin    = datos.hora_fin    ?? existente.hora_fin;
      if (hora_fin <= hora_inicio) {
        throw new ValidationError('hora_fin debe ser mayor que hora_inicio');
      }
      if (await this.repo.hayChoqueMedico({
        id_medico, fecha_cita, hora_inicio, hora_fin, excluirCitaId: id,
      })) {
        throw new ConflictError('El médico ya tiene una cita en ese horario');
      }
    }

    const actualizada = await this.repo.update(id, datos, idEmpleado);
    if (!actualizada) throw new NotFoundError('Cita');

    this.events?.emit('cita.updated', { cita: actualizada, empleadoId: idEmpleado });
    return actualizada;
  }

  async cancelar(id, motivoCancelacion, idEmpleado) {
    if (!motivoCancelacion || motivoCancelacion.trim() === '') {
      throw new ValidationError('motivo_cancelacion es obligatorio');
    }
    const existente = await this.repo.findById(id);
    if (!existente) throw new NotFoundError('Cita');
    if (existente.estado === 'cancelada') {
      throw new ForbiddenError('La cita ya está cancelada');
    }
    const cancelada = await this.repo.update(
      id,
      { estado: 'cancelada', motivo_cancelacion: motivoCancelacion },
      idEmpleado
    );

    this.events?.emit('cita.cancelada', { cita: cancelada, empleadoId: idEmpleado });
    return cancelada;
  }

  async disponibilidad(query) {
    return await this.repo.medicosDisponibles({
      id_especialidad: query.id_especialidad,
      id_sede: query.id_sede,
    });
  }
}

module.exports = CitasService;
