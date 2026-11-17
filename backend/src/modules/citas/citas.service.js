const {
  ValidationError, NotFoundError, ConflictError, ForbiddenError,
} = require('../../shared/errors/AppError');
const { parsePagination } = require('../../shared/utils/pagination');
const PresencialStrategy = require('./citas.strategies/PresencialStrategy');
const TelefonicoStrategy = require('./citas.strategies/TelefonicoStrategy');

// Estados en los que la cita no ocupa el turno del médico.
const ESTADOS_SIN_AGENDA = ['cancelada', 'no_asistio'];

/** 'HH:MM' o 'HH:MM:SS' → 'HH:MM', para comparar horas de la petición con las de la BD. */
const hhmm = (hora) => String(hora).slice(0, 5);

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

    // Cancelar por edición (cambiar el estado a "cancelada") sigue la misma regla
    // que /cancelar: motivo obligatorio (CIT-10) y evento `cita.cancelada`, que
    // es el que borra el evento de Google Calendar. Antes el PUT cancelaba sin
    // motivo y sin avisar a Calendar.
    if (datos.estado === 'cancelada' && existente.estado !== 'cancelada') {
      if (!datos.motivo_cancelacion || datos.motivo_cancelacion.trim().length < 3) {
        throw new ValidationError('Para cancelar una cita el motivo es obligatorio (mínimo 3 caracteres)');
      }
      return await this.cancelar(id, datos.motivo_cancelacion.trim(), idEmpleado);
    }
    // El motivo de cancelación solo se fija al cancelar.
    const { motivo_cancelacion: _descartado, ...cambios } = datos;

    // ¿La cita queda ocupando agenda después del cambio?
    const estadoFinal = cambios.estado ?? existente.estado;
    const quedaActiva = !ESTADOS_SIN_AGENDA.includes(estadoFinal);
    const seReactiva = quedaActiva && ESTADOS_SIN_AGENDA.includes(existente.estado);
    const cambiosHorario = ['id_medico', 'fecha_cita', 'hora_inicio', 'hora_fin']
      .some((k) => cambios[k] !== undefined);

    const id_medico   = cambios.id_medico   ?? existente.id_medico;
    const fecha_cita  = cambios.fecha_cita  ?? existente.fecha_cita;
    const hora_inicio = cambios.hora_inicio ?? existente.hora_inicio;
    const hora_fin    = cambios.hora_fin    ?? existente.hora_fin;

    if (cambiosHorario && hhmm(hora_fin) <= hhmm(hora_inicio)) {
      throw new ValidationError('hora_fin debe ser mayor que hora_inicio');
    }

    // Revalidar choque si cambia médico/fecha/horas, o si una cita cancelada o
    // "no asistió" vuelve a estar activa (su turno pudo ocuparse entretanto).
    // Una cita que queda cancelada/no asistió no ocupa agenda: no se valida.
    let choque = null;
    if (quedaActiva && (cambiosHorario || seReactiva)) {
      choque = { id_medico, fecha_cita, hora_inicio, hora_fin };
      if (await this.repo.hayChoqueMedico({ ...choque, excluirCitaId: id })) {
        throw new ConflictError('El médico ya tiene una cita en ese horario');
      }
    }

    // `choque` hace que el repositorio repita la verificación dentro de la misma
    // transacción del UPDATE, con candado por médico+fecha (evita la doble
    // reserva cuando dos ediciones llegan a la vez).
    const actualizada = await this.repo.update(id, cambios, idEmpleado, choque);
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
